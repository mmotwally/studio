
"use client";

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, LayoutList, Server, Download, Info } from 'lucide-react';
import * as React from 'react';
import { useToast } from "@/hooks/use-toast";
import { performSpecialServerAction, performServerSideNestingAction, exportCutListForDesktopAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SpecialFeaturePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionResult, setActionResult] = React.useState<string | null>(null);
  const [partsListData, setPartsListData] = React.useState<string>('');
  const [selectedClientAlgorithm, setSelectedClientAlgorithm] = React.useState<string>('rectpack2d'); // Default selection

  const handleGenericSpecialFunction = async () => {
    setIsLoading(true);
    setActionResult(null);
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

  const handleClientSideNesting = () => {
    console.log(`Attempting Client-Side Nesting with algorithm: ${selectedClientAlgorithm} and data:`, partsListData);
    toast({
      title: `Client-Side Nesting (${selectedClientAlgorithm}) (Conceptual)`,
      description: "Nesting logic would run in the browser. Check console for data and selected algorithm.",
    });
    setActionResult(`Client-Side Nesting (${selectedClientAlgorithm}) initiated (conceptual). Actual library integration needed.`);
  };

  const handleServerSideNesting = async () => {
    if (!partsListData.trim()) {
      toast({ title: "Input Required", description: "Please provide a parts list for server-side nesting.", variant: "default" });
      return;
    }
    setIsLoading(true);
    setActionResult(null);
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
    try {
      const result = await exportCutListForDesktopAction(partsListData);
      if (result.success) {
        toast({ title: "Export Prepared (Conceptual)", description: result.message });
        setActionResult(`Export for Desktop: ${result.message} - ${result.data || '(Conceptual: file would be downloaded)'}`);
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
              <CardTitle className="text-lg mb-2">Client-Side Nesting (JS Library / WASM)</CardTitle>
              <CardDescription className="mb-4">
                Visualize parts nested onto sheets directly in your browser. Select an algorithm below. Good for quick previews.
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Conceptual Implementation</AlertTitle>
                <AlertDescription>
                  This tab demonstrates where client-side nesting logic would be integrated. The actual library and visualization are not yet implemented.
                </AlertDescription>
              </Alert>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-nesting-algorithm">Nesting Algorithm (Conceptual)</Label>
                  <Select value={selectedClientAlgorithm} onValueChange={setSelectedClientAlgorithm}>
                    <SelectTrigger id="client-nesting-algorithm" className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectpack2d">Rectpack2D (Conceptual WASM)</SelectItem>
                      <SelectItem value="deepnest">Deepnest.io (Conceptual Backend Call)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Paste parts list here (e.g., JSON or CSV format).&#10;Example: [{name: 'Side Panel', width: 700, height: 500, qty: 2}, ...]"
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={6}
                />
                <Button onClick={handleClientSideNesting} disabled={isLoading || !partsListData.trim()}>
                  <LayoutList className="mr-2" /> Visualize Nesting (Client)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="server-nesting" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Server-Side Nesting (Custom Algorithm)</CardTitle>
              <CardDescription className="mb-4">
                Leverage more powerful server resources for complex nesting algorithms. This approach can handle larger jobs, intricate constraints (like grain matching), and potentially yield better material optimization.
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
                  <Server className="mr-2" /> Calculate Nesting (Server)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="export-desktop" className="mt-4 p-4 border rounded-md">
              <CardTitle className="text-lg mb-2">Export for Desktop Software</CardTitle>
              <CardDescription className="mb-4">
                Generate a cut list or parts data file compatible with industry-standard CAM or nesting software (e.g., VCarve, Mozaik, CutList Plus). This allows you to use highly optimized, feature-rich desktop tools.
              </CardDescription>
              <Alert variant="default" className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Conceptual Implementation</AlertTitle>
                <AlertDescription>
                  This tab demonstrates exporting data. The actual file generation for specific desktop software formats (e.g., DXF) would require dedicated libraries. A CSV export is conceptually demonstrated.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                 <Textarea
                  placeholder="Parts list data for export would typically be sourced from the Cabinet Designer's project calculation."
                  value={partsListData}
                  onChange={(e) => setPartsListData(e.target.value)}
                  rows={6}
                />
                <Button onClick={handleExportForDesktop} disabled={isLoading || !partsListData.trim()}>
                  <Download className="mr-2" /> Export Cut List (Conceptual CSV)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="general-utils" className="mt-4 p-4 border rounded-md">
                <CardTitle className="text-lg mb-2">Other Utilities</CardTitle>
                <CardDescription className="mb-4">
                    This section can host other special functions or tools. Below is the original generic example.
                </CardDescription>
                <Button onClick={handleGenericSpecialFunction} size="lg" disabled={isLoading}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isLoading ? "Processing..." : "Perform Generic Special Action"}
                </Button>
            </TabsContent>
          </Tabs>

          {actionResult && (
            <div className="mt-6 p-4 border rounded-md bg-muted w-full">
              <p className="text-sm font-semibold">Action Result:</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{actionResult}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
    
