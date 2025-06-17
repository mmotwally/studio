
"use client";

import * as React from 'react';
import Image from 'next/image'; // Ensure Image is imported
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/hooks/use-toast";
import { Library, Settings2, Loader2, Calculator, Palette, PackagePlus } from 'lucide-react';
import { calculateCabinetDetails } from './actions';
import type { CabinetCalculationInput, CalculatedCabinet, CabinetPart } from './types';

// Available cabinet types for selection
const cabinetTypes = [
  { value: 'standard_base_2_door', label: 'Standard Base Cabinet - 2 Door (600x720x560mm default)' },
  { value: 'wall_cabinet_1_door', label: 'Wall Cabinet - 1 Door' },
  { value: 'tall_pantry_2_door', label: 'Tall Pantry - 2 Door' },
  { value: 'base_cabinet_1_door_1_drawer', label: 'Base Cabinet - 1 Door, 1 Drawer (Not Implemented)' },
  { value: 'corner_wall_cabinet', label: 'Corner Wall Cabinet (Not Implemented)' },
];

const defaultDims = {
    width: 600,
    height: 720,
    depth: 560,
}

export default function CabinetDesignerPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [calculationInput, setCalculationInput] = React.useState<CabinetCalculationInput>({
    cabinetType: 'standard_base_2_door',
    width: defaultDims.width,
    height: defaultDims.height,
    depth: defaultDims.depth,
  });
  const [calculatedData, setCalculatedData] = React.useState<CalculatedCabinet | null>(null);
  const [calculationError, setCalculationError] = React.useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalculationInput(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleTypeChange = (value: string) => {
    setCalculationInput(prev => ({ ...prev, cabinetType: value }));
    if (value === 'standard_base_2_door') {
        setCalculationInput(prev => ({ ...prev, width: defaultDims.width, height: defaultDims.height, depth: defaultDims.depth }));
    } else {
        // For other types, you might want to set different default dimensions or clear them
        // For now, let's clear them or prompt the user.
        // For this example, we'll just keep previous or let user input.
        // Consider setting specific defaults per type in a more advanced version.
        toast({
            title: "Cabinet Type Changed",
            description: `Switched to ${cabinetTypes.find(ct => ct.value === value)?.label}. Please set appropriate dimensions.`,
            variant: "default"
        })
    }
    setCalculatedData(null);
    setCalculationError(null);
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    setCalculatedData(null);
    setCalculationError(null);

    // The server action already handles the case for unsupported types.
    // We can keep the client-side check for immediate feedback if a type is known to be non-functional.
    if (calculationInput.cabinetType !== 'standard_base_2_door') {
      toast({
        title: "Prototype Limitation",
        description: `Calculations for '${cabinetTypes.find(ct => ct.value === calculationInput.cabinetType)?.label}' are not yet implemented in this prototype.`,
        variant: "default",
      });
      setCalculationError(`Calculation logic for '${calculationInput.cabinetType}' is not implemented.`);
      setIsLoading(false);
      // Allow proceeding to server action to demonstrate its error handling as well, or return here.
      // For now, let's return here to avoid an unnecessary server call for types known to be unimplemented on the client.
      // return; 
    }
     if (calculationInput.width <= 0 || calculationInput.height <= 0 || calculationInput.depth <= 0) {
      toast({
        title: "Invalid Dimensions",
        description: "Width, Height, and Depth must be positive numbers.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }


    const result = await calculateCabinetDetails(calculationInput);
    if (result.success && result.data) {
      setCalculatedData(result.data);
      toast({
        title: "Calculation Successful",
        description: "Cabinet parts and cost estimated.",
      });
    } else {
      setCalculationError(result.error || "An unknown error occurred during calculation.");
      toast({
        title: "Calculation Failed",
        description: result.error || "Could not calculate cabinet details.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  // Determine which image to show based on selected cabinet type
  const getPreviewImageSrc = () => {
    switch(calculationInput.cabinetType) {
        case 'standard_base_2_door':
            return "https://placehold.co/300x200/EBF4FA/5DADE2.png";
        case 'wall_cabinet_1_door':
            return "https://placehold.co/300x200/FADBD8/EC7063.png"; // Example: different color
        case 'tall_pantry_2_door':
            return "https://placehold.co/300x200/D5F5E3/58D68D.png"; // Example: different color
        case 'base_cabinet_1_door_1_drawer':
             return "https://placehold.co/300x200/FCF3CF/F7DC6F.png";
        case 'corner_wall_cabinet':
             return "https://placehold.co/300x200/E8DAEF/C39BD3.png";
        default:
            return "https://placehold.co/300x200/EEEEEE/BDBDBD.png"; // Generic placeholder
    }
  }
  
  const getImageAiHint = () => {
    switch(calculationInput.cabinetType) {
        case 'standard_base_2_door': return "base cabinet";
        case 'wall_cabinet_1_door': return "wall cabinet";
        case 'tall_pantry_2_door': return "pantry cabinet";
        case 'base_cabinet_1_door_1_drawer': return "kitchen drawer";
        case 'corner_wall_cabinet': return "corner cabinet";
        default: return "cabinet furniture";
    }
  }


  return (
    <>
      <PageHeader
        title="Cabinet Designer"
        description="Configure cabinet modules, calculate parts, and estimate costs."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings2 className="mr-2 h-5 w-5 text-primary" />
              Configure Cabinet
            </CardTitle>
            <CardDescription>Select type and customize dimensions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="cabinetType">Cabinet Type</Label>
              <Select value={calculationInput.cabinetType} onValueChange={handleTypeChange}>
                <SelectTrigger id="cabinetType">
                  <SelectValue placeholder="Select a cabinet type" />
                </SelectTrigger>
                <SelectContent>
                  {cabinetTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                 <Image src={getPreviewImageSrc()} alt={`${calculationInput.cabinetType} Preview`} width={300} height={200} className="object-contain" data-ai-hint={getImageAiHint()}/>
            </div>

            <div>
              <Label htmlFor="width">Width (mm)</Label>
              <Input
                id="width"
                name="width"
                type="number"
                value={calculationInput.width}
                onChange={handleInputChange}
                placeholder="e.g., 600"
              />
            </div>
            <div>
              <Label htmlFor="height">Height (mm)</Label>
              <Input
                id="height"
                name="height"
                type="number"
                value={calculationInput.height}
                onChange={handleInputChange}
                placeholder="e.g., 720"
              />
            </div>
            <div>
              <Label htmlFor="depth">Depth (mm)</Label>
              <Input
                id="depth"
                name="depth"
                type="number"
                value={calculationInput.depth}
                onChange={handleInputChange}
                placeholder="e.g., 560"
              />
            </div>
            <Button onClick={handleCalculate} className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
              {isLoading ? "Calculating..." : "Calculate Parts & Cost"}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5 text-primary" />
              Calculation Results
            </CardTitle>
            <CardDescription>Estimated parts, materials, and costs.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Calculating...</p>
              </div>
            )}
            {calculationError && !isLoading && (
              <div className="text-destructive bg-destructive/10 p-4 rounded-md">
                <p className="font-semibold">Error:</p>
                <p>{calculationError}</p>
              </div>
            )}
            {calculatedData && !isLoading && !calculationError && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Estimated Totals</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm p-3 border rounded-md bg-muted/50">
                    <p>Total Panel Area (18mm):</p><p className="text-right font-medium">{calculatedData.totalPanelArea.toFixed(2)} m²</p>
                    <p>Total Back Panel Area (3mm):</p><p className="text-right font-medium">{calculatedData.totalBackPanelArea.toFixed(2)} m²</p>
                    <p className="font-bold text-base">Estimated Cost:</p><p className="text-right font-bold text-base">${calculatedData.estimatedCost.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <PackagePlus className="mr-2 h-5 w-5"/>
                    Calculated Part List (Cutting List)
                  </h3>
                  <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Part Name</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Width (mm)</TableHead>
                          <TableHead className="text-right">Height/Length (mm)</TableHead>
                          <TableHead className="text-center">Thick (mm)</TableHead>
                          <TableHead>Material</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculatedData.parts.map((part, index) => (
                          <TableRow key={index}>
                            <TableCell>{part.name}</TableCell>
                            <TableCell className="text-center">{part.quantity}</TableCell>
                            <TableCell className="text-right">{part.width.toFixed(0)}</TableCell>
                            <TableCell className="text-right">{part.height.toFixed(0)}</TableCell>
                            <TableCell className="text-center">{part.thickness}</TableCell>
                            <TableCell>{part.material}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                   <p className="text-xs text-muted-foreground mt-2">
                    Note: This is a raw cutting list. For material optimization (nesting), these parts would be processed by a nesting engine.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Accessories</h3>
                   <div className="max-h-[200px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader  className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Accessory</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculatedData.accessories.map((acc, index) => (
                          <TableRow key={index}>
                            <TableCell>{acc.name}</TableCell>
                            <TableCell className="text-center">{acc.quantity}</TableCell>
                            <TableCell className="text-right">${acc.unitCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${acc.totalCost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Placeholder for Nesting Output */}
                <div className="mt-4 p-4 border border-dashed rounded-md">
                  <h4 className="font-semibold text-muted-foreground">Nesting Output (Placeholder)</h4>
                  <p className="text-sm text-muted-foreground">
                    Actual 2D nesting layout (SVG/PDF) and sheet count would appear here after integration with a nesting engine (e.g., deepnest.js or Nest&Cut API).
                  </p>
                </div>

                {/* Placeholder for Export Buttons */}
                <div className="flex space-x-2 mt-4">
                    <Button variant="outline" disabled>Export Cutting List (CSV)</Button>
                    <Button variant="outline" disabled>Export Layout (PDF/SVG)</Button>
                </div>

              </div>
            )}
            {!isLoading && !calculatedData && !calculationError && (
              <div className="text-center py-10 text-muted-foreground">
                <Library className="mx-auto h-12 w-12 mb-4" />
                <p>Select a cabinet type, enter dimensions, and click "Calculate" to see the results.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
