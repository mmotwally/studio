
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
import type { InputPart, PackedPart, SheetLayout, PotpackBox, PotpackStats } from '@/types';
import { performServerSideNestingAction, exportCutListForDesktopAction, runDeepnestAlgorithmAction, performSpecialServerAction } from './actions';

const KERF_ALLOWANCE = 3; 
const DEFAULT_SHEET_WIDTH = 2440;
const DEFAULT_SHEET_HEIGHT = 1220;

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
const MAX_SHEETS_PER_JOB = 50; // Safety limit

export default function SpecialFeaturePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [actionResult, setActionResult] = React.useState<string | null>(null);
  const [partsListData, setPartsListData] = React.useState<string>('');
  const [selectedClientAlgorithm, setSelectedClientAlgorithm] = React.useState<string>('rectpack2d');
  const [packedLayoutData, setPackedLayoutData] = React.useState<SheetLayout[] | null>(null);
  const [visualizedLayout, setVisualizedLayout] = React.useState<React.ReactNode | null>(null);
  const [partColorMap, setPartColorMap] = React.useState<Map<string, string>>(new Map());

  const generatePartColorMap = (parts: InputPart[]): Map<string, string> => {
    const map = new Map<string, string>();
    let colorIndex = 0;
    parts.forEach(part => {
      if (!map.has(part.name)) {
        map.set(part.name, PART_COLORS[colorIndex % PART_COLORS.length]);
        colorIndex++;
      }
    });
    return map;
  };
  
  const renderSVGs = (layoutData: SheetLayout[], pcm: Map<string, string>) => {
    if (!layoutData) return null;
    return layoutData.map((sheet, index) => (
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
          <rect x="0" y="0" width={sheet.dimensions.w} height={sheet.dimensions.h} fill="#f7fafc" stroke="#e2e8f0" strokeWidth="2"/>
          {sheet.parts.map((part, pIndex) => {
            const colorKey = part.originalName || part.name.substring(0, part.name.lastIndexOf('_')) || part.name;
            const partColor = pcm.get(colorKey) || 'rgba(128, 128, 128, 0.7)';
            
            const displayName = part.originalName || part.name;
            const displayWidth = part.originalWidth || part.width;
            const displayHeight = part.originalHeight || part.height;

            // Basic font size adjustment
            const textLength = Math.max(displayName.length, `${displayWidth}x${displayHeight}`.length);
            let fontSize = 10;
            if (displayWidth < textLength * 5 || displayHeight < 25) fontSize = 8;
            if (displayWidth < textLength * 3 || displayHeight < 18) fontSize = 6;
            if (fontSize < 6) fontSize = 6; // Minimum font size

            return (
              <g key={`part-${sheet.id}-${pIndex}`} transform={`translate(${part.x ?? 0}, ${part.y ?? 0})`}>
                <rect 
                  x={KERF_ALLOWANCE / 2} 
                  y={KERF_ALLOWANCE / 2}
                  width={displayWidth}  
                  height={displayHeight} 
                  fill={partColor}
                  stroke="rgba(0,0,0,0.5)" 
                  strokeWidth="1"
                />
                <clipPath id={`clip-${sheet.id}-${pIndex}`}>
                     <rect x={KERF_ALLOWANCE/2 + 2} y={KERF_ALLOWANCE/2 + 2} width={Math.max(0, displayWidth - 4)} height={Math.max(0, displayHeight - 4)} />
                </clipPath>
                <text 
                    x={(KERF_ALLOWANCE / 2) + (displayWidth / 2)} 
                    y={(KERF_ALLOWANCE / 2) + (displayHeight / 2) - (fontSize * 0.1)} // Adjusted for two lines
                    fontSize={fontSize} 
                    fill="black"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    clipPath={`url(#clip-${sheet.id}-${pIndex})`}
                    style={{ pointerEvents: 'none' }}
                >
                   <tspan x={(KERF_ALLOWANCE / 2) + (displayWidth / 2)} dy={displayHeight > fontSize * 2.5 ? "-0.4em" : "0em"}>{displayName}</tspan>
                   {displayHeight > fontSize * 2.5 && (<tspan x={(KERF_ALLOWANCE / 2) + (displayWidth / 2)} dy="1.2em">{`${displayWidth}x${displayHeight}`}</tspan>)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    ));
  };


  const handleClientSideNesting = async () => {
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    setVisualizedLayout(null);
    
    let validatedInputParts: InputPart[] = [];
    try {
      let inputPartsRaw: any[];
      try {
        inputPartsRaw = JSON.parse(partsListData);
      } catch (e) {
        throw new Error("Invalid JSON format for parts list. Please provide an array of parts.");
      }

      if (!Array.isArray(inputPartsRaw)) {
        throw new Error("Parts list must be a JSON array.");
      }

      for (const rawPart of inputPartsRaw) {
        if (
          typeof rawPart.name !== 'string' ||
          typeof rawPart.width !== 'number' || !(rawPart.width > 0) ||
          typeof rawPart.height !== 'number' || !(rawPart.height > 0) ||
          typeof rawPart.qty !== 'number' || !(rawPart.qty > 0)
        ) {
          throw new Error("Each part must have a 'name' (string), and positive numeric 'width', 'height', and 'qty'. Invalid part: " + JSON.stringify(rawPart));
        }
        validatedInputParts.push(rawPart as InputPart);
      }

      if (validatedInputParts.length === 0) {
        throw new Error("No parts provided in the list.");
      }
      
      const pcm = generatePartColorMap(validatedInputParts);
      setPartColorMap(pcm);

      if (selectedClientAlgorithm === 'rectpack2d') {
        toast({ title: "Processing...", description: "Using Rectpack2D (Potpack Client-Side)." });
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async

        const allPartsToPack: PotpackBox[] = [];
        validatedInputParts.forEach(part => {
          for (let i = 0; i < part.qty; i++) {
            allPartsToPack.push({
              w: part.width + KERF_ALLOWANCE, 
              h: part.height + KERF_ALLOWANCE,
              name: `${part.name}_${i + 1}`,
              originalName: part.name,
              originalWidth: part.width,
              originalHeight: part.height,
            });
          }
        });

        const packedSheets: SheetLayout[] = [];
        let remainingPartsToPack = [...allPartsToPack];
        let sheetId = 1;

        while (remainingPartsToPack.length > 0 && sheetId <= MAX_SHEETS_PER_JOB) {
          const partsForCurrentSheetAttempt = [...remainingPartsToPack];
          const stats: PotpackStats = potpack(partsForCurrentSheetAttempt);
          
          const currentSheetParts: PackedPart[] = [];
          const stillRemainingAfterSheet: PotpackBox[] = [];

          for (const packedBox of partsForCurrentSheetAttempt) {
            if (packedBox.x !== undefined && packedBox.y !== undefined &&
                (packedBox.x + packedBox.w) <= DEFAULT_SHEET_WIDTH &&
                (packedBox.y + packedBox.h) <= DEFAULT_SHEET_HEIGHT) {
              currentSheetParts.push({
                name: packedBox.name!,
                width: packedBox.originalWidth!, 
                height: packedBox.originalHeight!,
                qty: 1, 
                x: packedBox.x,
                y: packedBox.y,
                material: packedBox.originalName,
                originalName: packedBox.originalName,
                originalWidth: packedBox.originalWidth,
                originalHeight: packedBox.originalHeight,
              });
            } else {
              delete packedBox.x; delete packedBox.y; // Clear potpack properties
              stillRemainingAfterSheet.push(packedBox);
            }
          }
          
          if (currentSheetParts.length > 0) {
            let actualUsedWidth = 0;
            let actualUsedHeight = 0;
            let totalPartAreaOnSheet = 0;
            currentSheetParts.forEach(p => {
                if (p.x !== undefined && p.y !== undefined && p.originalWidth && p.originalHeight) {
                    actualUsedWidth = Math.max(actualUsedWidth, p.x + p.originalWidth + KERF_ALLOWANCE);
                    actualUsedHeight = Math.max(actualUsedHeight, p.y + p.originalHeight + KERF_ALLOWANCE);
                    totalPartAreaOnSheet += (p.originalWidth + KERF_ALLOWANCE) * (p.originalHeight + KERF_ALLOWANCE);
                }
            });
            const sheetArea = DEFAULT_SHEET_WIDTH * DEFAULT_SHEET_HEIGHT;
            const currentSheetEfficiency = (totalPartAreaOnSheet / sheetArea) * 100;
            packedSheets.push({
              id: sheetId,
              dimensions: { w: DEFAULT_SHEET_WIDTH, h: DEFAULT_SHEET_HEIGHT },
              parts: currentSheetParts,
              packedAreaWidth: actualUsedWidth,
              packedAreaHeight: actualUsedHeight,
              efficiency: currentSheetEfficiency,
            });
            sheetId++;
          } else if (stillRemainingAfterSheet.length > 0) {
            toast({ title: "Packing Incomplete (Potpack)", description: "Some remaining parts could not be packed onto a new sheet.", variant: "default" });
            break; 
          }
          remainingPartsToPack = stillRemainingAfterSheet;
        }
        
        if (remainingPartsToPack.length > 0 && sheetId > MAX_SHEETS_PER_JOB) {
             toast({ title: "Max Sheets Reached (Potpack)", description: `Packing stopped after ${MAX_SHEETS_PER_JOB} sheets. Some parts may remain.`, variant: "default" });
        }
        setPackedLayoutData(packedSheets);
        setActionResult(`Potpack (Client) processed ${allPartsToPack.length} total part instances onto ${packedSheets.length} sheets.`);
        toast({ title: "Client Nesting (Potpack)", description: "Parts processed successfully." });

      } else if (selectedClientAlgorithm === 'deepnest') {
        toast({ title: "Processing...", description: "Using Simulated FFDH (Server-Side)." });
        const result = await runDeepnestAlgorithmAction(partsListData);
        if (result.success && result.layout) {
          setPackedLayoutData(result.layout);
          setActionResult(result.message);
          toast({ title: "Deepnest (Simulated FFDH via Server)", description: result.message });
        } else {
          setPackedLayoutData(result.layout || null); // Show partial layout if any
          throw new Error(result.message || "Deepnest conceptual backend call failed.");
        }
      }

    } catch (error: any) {
      setActionResult(`Error: ${error.message}`);
      toast({ title: "Client Nesting Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (packedLayoutData) {
      setVisualizedLayout(renderSVGs(packedLayoutData, partColorMap));
    } else {
      setVisualizedLayout(null);
    }
  }, [packedLayoutData, partColorMap]);


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
    } finally {
      setIsLoading(false);
    }
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
    } finally {
      setIsLoading(false);
    }
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
    } finally {
      setIsLoading(false);
    }
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
              <TabsTrigger value="client-nesting"><LayoutList className="mr-2" />Client/Server Hybrid Nesting</TabsTrigger>
              <TabsTrigger value="server-nesting"><Server className="mr-2" />Server-Side Nesting (Legacy)</TabsTrigger>
              <TabsTrigger value="export-desktop"><Download className="mr-2" />Export for Desktop</TabsTrigger>
              <TabsTrigger value="general-utils"><Sparkles className="mr-2" />Other Utilities</TabsTrigger>
            </TabsList>

            <TabsContent value="client-nesting" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Client/Server Hybrid Nesting</CardTitle>
              <CardDescription className="mb-4">
                Visualize parts nested onto sheets. Select an algorithm to see its conceptual results.
              </CardDescription>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-nesting-algorithm">Nesting Algorithm</Label>
                  <Select value={selectedClientAlgorithm} onValueChange={setSelectedClientAlgorithm}>
                    <SelectTrigger id="client-nesting-algorithm" className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectpack2d">Rectpack2D (Potpack - Client Side)</SelectItem>
                      <SelectItem value="deepnest">FFDH Simulation (Server Side)</SelectItem>
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
                  {isLoading ? 'Nesting...' : 'Visualize Nesting'}
                </Button>
                 {actionResult && (
                    <Alert variant="default" className="mt-4 text-xs">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Nesting Summary</AlertTitle>
                        <AlertDescription>{actionResult}</AlertDescription>
                    </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="server-nesting" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Server-Side Nesting (Legacy/Placeholder)</CardTitle>
              <CardDescription className="mb-4">
                Conceptual placeholder for a different server-side nesting algorithm.
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Conceptual Implementation</AlertTitle>
                <AlertDescription>
                  This tab demonstrates calling a generic server action. The "Client/Server Hybrid Nesting" tab now handles the "Deepnest" conceptual call.
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
                  {isLoading ? 'Calculating...' : 'Calculate Nesting (Server - Legacy)'}
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

          {actionResult && !(selectedClientAlgorithm === 'rectpack2d' && packedLayoutData) && !(selectedClientAlgorithm === 'deepnest' && packedLayoutData) && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Action Result:</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">{actionResult}</pre>
            </div>
          )}

          {visualizedLayout && (
             <div className="mt-6 p-4 border rounded-lg bg-gray-50 w-full shadow">
              <p className="text-lg font-semibold mb-3 text-gray-800">Visualized Layout ({selectedClientAlgorithm === 'rectpack2d' ? 'Potpack - Client' : 'FFDH Sim - Server'}):</p>
              <div className="max-h-[70vh] overflow-auto p-2 bg-gray-100 rounded">
                {visualizedLayout}
              </div>
            </div>
          )}
          
          {packedLayoutData && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Packed Layout Data ({selectedClientAlgorithm === 'rectpack2d' ? 'Potpack Client' : 'FFDH Sim - Server'}):</p>
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
}
    
