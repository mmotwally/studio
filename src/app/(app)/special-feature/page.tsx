
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
import { performSpecialServerAction, performServerSideNestingAction, exportCutListForDesktopAction, runDeepnestAlgorithmAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import potpack from 'potpack'; // Using potpack as a client-side packer

interface InputPart {
  name: string;
  width: number;
  height: number;
  qty: number;
  // material?: string; // Not used by potpack directly, but good for context
}

interface PackedPart extends InputPart {
  x?: number;
  y?: number;
  // Potpack might add 'bin' if multiple bins were supported directly, but we handle multi-sheet manually
}

interface SheetLayout {
  id: number;
  dimensions: { w: number; h: number };
  parts: PackedPart[];
  packedAreaWidth?: number;
  packedAreaHeight?: number;
  efficiency?: number;
}


const KERF_ALLOWANCE = 3; // mm, adjust as needed
const DEFAULT_SHEET_WIDTH = 2440; // mm
const DEFAULT_SHEET_HEIGHT = 1220; // mm


export default function SpecialFeaturePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionResult, setActionResult] = React.useState<string | null>(null);
  const [partsListData, setPartsListData] = React.useState<string>('');
  const [selectedClientAlgorithm, setSelectedClientAlgorithm] = React.useState<string>('rectpack2d');
  const [packedLayoutData, setPackedLayoutData] = React.useState<SheetLayout[] | null>(null);

  const handleGenericSpecialFunction = async () => {
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    try {
      const inputData = { parameter1: "generic test data", parameter2: 789 };
      const result = await performSpecialServerAction(inputData);
      if (result.success) {
        toast({ title: "Success!", description: result.message });
        setActionResult(`Server (Generic Action) responded: ${result.message} - Output: ${JSON.stringify(result.output?.resultData)}`);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
        setActionResult(`Server (Generic Action) error: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to perform generic special action:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Client Error", description: `Failed to execute generic special function: ${errorMessage}`, variant: "destructive" });
      setActionResult(`Client error (Generic Action): ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSideNesting = async () => {
    if (!partsListData.trim()) {
      toast({ title: "Input Required", description: "Please provide a parts list.", variant: "default" });
      return;
    }
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);

    if (selectedClientAlgorithm === 'rectpack2d') {
      try {
        const inputParts: InputPart[] = JSON.parse(partsListData);
        if (!Array.isArray(inputParts) || !inputParts.every(p => typeof p.width === 'number' && typeof p.height === 'number' && typeof p.qty === 'number')) {
          throw new Error("Invalid parts list format. Expected JSON array of objects with name, width, height, qty.");
        }

        let allIndividualParts: { w: number, h: number, name: string, original: InputPart }[] = [];
        inputParts.forEach(part => {
          for (let i = 0; i < part.qty; i++) {
            allIndividualParts.push({ 
              w: part.width + KERF_ALLOWANCE, 
              h: part.height + KERF_ALLOWANCE,
              name: `${part.name} #${i + 1}`,
              original: part
            });
          }
        });
        
        const packedSheets: SheetLayout[] = [];
        let sheetIndex = 0;

        while(allIndividualParts.length > 0) {
            sheetIndex++;
            const currentSheetPartsToPack = [...allIndividualParts]; // potpack modifies the array
            const stats = potpack(currentSheetPartsToPack); // stats: {w, h, fill}

            const packedPartsForThisSheet: PackedPart[] = [];
            const remainingPartsForNextAttempt: typeof allIndividualParts = [];

            let actualPackedWidth = 0;
            let actualPackedHeight = 0;

            currentSheetPartsToPack.forEach(p => {
                if (p.x !== undefined && p.y !== undefined) { // Part was packed by potpack
                    // Check if this part fits on *this current physical sheet*
                    if ((p.x + p.w) <= DEFAULT_SHEET_WIDTH && (p.y + p.h) <= DEFAULT_SHEET_HEIGHT) {
                        packedPartsForThisSheet.push({
                            name: p.name,
                            width: p.original.width, // Store original dimensions
                            height: p.original.height,
                            qty: 1, // Represents a single instance
                            x: p.x,
                            y: p.y,
                        });
                        actualPackedWidth = Math.max(actualPackedWidth, p.x + p.w);
                        actualPackedHeight = Math.max(actualPackedHeight, p.y + p.h);
                    } else {
                        // Part was "packed" by potpack but overflows current sheet dimensions
                        remainingPartsForNextAttempt.push(p); 
                    }
                } else {
                    // Part was not packed by potpack in this attempt
                    remainingPartsForNextAttempt.push(p);
                }
            });
            
            if (packedPartsForThisSheet.length > 0) {
                 packedSheets.push({
                    id: sheetIndex,
                    dimensions: { w: DEFAULT_SHEET_WIDTH, h: DEFAULT_SHEET_HEIGHT },
                    parts: packedPartsForThisSheet,
                    packedAreaWidth: actualPackedWidth,
                    packedAreaHeight: actualPackedHeight,
                    efficiency: (packedPartsForThisSheet.reduce((sum, p) => sum + (p.width * p.height), 0) / (DEFAULT_SHEET_WIDTH * DEFAULT_SHEET_HEIGHT)) * 100,
                });
            }
            
            allIndividualParts = remainingPartsForNextAttempt.map(p => ({ // Prepare for next iteration
                w: p.w, h: p.h, name: p.name, original: p.original
            }));

            if (packedPartsForThisSheet.length === 0 && allIndividualParts.length > 0) {
                 // This means no parts could be packed onto a new sheet, could be due to parts being too large
                toast({ title: "Nesting Warning", description: "Some parts might be too large to fit on a new sheet or no further packing possible.", variant: "default"});
                // Add remaining unbale to pack parts to a "failed to pack list"
                // For simplicity, we'll break here. A more robust solution would list them.
                break; 
            }
             if (packedSheets.length > 20 && allIndividualParts.length > 0) { // Safety break
                toast({ title: "Nesting Limit", description: "Reached maximum sheet limit for this conceptual demo.", variant: "default"});
                break;
            }
        }

        setPackedLayoutData(packedSheets);
        const resultMsg = `Client-Side Nesting (Rectpack2D/potpack) complete. ${packedSheets.length} sheet(s) used. See details below.`;
        setActionResult(resultMsg);
        toast({ title: "Nesting Complete", description: resultMsg });

      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Failed to parse parts list or run nesting.";
        toast({ title: "Nesting Error", description: errorMsg, variant: "destructive" });
        setActionResult(`Client-Side Nesting Error: ${errorMsg}`);
      }
    } else if (selectedClientAlgorithm === 'deepnest') {
      try {
        // Validate JSON structure conceptually before sending
        JSON.parse(partsListData); 
        const result = await runDeepnestAlgorithmAction(partsListData);
        if (result.success) {
          setActionResult(`Deepnest.io (Conceptual Backend) Result: ${result.message} - Layout: ${JSON.stringify(result.layout, null, 2)}`);
          toast({ title: "Deepnest Call Success", description: result.message });
        } else {
          toast({ title: "Deepnest Call Error", description: result.message, variant: "destructive" });
          setActionResult(`Deepnest.io (Conceptual Backend) Error: ${result.message}`);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Invalid JSON for parts list or backend call failed.";
        toast({ title: "Deepnest Error", description: errorMsg, variant: "destructive" });
        setActionResult(`Deepnest Call Error: ${errorMsg}`);
      }
    }
    setIsLoading(false);
  };

  const handleServerSideNesting = async () => {
    if (!partsListData.trim()) {
      toast({ title: "Input Required", description: "Please provide a parts list for server-side nesting.", variant: "default" });
      return;
    }
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    try {
      const result = await performServerSideNestingAction(partsListData);
      if (result.success) {
        toast({ title: "Server Nesting Success", description: result.message });
        setActionResult(`Server-Side Nesting result: ${result.message} - ${result.details || ''}`);
      } else {
        toast({ title: "Server Nesting Error", description: result.message, variant: "destructive" });
        setActionResult(`Server-Side Nesting error: ${result.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown server nesting error.";
      toast({ title: "Client Error (Server Nesting)", description: errorMessage, variant: "destructive" });
      setActionResult(`Client Error (Server Nesting): ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportForDesktop = async () => {
    if (!partsListData.trim()) {
      toast({ title: "Input Required", description: "Please provide a parts list to export.", variant: "default" });
      return;
    }
    setIsLoading(true);
    setActionResult(null);
    setPackedLayoutData(null);
    try {
      const result = await exportCutListForDesktopAction(partsListData);
      if (result.success) {
        toast({ title: "Export Prepared (Conceptual)", description: result.message });
        setActionResult(`Export for Desktop: ${result.message}`);
        if (result.data && typeof result.data === 'string' && result.data.startsWith('data:')) {
          const link = document.createElement("a");
          link.href = result.data;
          link.download = result.fileName || "cutlist.csv";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        toast({ title: "Export Error", description: result.message, variant: "destructive" });
        setActionResult(`Export for Desktop error: ${result.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown export error.";
      toast({ title: "Client Error (Export)", description: errorMessage, variant: "destructive" });
      setActionResult(`Client Error (Export): ${errorMessage}`);
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
              <TabsTrigger value="client-nesting"><LayoutList className="mr-2" />Client-Side Nesting</TabsTrigger>
              <TabsTrigger value="server-nesting"><Server className="mr-2" />Server-Side Nesting</TabsTrigger>
              <TabsTrigger value="export-desktop"><Download className="mr-2" />Export for Desktop</TabsTrigger>
              <TabsTrigger value="general-utils"><Sparkles className="mr-2" />Other Utilities</TabsTrigger>
            </TabsList>

            <TabsContent value="client-nesting" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Client-Side Nesting (JS Library / Conceptual Backend)</CardTitle>
              <CardDescription className="mb-4">
                Visualize parts nested onto sheets. Select an algorithm below. Good for quick previews.
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Implementation Status</AlertTitle>
                <AlertDescription>
                  Rectpack2D uses `potpack` for client-side packing. Deepnest.io calls a conceptual backend action.
                  Input JSON format: `[{"name":"Part A", "width":100, "height":50, "qty":2}, ...]`
                </AlertDescription>
              </Alert>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-nesting-algorithm">Nesting Algorithm</Label>
                  <Select value={selectedClientAlgorithm} onValueChange={setSelectedClientAlgorithm}>
                    <SelectTrigger id="client-nesting-algorithm" className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectpack2d">Rectpack2D (potpack - Client-Side)</SelectItem>
                      <SelectItem value="deepnest">Deepnest.io (Conceptual Backend Call)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder={`Paste parts list here (JSON array). Example:\n[{"name":"Top", "width":500, "height":300, "qty":1},\n {"name":"Side", "width":300, "height":700, "qty":2}]`}
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={6}
                />
                <Button onClick={handleClientSideNesting} disabled={isLoading || !partsListData.trim()}>
                  {isLoading && selectedClientAlgorithm === 'rectpack2d' ? <Loader2 className="mr-2 animate-spin" /> : <LayoutList className="mr-2" />}
                  {isLoading && selectedClientAlgorithm === 'rectpack2d' ? 'Packing...' : 'Visualize Nesting (Client)'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="server-nesting" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Server-Side Nesting (Custom Algorithm)</CardTitle>
              <CardDescription className="mb-4">
                Leverage more powerful server resources for complex nesting algorithms.
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Conceptual Implementation</AlertTitle>
                <AlertDescription>
                  This tab demonstrates calling a server action that would perform advanced nesting. The actual server-side algorithm is a placeholder.
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
                Generate a cut list or parts data file compatible with industry-standard CAM or nesting software.
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Conceptual Implementation</AlertTitle>
                <AlertDescription>
                  A conceptual CSV export is demonstrated. Actual file generation for specific software formats would require dedicated libraries.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                 <Textarea
                  placeholder="Parts list data for export (JSON array format)."
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={6}
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
                    This section can host other special functions or tools. Below is a generic example.
                </CardDescription>
                <Button onClick={handleGenericSpecialFunction} size="lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isLoading ? "Processing..." : "Perform Generic Special Action"}
                </Button>
            </TabsContent>
          </Tabs>

          {actionResult && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Action Result:</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">{actionResult}</pre>
            </div>
          )}
          {packedLayoutData && selectedClientAlgorithm === 'rectpack2d' && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Packed Layout Data (Rectpack2D/potpack):</p>
              <div className="max-h-96 overflow-auto">
                {packedLayoutData.map(sheet => (
                  <div key={sheet.id} className="mb-4 p-2 border rounded-sm">
                    <h4 className="font-medium text-xs">Sheet {sheet.id} ({sheet.dimensions.w}x{sheet.dimensions.h}mm)</h4>
                    <p className="text-xs">Efficiency: {sheet.efficiency?.toFixed(1)}% (Packed Area: {sheet.packedAreaWidth?.toFixed(0)}x{sheet.packedAreaHeight?.toFixed(0)}mm)</p>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto bg-background/50 p-2 rounded-sm mt-1">
                      {JSON.stringify(sheet.parts, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
    
