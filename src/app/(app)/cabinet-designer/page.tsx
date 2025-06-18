
"use client";

import * as React from 'react';
import Image from 'next/image';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormItem } from '@/components/ui/form'; // Added Form import
import { useToast } from "@/hooks/use-toast";
import { Library, Settings2, Loader2, Calculator, Palette, PackagePlus, PlusCircle, Save, XCircle, DraftingCompass, HelpCircle, ChevronDown } from 'lucide-react';
import { calculateCabinetDetails } from './actions';
import type { CabinetCalculationInput, CalculatedCabinet, CabinetPart, CabinetTemplateData, PartDefinition, CabinetPartType } from './types';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddPartDialog } from '@/components/cabinet-designer/add-part-dialog';


// Available cabinet types for selection
const cabinetTypes = [
  { value: 'standard_base_2_door', label: 'Standard Base Cabinet - 2 Door (600x720x560mm default)' },
  { value: 'wall_cabinet_1_door', label: 'Wall Cabinet - 1 Door' },
  { value: 'tall_pantry_2_door', label: 'Tall Pantry - 2 Door' },
  { value: 'base_cabinet_1_door_1_drawer', label: 'Base Cabinet - 1 Door, 1 Drawer' },
  { value: 'corner_wall_cabinet', label: 'Corner Wall Cabinet' },
];

const defaultDims = {
    width: 600,
    height: 720,
    depth: 560,
};

// Placeholder for a new template being defined
const initialNewTemplate: CabinetTemplateData = {
  id: `custom_${Date.now()}`, // Temporary ID
  name: 'My New Cabinet',
  type: 'custom',
  defaultDimensions: { width: 600, height: 700, depth: 500 },
  parameters: { PT: 18, BPO: 10, DG: 2, DCG: 3, TRD: 80, BPT: 3 }, // Added BPT to align with actions.ts
  parts: [
    { partId: 'side_panels', nameLabel: 'Side Panels', partType: 'Side Panel', quantityFormula: '2', widthFormula: 'D', heightFormula: 'H', materialId: 'PLY_18MM_BIRCH', thicknessFormula: 'PT', edgeBanding: { front: true }, grainDirection: 'with' },
    { partId: 'bottom_panel', nameLabel: 'Bottom Panel', partType: 'Bottom Panel', quantityFormula: '1', widthFormula: 'W - 2*PT', heightFormula: 'D', materialId: 'PLY_18MM_BIRCH', thicknessFormula: 'PT', edgeBanding: { front: true } },
  ],
  accessories: [],
};

interface FormulaHelpItem {
  id: string;
  label: string;
  value: string;
  description: string;
  example: string;
}

