
"use client";

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, LayoutList, Server, Download, Info, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import potpack from 'potpack';
import type { InputPart, PotpackBox, PotpackStats, SheetLayout, PackedPart } from '@/types';
import { performServerSideNestingAction, exportCutListForDesktopAction, runDeepnestAlgorithmAction, performSpecialServerAction } from './actions';

const KERF_ALLOWANCE = 3; // e.g., 3mm for saw blade width
const DEFAULT_SHEET_WIDTH = 2440;
const DEFAULT_SHEET_HEIGHT = 1220;

export default function SpecialFeaturePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [actionResult, setActionResult] = React.useState<string | null>(null);
  const [partsListData, setPartsListData] = React.useState<string>('');
  const [selectedClientAlgorithm, setSelectedClientAlgorithm] = React.useState<string>('rectpack2d');
  const [packedLayoutData, setPackedLayoutData] = React.useState<SheetLayout[] | null>(null);
  const [visualizedLayout, setVisualizedLayout] = React.useState<React.ReactNode | null>(null);


  const handleClientSideNesting = async () => {
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    setVisualizedLayout(null);
    toast({ title: "Processing...", description: `Using ${selectedClientAlgorithm} algorithm.` });

    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async for UI update

    if (selectedClientAlgorithm === 'rectpack2d') {
      try {
        let inputParts: InputPart[] = [];
        try {
          inputParts = JSON.parse(partsListData);
        } catch (e) {
          throw new Error("Invalid JSON format for parts list.");
        }

        if (!Array.isArray(inputParts)) {
          throw new Error("Parts list must be a JSON array.");
        }

        const isValidParts = inputParts.every(part =>
          typeof part.name === 'string' &&
          typeof part.width === 'number' && part.width > 0 &&
          typeof part.height === 'number' && part.height > 0 &&
          typeof part.qty === 'number' && part.qty > 0
        );

        if (!isValidParts) {
          throw new Error("Each part in the list must have a 'name' (string), and positive numeric 'width', 'height', and 'qty'.");
        }

        const allPartsToPack: PotpackBox[] = [];
        inputParts.forEach(part => {
          for (let i = 0; i < part.qty; i++) {
            allPartsToPack.push({
              w: part.width + KERF_ALLOWANCE, // Add kerf for packing
              h: part.height + KERF_ALLOWANCE,
              name: `${part.name}_${i + 1}`,
              original: part // Keep a reference to original for rendering
            });
          }
        });

        const packedSheets: SheetLayout[] = [];
        let remainingPartsToPack = [...allPartsToPack];
        let sheetId = 1;
        const MAX_SHEETS = 50; // Safety break for demo

        while (remainingPartsToPack.length > 0 && sheetId <= MAX_SHEETS) {
          const stats: PotpackStats = potpack(remainingPartsToPack); // Potpack modifies the array in place!
          
          const currentSheetParts: PackedPart[] = [];
          const stillRemainingAfterSheet: PotpackBox[] = [];

          for (const part of remainingPartsToPack) {
            if (part.x !== undefined && part.y !== undefined &&
                part.x + part.w <= DEFAULT_SHEET_WIDTH &&
                part.y + part.h <= DEFAULT_SHEET_HEIGHT) {
              currentSheetParts.push({
                name: part.name!,
                width: part.w - KERF_ALLOWANCE, // Render actual part size
                height: part.h - KERF_ALLOWANCE,
                qty: 1, // Each object is an individual part now
                x: part.x,
                y: part.y,
                material: part.original?.material
              });
            } else {
              // Reset x, y for parts not packed on this sheet or that overflowed
              delete part.x;
              delete part.y;
              stillRemainingAfterSheet.push(part);
            }
          }
          
          if (currentSheetParts.length > 0) {
            packedSheets.push({
              id: sheetId,
              dimensions: { w: DEFAULT_SHEET_WIDTH, h: DEFAULT_SHEET_HEIGHT },
              parts: currentSheetParts,
              packedAreaWidth: stats.w, // potpack stats are for the bin it used
              packedAreaHeight: stats.h,
              efficiency: stats.fill * 100,
            });
            sheetId++;
          } else if (stillRemainingAfterSheet.length > 0) {
            // No parts were packed on this attempt, but some remain.
            // This might happen if remaining parts are too large for a new sheet.
            // Or if potpack couldn't fit anything.
            toast({ title: "Packing Incomplete", description: "Some remaining parts could not be packed onto a new sheet.", variant: "default" });
            break; 
          }
          remainingPartsToPack = stillRemainingAfterSheet;
        }
        
        if (remainingPartsToPack.length > 0 && sheetId > MAX_SHEETS) {
             toast({ title: "Max Sheets Reached", description: `Packing stopped after ${MAX_SHEETS} sheets. Some parts may remain.`, variant: "default" });
        }


        setPackedLayoutData(packedSheets);
        setActionResult(`Potpack processed ${allPartsToPack.length} total part instances onto ${packedSheets.length} sheets.`);
        
        // Generate SVG visualization
        const svgs = packedSheets.map((sheet, index) => (
          <div key={`sheet-${index}`} className="mb-4 p-2 border rounded-md">
            <h4 className="font-semibold mb-2">Sheet {sheet.id} (Efficiency: {sheet.efficiency?.toFixed(2) || 'N/A'}%)</h4>
            <svg width={DEFAULT_SHEET_WIDTH / 5} height={DEFAULT_SHEET_HEIGHT / 5} viewBox={`0 0 ${DEFAULT_SHEET_WIDTH} ${DEFAULT_SHEET_HEIGHT}`} className="border bg-gray-50">
              <rect x="0" y="0" width={DEFAULT_SHEET_WIDTH} height={DEFAULT_SHEET_HEIGHT} fill="#f0f0f0" stroke="#ccc" strokeWidth="2"/>
              {sheet.parts.map((part, pIndex) => (
                <g key={`part-${pIndex}`}>
                  <rect 
                    x={part.x} 
                    y={part.y} 
                    width={part.width}  // Use actual part width (kerf already accounted for in packing)
                    height={part.height} // Use actual part height
                    fill="rgba(173, 216, 230, 0.7)" // lightblue with transparency
                    stroke="blue" 
                    strokeWidth="1"
                  />
                  <text x={(part.x ?? 0) + 5} y={(part.y ?? 0) + 15} fontSize="12" fill="black">
                    {part.name.substring(0, part.name.lastIndexOf('_'))}
                  </text>
                   <text x={(part.x ?? 0) + 5} y={(part.y ?? 0) + 30} fontSize="10" fill="#555">
                    {part.width}x{part.height}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ));
        setVisualizedLayout(<div>{svgs}</div>);


        toast({ title: "Client Nesting (Potpack)", description: "Parts processed and layout visualized." });

      } catch (error: any) {
        setActionResult(`Error: ${error.message}`);
        toast({ title: "Client Nesting Error", description: error.message, variant: "destructive" });
      }
    } else if (selectedClientAlgorithm === 'deepnest') {
      try {
        const result = await runDeepnestAlgorithmAction(partsListData);
        setActionResult(`Deepnest Conceptual Backend Call: ${result.message}\nDetails: ${JSON.stringify(result.layout, null, 2)}`);
        setVisualizedLayout(result.layout?.svgPreview ? <div dangerouslySetInnerHTML={{ __html: result.layout.svgPreview }} /> : <p>No SVG preview from conceptual Deepnest.</p>);
        toast({ title: "Deepnest (Conceptual)", description: result.message });
      } catch (error: any) {
        setActionResult(`Error calling Deepnest conceptual action: ${error.message}`);
        toast({ title: "Deepnest Action Error", description: error.message, variant: "destructive" });
      }
    }
    setIsLoading(false);
  };

  const handleServerSideNesting = async () => {
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    setVisualizedLayout(null);
    toast({ title: "Processing...", description: "Calling server-side nesting." });
    try {
      const result = await performServerSideNestingAction(partsListData);
      setActionResult(`Server-Side Nesting Result: ${result.message}\nDetails: ${result.details}`);
      toast({ title: "Server Nesting Complete", description: result.message });
    } catch (error: any) {
      setActionResult(`Error: ${error.message}`);
      toast({ title: "Server Nesting Error", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleExportForDesktop = async () => {
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    setVisualizedLayout(null);
    toast({ title: "Processing...", description: "Preparing export." });
    try {
      const result = await exportCutListForDesktopAction(partsListData);
      setActionResult(`Export Result: ${result.message}`);
      if (result.success && result.data && result.fileName) {
        const link = document.createElement("a");
        link.href = result.data;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Ready", description: `File ${result.fileName} download initiated.` });
      } else if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error: any) {
      setActionResult(`Error: ${error.message}`);
      toast({ title: "Export Error", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleGenericSpecialFunction = async () => {
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    setVisualizedLayout(null);
    toast({ title: "Processing...", description: "Performing generic action." });
    try {
      // Example input, adjust as needed
      const exampleInput = { parameter1: "test", parameter2: 123 };
      const result = await performSpecialServerAction(exampleInput);
      setActionResult(`Generic Action Result: ${result.message}\nOutput: ${JSON.stringify(result.output, null, 2)}`);
      toast({ title: "Generic Action Complete", description: result.message });
    } catch (error: any) {
      setActionResult(`Error: ${error.message}`);
      toast({ title: "Generic Action Error", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };
  

  return (
    <>
      <PageHeader
        title="Cabinet Console - Special Features"
        description="Explore advanced functionalities including nesting optimizations and other utilities."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            Advanced Tools & Optimizations
          </CardTitle>
          <CardDescription>
            This section is dedicated to specialized tools, including various approaches to nesting part layouts for material optimization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <Tabs defaultValue="client-nesting" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="client-nesting"><LayoutList className="mr-2" />Client-Side Nesting</TabsTrigger>
              <TabsTrigger value="server-nesting"><Server className="mr-2" />Server-Side Nesting</TabsTrigger>
              <TabsTrigger value="export-desktop"><Download className="mr-2" />Export for Desktop</TabsTrigger>
              <TabsTrigger value="general-utils"><Sparkles className="mr-2" />Other Utilities</TabsTrigger>
            </TabsList>

            <TabsContent value="client-nesting" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Client-Side Nesting</CardTitle>
              <CardDescription className="mb-4">
                Visualize parts nested onto sheets. Good for quick previews. Uses `potpack` library.
              </CardDescription>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-nesting-algorithm">Nesting Algorithm</Label>
                  <Select value={selectedClientAlgorithm} onValueChange={setSelectedClientAlgorithm}>
                    <SelectTrigger id="client-nesting-algorithm" className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectpack2d">Rectpack2D (via Potpack)</SelectItem>
                      <SelectItem value="deepnest">Deepnest.io (Conceptual Backend Call)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder={`Paste parts list here as JSON array. Example: \n[{"name":"Part A","width":300,"height":200,"qty":2}, {"name":"Part B","width":150,"height":100,"qty":5}]`}
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={8}
                  className="text-xs"
                />
                <Button onClick={handleClientSideNesting} disabled={isLoading || !partsListData.trim()}>
                  {isLoading && selectedClientAlgorithm === 'rectpack2d' ? <Loader2 className="mr-2 animate-spin" /> : <LayoutList className="mr-2" />}
                  {isLoading && selectedClientAlgorithm === 'rectpack2d' ? 'Nesting...' : 'Visualize Nesting (Client)'}
                </Button>
                 {actionResult && selectedClientAlgorithm === 'rectpack2d' && (
                    <Alert variant="default" className="mt-4 text-xs">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Nesting Summary</AlertTitle>
                        <AlertDescription>{actionResult}</AlertDescription>
                    </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="server-nesting" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Server-Side Nesting</CardTitle>
              <CardDescription className="mb-4">
                Leverage more powerful server resources for complex nesting algorithms. (Conceptual)
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Conceptual Implementation</AlertTitle>
                <AlertDescription>
                  This tab demonstrates calling a server action that would perform advanced nesting.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <Textarea
                  placeholder="Paste parts list here (e.g., JSON or CSV format)."
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={6}
                />
                <Button onClick={handleServerSideNesting} disabled={isLoading || !partsListData.trim()}>
                  {isLoading ? <Loader2 className="mr-2 animate-spin"/> : <Server className="mr-2" /> }
                  {isLoading ? 'Calculating...' : 'Calculate Nesting (Server)'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="export-desktop" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Export for Desktop Software</CardTitle>
              <CardDescription className="mb-4">
                Generate a cut list or parts data file compatible with industry-standard CAM or nesting software. (Conceptual)
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Conceptual Implementation</AlertTitle>
                <AlertDescription>
                  A conceptual CSV export is demonstrated.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                 <Textarea
                  placeholder={`Parts list data for export. Example: \n[{"name":"Part A","width":300,"height":200,"qty":2}]`}
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={6}
                  className="text-xs"
                />
                <Button onClick={handleExportForDesktop} disabled={isLoading || !partsListData.trim()}>
                  {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                  {isLoading ? 'Exporting...' : 'Export Cut List (Conceptual CSV)'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="general-utils" className="mt-4 p-4 border rounded-md">
                <CardTitle className="text-lg mb-2">Other Utilities</CardTitle>
                <CardDescription className="mb-4">
                    This section can host other special functions or tools. (Conceptual)
                </CardDescription>
                <Button onClick={handleGenericSpecialFunction} size="lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isLoading ? "Processing..." : "Perform Generic Special Action"}
                </Button>
            </TabsContent>
          </Tabs>

          {actionResult && selectedClientAlgorithm !== 'rectpack2d' && ( // Only show general actionResult if not rectpack2d (which has its own summary spot)
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Action Result:</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">{actionResult}</pre>
            </div>
          )}

          {visualizedLayout && (
             <div className="mt-6 p-4 border rounded-md bg-background w-full">
              <p className="text-sm font-semibold mb-2">Visualized Layout:</p>
              <div className="max-h-[500px] overflow-auto">
                {visualizedLayout}
              </div>
            </div>
          )}
          
          {packedLayoutData && selectedClientAlgorithm === 'rectpack2d' && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Packed Layout Data (Potpack):</p>
              <div className="max-h-96 overflow-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto bg-background/50 p-2 rounded-sm mt-1">
                  {JSON.stringify(packedLayoutData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
