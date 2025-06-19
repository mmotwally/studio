
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
import type { InputPart, PackedPart, SheetLayout, PotpackBox, PotpackStats } from '@/types'; // Ensure Potpack types are imported
import { performServerSideNestingAction, exportCutListForDesktopAction, runDeepnestAlgorithmAction, performSpecialServerAction } from './actions';

const KERF_ALLOWANCE = 3; 
const DEFAULT_SHEET_WIDTH = 2440;
const DEFAULT_SHEET_HEIGHT = 1220;

// Simple color palette for parts - can be expanded
const PART_COLORS = [
  "rgba(173, 216, 230, 0.7)", // lightblue
  "rgba(144, 238, 144, 0.7)", // lightgreen
  "rgba(255, 182, 193, 0.7)", // lightpink
  "rgba(255, 255, 224, 0.7)", // lightyellow
  "rgba(211, 211, 211, 0.7)", // lightgrey
  "rgba(240, 128, 128, 0.7)", // lightcoral
  "rgba(175, 238, 238, 0.7)", // paleturquoise
  "rgba(255, 218, 185, 0.7)", // peachpuff
];

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

    await new Promise(resolve => setTimeout(resolve, 100)); 

    if (selectedClientAlgorithm === 'rectpack2d') {
      try {
        let inputPartsRaw: any[] = [];
        try {
          inputPartsRaw = JSON.parse(partsListData);
        } catch (e) {
          throw new Error("Invalid JSON format for parts list. Please provide an array of parts.");
        }

        if (!Array.isArray(inputPartsRaw)) {
          throw new Error("Parts list must be a JSON array.");
        }

        const inputParts: InputPart[] = [];
        for (const rawPart of inputPartsRaw) {
          if (
            typeof rawPart.name !== 'string' ||
            typeof rawPart.width !== 'number' || !(rawPart.width > 0) ||
            typeof rawPart.height !== 'number' || !(rawPart.height > 0) ||
            typeof rawPart.qty !== 'number' || !(rawPart.qty > 0)
          ) {
            throw new Error("Each part must have a 'name' (string), and positive numeric 'width', 'height', and 'qty'.");
          }
          inputParts.push(rawPart as InputPart);
        }

        if (inputParts.length === 0) {
          throw new Error("No parts provided in the list.");
        }
        
        // Assign colors to unique part names
        const partColorMap = new Map<string, string>();
        let colorIndex = 0;
        inputParts.forEach(part => {
          if (!partColorMap.has(part.name)) {
            partColorMap.set(part.name, PART_COLORS[colorIndex % PART_COLORS.length]);
            colorIndex++;
          }
        });

        const allPartsToPack: PotpackBox[] = [];
        inputParts.forEach(part => {
          for (let i = 0; i < part.qty; i++) {
            allPartsToPack.push({
              w: part.width + KERF_ALLOWANCE, 
              h: part.height + KERF_ALLOWANCE,
              name: `${part.name}_${i + 1}`, // Unique name for each instance
              originalName: part.name, // Keep original name for color mapping
              originalWidth: part.width,
              originalHeight: part.height,
            });
          }
        });

        const packedSheets: SheetLayout[] = [];
        let remainingPartsToPack = [...allPartsToPack];
        let sheetId = 1;
        const MAX_SHEETS = 50;

        while (remainingPartsToPack.length > 0 && sheetId <= MAX_SHEETS) {
          const partsForCurrentSheetAttempt = [...remainingPartsToPack]; // potpack modifies the array
          const stats: PotpackStats = potpack(partsForCurrentSheetAttempt);
          
          const currentSheetParts: PackedPart[] = [];
          const stillRemainingAfterSheet: PotpackBox[] = [];

          for (const part of partsForCurrentSheetAttempt) { // Iterate over the array potpack modified
            if (part.x !== undefined && part.y !== undefined &&
                (part.x + part.w) <= DEFAULT_SHEET_WIDTH &&
                (part.y + part.h) <= DEFAULT_SHEET_HEIGHT) {
              currentSheetParts.push({
                name: part.name!,
                width: part.originalWidth!, 
                height: part.originalHeight!,
                qty: 1, 
                x: part.x,
                y: part.y,
                material: part.originalName, // Using originalName for color lookup
              });
            } else {
              delete part.x; // Reset for next attempt if not packed or overflowed
              delete part.y;
              stillRemainingAfterSheet.push(part);
            }
          }
          
          if (currentSheetParts.length > 0) {
             // Calculate actual used area on *this* sheet by finding max x+w and y+h of parts *on this sheet*
            let actualUsedWidth = 0;
            let actualUsedHeight = 0;
            let totalPartAreaOnSheet = 0;

            currentSheetParts.forEach(p => {
                if (p.x !== undefined && p.y !== undefined) {
                    actualUsedWidth = Math.max(actualUsedWidth, p.x + p.width + KERF_ALLOWANCE);
                    actualUsedHeight = Math.max(actualUsedHeight, p.y + p.height + KERF_ALLOWANCE);
                    totalPartAreaOnSheet += (p.width + KERF_ALLOWANCE) * (p.height + KERF_ALLOWANCE);
                }
            });
            
            // Potpack's stats.w and stats.h are for the *bin it thought it needed*.
            // If it packed into a bin smaller than DEFAULT_SHEET_WIDTH/HEIGHT,
            // efficiency should be against the part of the sheet *it actually used*.
            // Or, if we always use full sheets, efficiency is against DEFAULT_SHEET_WIDTH/HEIGHT.
            // For simplicity in display, let's use efficiency against the full sheet.
            const sheetArea = DEFAULT_SHEET_WIDTH * DEFAULT_SHEET_HEIGHT;
            const currentSheetEfficiency = (totalPartAreaOnSheet / sheetArea) * 100;

            packedSheets.push({
              id: sheetId,
              dimensions: { w: DEFAULT_SHEET_WIDTH, h: DEFAULT_SHEET_HEIGHT },
              parts: currentSheetParts,
              packedAreaWidth: actualUsedWidth, // Potpack's stats.w might be for a smaller theoretical bin
              packedAreaHeight: actualUsedHeight, // Potpack's stats.h
              efficiency: currentSheetEfficiency,
            });
            sheetId++;
          } else if (stillRemainingAfterSheet.length > 0) {
            toast({ title: "Packing Incomplete", description: "Some remaining parts could not be packed onto a new sheet. This might be due to size constraints.", variant: "default" });
            break; 
          }
          remainingPartsToPack = stillRemainingAfterSheet;
        }
        
        if (remainingPartsToPack.length > 0 && sheetId > MAX_SHEETS) {
             toast({ title: "Max Sheets Reached", description: `Packing stopped after ${MAX_SHEETS} sheets. Some parts may remain.`, variant: "default" });
        }

        setPackedLayoutData(packedSheets);
        setActionResult(`Potpack processed ${allPartsToPack.length} total part instances onto ${packedSheets.length} sheets.`);
        
        const svgs = packedSheets.map((sheet, index) => (
          <div key={`sheet-${index}`} className="mb-6 p-3 border rounded-lg shadow-sm bg-white">
            <h4 className="font-bold text-base mb-2 text-gray-700">
              Sheet {sheet.id} <span className="font-normal text-sm">(Dimensions: {sheet.dimensions.w} x {sheet.dimensions.h} mm)</span>
              <span className={`ml-2 text-sm font-semibold ${sheet.efficiency && sheet.efficiency < 70 ? 'text-orange-600' : 'text-green-600'}`}>
                Efficiency: {sheet.efficiency?.toFixed(1) || 'N/A'}%
              </span>
            </h4>
            <svg 
                width="100%" 
                viewBox={`-5 -5 ${sheet.dimensions.w + 10} ${sheet.dimensions.h + 10}`} 
                className="border border-gray-300 rounded"
                preserveAspectRatio="xMidYMid meet"
            >
              {/* Sheet Outline */}
              <rect x="0" y="0" width={sheet.dimensions.w} height={sheet.dimensions.h} fill="#f7fafc" stroke="#e2e8f0" strokeWidth="2"/>
              
              {sheet.parts.map((part, pIndex) => {
                const partColor = partColorMap.get(part.material || part.name) || 'rgba(128, 128, 128, 0.7)'; // Fallback grey
                const partName = part.name.substring(0, part.name.lastIndexOf('_')) || part.name; // Remove instance suffix
                
                // Basic text scaling attempt (very simple)
                const textLength = Math.max(partName.length, `${part.width}x${part.height}`.length);
                let fontSize = 12;
                if (part.width < textLength * 6 || part.height < 30) fontSize = 8;
                if (part.width < textLength * 4 || part.height < 20) fontSize = 6;


                return (
                  <g key={`part-${pIndex}`} transform={`translate(${part.x ?? 0}, ${part.y ?? 0})`}>
                    <rect 
                      x={KERF_ALLOWANCE / 2} // Center part within its kerf-allocated space visually
                      y={KERF_ALLOWANCE / 2}
                      width={part.width}  
                      height={part.height} 
                      fill={partColor}
                      stroke="rgba(0,0,0,0.5)" 
                      strokeWidth="1"
                    />
                    {/* ClipPath to keep text within part boundaries */}
                    <clipPath id={`clip-${sheet.id}-${pIndex}`}>
                         <rect x={KERF_ALLOWANCE/2 + 2} y={KERF_ALLOWANCE/2 + 2} width={part.width - 4} height={part.height - 4} />
                    </clipPath>
                    <text 
                        x={(KERF_ALLOWANCE / 2) + (part.width / 2)} 
                        y={(KERF_ALLOWANCE / 2) + (part.height / 2) - (fontSize * 0.2)} // Adjust for two lines
                        fontSize={fontSize} 
                        fill="black"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        clipPath={`url(#clip-${sheet.id}-${pIndex})`}
                        style={{ pointerEvents: 'none' }}
                    >
                       <tspan x={(KERF_ALLOWANCE / 2) + (part.width / 2)} dy="-0.2em">{partName}</tspan>
                       <tspan x={(KERF_ALLOWANCE / 2) + (part.width / 2)} dy="1.2em">{`${part.width}x${part.height}`}</tspan>
                    </text>
                  </g>
                );
              })}
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
                Visualize parts nested onto sheets. Good for quick previews. Select an algorithm below.
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
                  className="text-xs font-mono"
                />
                <Button onClick={handleClientSideNesting} disabled={isLoading || !partsListData.trim()}>
                  {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <LayoutList className="mr-2" />}
                  {isLoading ? 'Nesting...' : 'Visualize Nesting (Client)'}
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
                  placeholder="Paste parts list here (e.g., JSON or CSV format for server processing)."
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={6}
                  className="text-xs font-mono"
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
                  className="text-xs font-mono"
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

          {actionResult && selectedClientAlgorithm !== 'rectpack2d' && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Action Result:</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">{actionResult}</pre>
            </div>
          )}

          {visualizedLayout && (
             <div className="mt-6 p-4 border rounded-lg bg-gray-50 w-full shadow">
              <p className="text-lg font-semibold mb-3 text-gray-800">Visualized Layout:</p>
              <div className="max-h-[70vh] overflow-auto p-2 bg-gray-100 rounded">
                {visualizedLayout}
              </div>
            </div>
          )}
          
          {packedLayoutData && selectedClientAlgorithm === 'rectpack2d' && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Packed Layout Data (Potpack):</p>
              <div className="max-h-96 overflow-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto bg-background/50 p-2 rounded-sm mt-1 font-mono">
                  {JSON.stringify(packedLayoutData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

    