const formulaHelpItems: FormulaHelpItem[] = [
  { id: 'W', label: 'W', value: 'W', description: "Overall Cabinet Width.", example: "If cabinet width is 600mm, W = 600." },
  { id: 'H', label: 'H', value: 'H', description: "Overall Cabinet Height.", example: "If cabinet height is 720mm, H = 720." },
  { id: 'D', label: 'D', value: 'D', description: "Overall Cabinet Depth.", example: "If cabinet depth is 560mm, D = 560." },
  { id: 'PT', label: 'PT', value: 'PT', description: "Panel Thickness (from global parameters).", example: "If Panel Thickness is 18mm, PT = 18." },
  { id: 'BPT', label: 'BPT', value: 'BPT', description: "Back Panel Thickness (from global parameters).", example: "If Back Panel Thickness is 3mm, BPT = 3." },
  { id: 'BPO', label: 'BPO', value: 'BPO', description: "Back Panel Offset/Gap (from global parameters).", example: "If Back Panel Offset is 10mm, BPO = 10." },
  { id: 'DG', label: 'DG', value: 'DG', description: "Door Gap (total side or vertical, from global parameters).", example: "If Door Gap is 2mm, DG = 2." },
  { id: 'DCG', label: 'DCG', value: 'DCG', description: "Door Center Gap (between two doors, from global parameters).", example: "If Door Center Gap is 3mm, DCG = 3." },
  { id: 'TRD', label: 'TRD', value: 'TRD', description: "Top Rail Depth (from global parameters).", example: "If Top Rail Depth is 80mm, TRD = 80." },
  { id: 'W_minus_2PT', label: 'W - 2*PT', value: 'W - 2*PT', description: "Common for internal width of carcass (e.g., bottom panel width).", example: "W=600, PT=18  =>  600 - 2*18 = 564." },
  { id: 'D_minus_BPO_BPT', label: 'D - BPO - BPT', value: 'D - BPO - BPT', description: "Common for shelf depth, considering back panel placement.", example: "D=560, BPO=10, BPT=3  =>  560 - 10 - 3 = 547." },
  { id: 'DOOR_W', label: '(W - DG - DCG) / 2', value: '(W - DG - DCG) / 2', description: "Example for one door's width in a 2-door cabinet. Adjust DG based on total vs per-side.", example: "W=600, DG=2 (side gap), DCG=3 (center) => (600 - 2 - 3)/2 = 297.5" },
  { id: 'DOOR_H', label: 'H - DG', value: 'H - DG', description: "Example for door height. Adjust DG based on total vs per-side.", example: "H=720, DG=2 (vertical gap) => 720 - 2 = 718" },
];


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

  const [viewMode, setViewMode] = React.useState<'calculator' | 'templateDefinition'>('calculator');
  const [currentTemplate, setCurrentTemplate] = React.useState<CabinetTemplateData>(JSON.parse(JSON.stringify(initialNewTemplate))); 
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = React.useState(false);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalculationInput(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleTypeChange = (value: string) => {
    setCalculationInput(prev => ({ ...prev, cabinetType: value }));
    // For now, only the default type has hardcoded dimensions for auto-fill
    if (value === 'standard_base_2_door') {
        setCalculationInput(prev => ({ ...prev, width: defaultDims.width, height: defaultDims.height, depth: defaultDims.depth }));
    } else {
        // Placeholder for fetching default dims for other types or clearing them
        // For now, we'll keep existing dimensions or let user input
        // toast({
        //     title: "Cabinet Type Changed",
        //     description: `Calculations for this type may not be implemented yet.`,
        //     variant: "default"
        // })
    }
    setCalculatedData(null);
    setCalculationError(null);
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    setCalculatedData(null);
    setCalculationError(null);

    if (calculationInput.width <= 0 || calculationInput.height <= 0 || calculationInput.depth <= 0) {
      toast({
        title: "Invalid Dimensions",
        description: "Width, Height, and Depth must be positive numbers.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    let result;
    if (calculationInput.cabinetType === 'custom_template_id_placeholder' && currentTemplate) { // Conceptual
        result = await calculateCabinetDetails({
            ...calculationInput,
            cabinetType: currentTemplate.id, // Use the template ID
            customTemplate: currentTemplate // Pass the whole template
        });
         toast({
            title: "Calculation with Custom Template (Conceptual)",
            description: `Attempting to calculate using template: ${currentTemplate.name}. Full dynamic template calculation is not yet implemented.`,
        });
    } else if (calculationInput.cabinetType !== 'standard_base_2_door') {
      toast({
        title: "Calculation Not Implemented",
        description: `Calculation logic for "${cabinetTypes.find(ct => ct.value === calculationInput.cabinetType)?.label}" is not yet implemented in this prototype. Only 'Standard Base Cabinet - 2 Door' is currently supported with hardcoded logic.`,
        variant: "default",
      });
      setCalculationError(`Calculation logic for "${calculationInput.cabinetType}" is not available.`);
      setIsLoading(false);
      return;
    } else {
        result = await calculateCabinetDetails(calculationInput);
    }


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

  const getPreviewImageSrc = () => {
    switch(calculationInput.cabinetType) {
        case 'standard_base_2_door': return "https://placehold.co/300x200/EBF4FA/5DADE2.png";
        case 'wall_cabinet_1_door': return "https://placehold.co/300x200/FADBD8/EC7063.png";
        case 'tall_pantry_2_door': return "https://placehold.co/300x200/D5F5E3/58D68D.png";
        case 'base_cabinet_1_door_1_drawer': return "https://placehold.co/300x200/FCF3CF/F7DC6F.png";
        case 'corner_wall_cabinet': return "https://placehold.co/300x200/E8DAEF/C39BD3.png";
        default: return "https://placehold.co/300x200/EEEEEE/BDBDBD.png";
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

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, path: string, partIndex?: number, field?: keyof PartDefinition | keyof PartDefinition['edgeBanding']) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;
    if (type === 'number') processedValue = parseFloat(value) || 0;
    if (type === 'checkbox' && field) { // Ensure field is provided for checkbox
        processedValue = (e.target as HTMLInputElement).checked;
    }


    setCurrentTemplate(prev => {
        const newTemplate = JSON.parse(JSON.stringify(prev)); 
        let target: any = newTemplate; 
        const pathArray = path.split('.');

        for (let i = 0; i < pathArray.length - 1; i++) {
            target = target[pathArray[i]];
            if (pathArray[i] === 'parts' && partIndex !== undefined && target[partIndex]) {
                target = target[partIndex];
            } else if (pathArray[i] === 'parts' && partIndex !== undefined && !target[partIndex]) {
                console.error(`Part at index ${partIndex} not found in template path ${path}`);
                return prev; 
            }
        }
        
        const finalKey = pathArray[pathArray.length -1];
        if (partIndex !== undefined && path.startsWith('parts.') && field) {
             if (finalKey === 'edgeBanding' && typeof field === 'string' && (field === 'front' || field === 'back' || field === 'top' || field === 'bottom')) {
                target.edgeBanding = { ...target.edgeBanding, [field as keyof PartDefinition['edgeBanding']]: processedValue };
            } else if (finalKey !== 'edgeBanding') { // Handles other PartDefinition fields
                 target[finalKey as keyof PartDefinition] = processedValue as any;
            }
        } else {
             target[finalKey] = processedValue;
        }
        return newTemplate;
    });
  };

  const handleFormulaSelect = (partIndex: number, formulaField: keyof PartDefinition, selectedFormulaValue: string) => {
    setCurrentTemplate(prev => {
        const newTemplate = JSON.parse(JSON.stringify(prev));
        if (newTemplate.parts && newTemplate.parts[partIndex]) {
            (newTemplate.parts[partIndex] as any)[formulaField] = selectedFormulaValue;
        } else {
            console.error(`Part at index ${partIndex} not found for formula selection.`);
        }
        return newTemplate;
    });
  };


  const handleAddPartToTemplate = (newPart: PartDefinition) => {
    setCurrentTemplate(prev => ({
        ...prev,
        parts: [
            ...prev.parts,
            newPart
        ]
    }));
  };

  const handleRemovePartFromTemplate = (partIndex: number) => {
    setCurrentTemplate(prev => ({
        ...prev,
        parts: prev.parts.filter((_, index) => index !== partIndex)
    }));
  };

  const handleSaveTemplate = () => {
    // In a real app, this would send `currentTemplate` to a backend to be saved in a database.
    // The backend would assign a permanent ID.
    console.log("Saving Template (Conceptual):", currentTemplate);
    toast({
        title: "Template Saved (Conceptual)",
        description: `Template "${currentTemplate.name}" definition logged. This is a prototype; no actual database saving or dynamic calculation with this template is implemented yet.`,
    });
    // Optionally, add the new template to a list of available templates in the calculator view
    // For now, just switch back.
    setViewMode('calculator');
  };

  const FormulaInputWithHelper = ({ partIndex, formulaField, label, placeholder }: { partIndex: number, formulaField: keyof PartDefinition, label: string, placeholder: string }) => (
    <div className="flex items-end gap-2">
      <div className="flex-grow">
        <Label htmlFor={`part_${partIndex}_${formulaField}`}>{label}</Label>
        {(formulaField === 'widthFormula' || formulaField === 'heightFormula') ? (
            <Textarea
              id={`part_${partIndex}_${formulaField}`}
              rows={1}
              value={(currentTemplate.parts[partIndex] as any)[formulaField] || ''}
              onChange={(e) => handleTemplateInputChange(e, `parts.${formulaField}`, partIndex, formulaField as keyof PartDefinition)}
              placeholder={placeholder}
            />
        ) : (
             <Input
                id={`part_${partIndex}_${formulaField}`}
                value={(currentTemplate.parts[partIndex] as any)[formulaField] || ''}
                onChange={(e) => handleTemplateInputChange(e, `parts.${formulaField}`, partIndex, formulaField as keyof PartDefinition)}
                placeholder={placeholder}
             />
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="whitespace-nowrap px-2">
            <ChevronDown className="h-4 w-4" /> <span className="ml-1">Ins</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
          {formulaHelpItems.map((item) => (
            <DropdownMenuItem key={item.id} onSelect={() => handleFormulaSelect(partIndex, formulaField, item.value)} className="flex justify-between items-center">
              <span>{item.label}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-sm p-2">
                  <p className="font-semibold">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.example}</p>
                </TooltipContent>
              </Tooltip>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );


  const renderCalculatorView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" />Configure Cabinet</CardTitle>
          <CardDescription>Select type and customize dimensions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button onClick={() => { setCurrentTemplate(JSON.parse(JSON.stringify(initialNewTemplate))); setViewMode('templateDefinition'); }} variant="outline" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Define New Cabinet Template
          </Button>
          <Separator />
          <div>
            <Label htmlFor="cabinetType">Cabinet Type</Label>
            <Select value={calculationInput.cabinetType} onValueChange={handleTypeChange}>
              <SelectTrigger id="cabinetType"><SelectValue placeholder="Select a cabinet type" /></SelectTrigger>
              <SelectContent>{cabinetTypes.map(type => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
            <Image src={getPreviewImageSrc()} alt={`${calculationInput.cabinetType} Preview`} width={300} height={200} className="object-contain" data-ai-hint={getImageAiHint()}/>
          </div>
          <div><Label htmlFor="width">Width (mm)</Label><Input id="width" name="width" type="number" value={calculationInput.width} onChange={handleInputChange} placeholder="e.g., 600"/></div>
          <div><Label htmlFor="height">Height (mm)</Label><Input id="height" name="height" type="number" value={calculationInput.height} onChange={handleInputChange} placeholder="e.g., 720"/></div>
          <div><Label htmlFor="depth">Depth (mm)</Label><Input id="depth" name="depth" type="number" value={calculationInput.depth} onChange={handleInputChange} placeholder="e.g., 560"/></div>
          <Button onClick={handleCalculate} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            {isLoading ? "Calculating..." : "Calculate Parts & Cost"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" />Calculation Results</CardTitle>
          <CardDescription>Estimated parts, materials, and costs. (Currently for 'Standard Base 2 Door' only or basic custom template)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (<div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Calculating...</p></div>)}
          {calculationError && !isLoading && (<div className="text-destructive bg-destructive/10 p-4 rounded-md"><p className="font-semibold">Error:</p><p>{calculationError}</p></div>)}
          {calculatedData && !isLoading && !calculationError && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Estimated Totals</h3>
                <div className="grid grid-cols-2 gap-2 text-sm p-3 border rounded-md bg-muted/50">
                  <p>Total Main Panel Area (e.g. 18mm):</p><p className="text-right font-medium">{(calculatedData.totalPanelAreaMM / (1000*1000)).toFixed(2)} m²</p>
                  <p>Total Back Panel Area (e.g. 3mm):</p><p className="text-right font-medium">{(calculatedData.totalBackPanelAreaMM / (1000*1000)).toFixed(2)} m²</p>
                  <p>Estimated Material Cost:</p><p className="text-right font-medium">${calculatedData.estimatedMaterialCost.toFixed(2)}</p>
                  <p>Estimated Accessory Cost:</p><p className="text-right font-medium">${calculatedData.estimatedAccessoryCost.toFixed(2)}</p>
                  <p className="font-bold text-base">Estimated Total Cost:</p><p className="text-right font-bold text-base">${calculatedData.estimatedTotalCost.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><PackagePlus className="mr-2 h-5 w-5"/>Calculated Part List (Cutting List)</h3>
                <div className="max-h-[400px] overflow-y-auto border rounded-md">
                  <Table><TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>Part</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Width</TableHead><TableHead className="text-right">Height</TableHead><TableHead className="text-center">Thick</TableHead><TableHead>Material</TableHead><TableHead>Edge Banding</TableHead><TableHead>Grain</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {calculatedData.parts.map((part, index) => (
                        <TableRow key={index}><TableCell>{part.name}</TableCell><TableCell className="text-center">{part.quantity}</TableCell><TableCell className="text-right">{part.width.toFixed(0)}</TableCell><TableCell className="text-right">{part.height.toFixed(0)}</TableCell><TableCell className="text-center">{part.thickness}</TableCell><TableCell>{part.material}</TableCell>
                        <TableCell className="text-xs">
                          {part.edgeBanding && Object.entries(part.edgeBanding).filter(([, length]) => length && length > 0).map(([edge, length]) => `${edge.charAt(0).toUpperCase()}${edge.slice(1)}: ${length?.toFixed(0)}mm`).join(', ')}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{part.grainDirection || '-'}</TableCell>
                        </TableRow>))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Note: This is a raw cutting list. For material optimization (nesting), these parts would be processed by a nesting engine.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Accessories</h3>
                <div className="max-h-[200px] overflow-y-auto border rounded-md">
                  <Table><TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>Accessory</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Total Cost</TableHead></TableRow></TableHeader>
                    <TableBody>{calculatedData.accessories.map((acc, index) => (<TableRow key={index}><TableCell>{acc.name}</TableCell><TableCell className="text-center">{acc.quantity}</TableCell><TableCell className="text-right">${acc.unitCost.toFixed(2)}</TableCell><TableCell className="text-right">${acc.totalCost.toFixed(2)}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </div>
              </div>
              <div className="mt-4 p-4 border border-dashed rounded-md"><h4 className="font-semibold text-muted-foreground">Nesting Output (Placeholder)</h4><p className="text-sm text-muted-foreground">Actual 2D nesting layout (SVG/PDF) and sheet count would appear here after integration with a nesting engine.</p></div>
              <div className="flex space-x-2 mt-4"><Button variant="outline" disabled>Export Cutting List (CSV)</Button><Button variant="outline" disabled>Export Layout (PDF/SVG)</Button></div>
            </div>
          )}
          {!isLoading && !calculatedData && !calculationError && (<div className="text-center py-10 text-muted-foreground"><Library className="mx-auto h-12 w-12 mb-4" /><p>Select a cabinet type, enter dimensions, and click "Calculate" to see the results.</p></div>)}
        </CardContent>
      </Card>
    </div>
  );

 const renderTemplateDefinitionView = () => (
    <TooltipProvider>
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><DraftingCompass className="mr-2 h-5 w-5 text-primary" />Define New Cabinet Template</CardTitle>
        <CardDescription>Specify the parameters, parts, formulas, and edge banding for your custom cabinet. This is a conceptual editor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label htmlFor="templateName">Template Name</Label><Input id="templateName" name="name" value={currentTemplate.name} onChange={(e) => handleTemplateInputChange(e, 'name')} placeholder="e.g., Kitchen Base - Drawers"/></div>
          <div>
            <Label htmlFor="templateType">Template Type</Label>
            <Select value={currentTemplate.type} onValueChange={(value) => handleTemplateInputChange({ target: { name: 'type', value } } as any, 'type')}>
                <SelectTrigger id="templateType"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="base">Base Cabinet</SelectItem>
                    <SelectItem value="wall">Wall Cabinet</SelectItem>
                    <SelectItem value="tall">Tall Cabinet</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
            <CardHeader><CardTitle className="text-lg">Default Dimensions (mm)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
                <div><Label htmlFor="defaultWidth">Width</Label><Input id="defaultWidth" name="width" type="number" value={currentTemplate.defaultDimensions.width} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.width')} /></div>
                <div><Label htmlFor="defaultHeight">Height</Label><Input id="defaultHeight" name="height" type="number" value={currentTemplate.defaultDimensions.height} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.height')} /></div>
                <div><Label htmlFor="defaultDepth">Depth</Label><Input id="defaultDepth" name="depth" type="number" value={currentTemplate.defaultDimensions.depth} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.depth')} /></div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="text-lg">Global Parameters (mm)</CardTitle><CardDescription>Define variables like Panel Thickness (PT) to use in formulas (e.g., W - 2*PT).</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(currentTemplate.parameters).map(([key, value]) => (
                    <div key={key}><Label htmlFor={`param_${key}`}>{key}</Label><Input id={`param_${key}`} name={key} type="number" value={value as number} onChange={(e) => handleTemplateInputChange(e, `parameters.${key}`)} /></div>
                ))}
                {/* TODO: Add button to add more custom parameters */}
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle className="text-lg">Part Definitions</CardTitle><CardDescription>Define each part, its quantity, dimensions (using formulas), material, and edge banding.</CardDescription></div>
                 <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
                    <DialogTrigger asChild>
                         <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Part</Button>
                    </DialogTrigger>
                    <AddPartDialog 
                        setOpen={setIsAddPartDialogOpen} 
                        onAddPart={handleAddPartToTemplate} 
                        existingPartCount={currentTemplate.parts.length}
                    />
                 </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
                {currentTemplate.parts.map((part, index) => (
                    <Card key={part.partId || index} className="p-4 relative">
                         <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => handleRemovePartFromTemplate(index)}><XCircle className="h-5 w-5"/></Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-start">
                            <div><Label>Part Type</Label><Input disabled value={part.partType} /> </div>
                            <div><Label>Part Name Label</Label><Input value={part.nameLabel} onChange={(e) => handleTemplateInputChange(e, 'parts.nameLabel', index, 'nameLabel')} placeholder="e.g., Side Panel"/></div>
                            <FormulaInputWithHelper partIndex={index} formulaField="quantityFormula" label="Quantity Formula" placeholder="e.g., 2"/>
                            
                            <FormulaInputWithHelper partIndex={index} formulaField="widthFormula" label="Width Formula" placeholder="e.g., D or W - 2*PT"/>
                            <FormulaInputWithHelper partIndex={index} formulaField="heightFormula" label="Height Formula" placeholder="e.g., H or D - BPO"/>
                            
                            <div>
                                <Label>Material ID</Label>
                                <Input 
                                    value={part.materialId} 
                                    onChange={(e) => handleTemplateInputChange(e, 'parts.materialId', index, 'materialId')} 
                                    placeholder="e.g., MDF_18MM"
                                />
                            </div>
                            <FormulaInputWithHelper partIndex={index} formulaField="thicknessFormula" label="Thickness Formula" placeholder="e.g., PT or BPT"/>

                             <div>
                                <Label>Grain Direction</Label>
                                 <Select 
                                    value={part.grainDirection || 'none'}
                                    onValueChange={(value) => handleTemplateInputChange({ target: { name: 'grainDirection', value: value === 'none' ? null : value }} as any, 'parts.grainDirection', index, 'grainDirection')}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="with">With Grain (Height)</SelectItem>
                                        <SelectItem value="reverse">Reverse Grain (Width)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                        </div>
                        <div className="mt-3">
                            <Label className="font-medium">Edge Banding (Applied to this part's edges):</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 text-sm">
                                {(['front', 'back', 'top', 'bottom'] as Array<keyof PartDefinition['edgeBanding']>).map(edge => (
                                    <FormItem key={edge} className="flex flex-row items-center space-x-2">
                                        <Checkbox 
                                            id={`edge_${index}_${edge}`} 
                                            checked={!!part.edgeBanding?.[edge]} 
                                            onCheckedChange={(checked) => handleTemplateInputChange({target: {name: edge, type: 'checkbox', value: !!checked, checked: !!checked}} as any, 'parts.edgeBanding', index, edge as keyof PartDefinition['edgeBanding'])} 
                                        />
                                        <Label htmlFor={`edge_${index}_${edge}`} className="capitalize font-normal">{edge}</Label>
                                    </FormItem>
                                ))}
                            </div>
                             <p className="text-xs text-muted-foreground mt-1">
                                "Top" and "Bottom" refer to the edges along the part's Width dimension. "Front" and "Back" refer to edges along the part's Height dimension.
                                This assumes parts are typically oriented with their 'height' dimension vertically.
                            </p>
                        </div>
                         {part.notes && (
                            <div className="mt-3">
                                <Label className="font-medium">Part Notes:</Label>
                                <Textarea value={part.notes} onChange={(e) => handleTemplateInputChange(e, 'parts.notes', index, 'notes')} rows={2} />
                            </div>
                        )}
                    </Card>
                ))}
                 {currentTemplate.parts.length === 0 && <p className="text-muted-foreground text-center py-4">No parts defined yet. Click "Add Part" to begin.</p>}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle className="text-lg">Accessories (Conceptual)</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Define accessories like hinges, handles, with quantity formulas. (UI for this is not yet implemented).</p></CardContent>
        </Card>

      </CardContent>
      <CardFooter className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => setViewMode('calculator')}>Cancel</Button>
        <Button onClick={handleSaveTemplate}><Save className="mr-2 h-4 w-4" /> Save Template (Conceptual)</Button>
      </CardFooter>
    </Card>
    </TooltipProvider>
  );

  return (
    <>
      <PageHeader
        title="Cabinet Designer"
        description={viewMode === 'calculator' ? "Configure cabinet modules, calculate parts, and estimate costs." : "Define a new parametric cabinet template."}
      />
      {viewMode === 'calculator' ? renderCalculatorView() : renderTemplateDefinitionView()}
    </>
  );
}

