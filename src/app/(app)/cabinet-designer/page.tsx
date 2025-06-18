
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
import { FormItem, FormLabel, FormControl } from '@/components/ui/form'; // Form is not directly used here, FormItem for Checkbox layout
import { useToast } from "@/hooks/use-toast";
import { Library, Settings2, Loader2, Calculator, Palette, PackagePlus, PlusCircle, Save, XCircle, DraftingCompass, HelpCircle, ChevronDown, BookOpen, BoxSelect, AlertCircle, ListChecks, Trash2 } from 'lucide-react';
import { calculateCabinetDetails, calculateDrawerSet, saveCabinetTemplateAction, getCabinetTemplatesAction, getCabinetTemplateByIdAction, deleteCabinetTemplateAction } from './actions';
import type { CabinetCalculationInput, CalculatedCabinet, CabinetPart, CabinetTemplateData, PartDefinition, CabinetPartType, CabinetTypeContext, DrawerSetCalculatorInput, DrawerSetCalculatorResult, CalculatedDrawer as SingleCalculatedDrawer } from './types';
import { PREDEFINED_MATERIALS } from './types';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddPartDialog } from '@/components/cabinet-designer/add-part-dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PREDEFINED_FORMULAS } from './predefined-formulas';


// Initial predefined cabinet types (hardcoded)
const initialHardcodedCabinetTypes = [
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

const generateNewTemplatePlaceholder = (): CabinetTemplateData => ({
  id: crypto.randomUUID(), // Generate a new UUID for each new template
  name: 'My New Custom Cabinet',
  type: 'custom',
  previewImage: 'https://placehold.co/300x200/FADBD8/C0392B.png',
  defaultDimensions: { width: 600, height: 700, depth: 500 },
  parameters: {
    PT: 18, BPT: 3, BPO: 10, DG: 2, DCG: 3, TRD: 80, B: 10,
    DW: 500, DD: 450, DH: 150, Clearance: 13
  },
  parts: [
    { partId: 'side_panels_initial', nameLabel: 'Side Panels (Example)', partType: 'Side Panel', cabinetContext: 'Base', quantityFormula: '2', widthFormula: 'D', heightFormula: 'H - PT', materialId: 'Material1', thicknessFormula: 'PT', edgeBanding: { front: true }, grainDirection: 'with' },
    { partId: 'bottom_panel_initial', nameLabel: 'Bottom Panel (Example)', partType: 'Bottom Panel', cabinetContext: 'Base', quantityFormula: '1', widthFormula: 'W - 2*PT', heightFormula: 'D', materialId: 'Material1', thicknessFormula: 'PT', edgeBanding: { front: true } },
  ],
  accessories: [],
});

interface GlobalParameterUIDefinition {
  key: keyof CabinetTemplateData['parameters'];
  displayName: string;
  tooltip: string;
}

const globalParameterUIDefinitions: GlobalParameterUIDefinition[] = [
  { key: 'PT', displayName: 'Panel Thickness', tooltip: 'Main panel thickness (PT)' },
  { key: 'BPT', displayName: 'Back Panel Thickness', tooltip: 'Thickness of the back panel (BPT)' },
  { key: 'BPO', displayName: 'Back Panel Offset', tooltip: 'Inset distance for the back panel (BPO)' },
  { key: 'B', displayName: 'Back Panel Gap (General)', tooltip: 'General gap for back panel considerations (B)' },
  { key: 'DG', displayName: 'Door Gap', tooltip: 'General gap around doors (DG)' },
  { key: 'DCG', displayName: 'Door Center Gap', tooltip: 'Gap between two doors (DCG)' },
  { key: 'TRD', displayName: 'Top Rail Depth', tooltip: 'Depth/width of top rails (TRD)' },
  { key: 'DW', displayName: 'Drawer Width (Overall)', tooltip: 'Overall width available for drawer assembly (DW)' },
  { key: 'DD', displayName: 'Drawer Depth', tooltip: 'Overall depth for drawer assembly/slides (DD)' },
  { key: 'DH', displayName: 'Drawer Side Height', tooltip: 'Height of the drawer box sides (DH)' },
  { key: 'Clearance', displayName: 'Drawer Slide Clearance (Total)', tooltip: 'Total side clearance for drawer slides (Clearance)' },
];


function evaluateFormulaClientSide(
  formula: string | undefined,
  params: { W: number; H: number; D: number; [key: string]: number | undefined }
): string {
  if (typeof formula !== 'string' || !formula.trim()) {
    return 'N/A';
  }
  try {
    const { W, H, D, PT, BPT, BPO, TRD, DCG, DG, B, DW, DD, DH, Clearance } = params;
    const scope: Record<string, number | undefined> = { W, H, D, PT, BPT, BPO, TRD, DCG, DG, B, DW, DD, DH, Clearance, ...params };
    let formulaToEvaluate = formula;
    for (const key in scope) {
      if (scope[key] !== undefined) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        formulaToEvaluate = formulaToEvaluate.replace(regex, String(scope[key]));
      }
    }
    const knownParamsRegex = /\b(W|H|D|PT|BPT|BPO|TRD|DCG|DG|B|DW|DD|DH|Clearance)\b/g;
    if (knownParamsRegex.test(formulaToEvaluate)) {
      return formula; 
    }
    const sanitizedForEval = formulaToEvaluate.replace(/[^-()\d/*+.]/g, '');
    // eslint-disable-next-line no-eval
    const result = eval(sanitizedForEval);
    if (typeof result === 'number' && !isNaN(result)) {
      return String(parseFloat(result.toFixed(1)));
    }
    return formula; 
  } catch (e) {
    return formula;
  }
}

interface ProjectCabinetItem {
  id: string;
  templateId: string;
  templateName: string;
  quantity: number;
  width: number;
  height: number;
  depth: number;
}


export default function CabinetDesignerPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [dbTemplates, setDbTemplates] = React.useState<CabinetTemplateData[]>([]);
  const [selectableCabinetTypes, setSelectableCabinetTypes] = React.useState(initialHardcodedCabinetTypes);
  
  const [calculationInput, setCalculationInput] = React.useState<CabinetCalculationInput>({
    cabinetType: 'standard_base_2_door',
    width: defaultDims.width,
    height: defaultDims.height,
    depth: defaultDims.depth,
    customTemplate: undefined,
  });
  const [calculatedData, setCalculatedData] = React.useState<CalculatedCabinet | null>(null);
  const [calculationError, setCalculationError] = React.useState<string | null>(null);

  const [viewMode, setViewMode] = React.useState<'calculator' | 'templateDefinition'>('calculator');
  const [currentTemplate, setCurrentTemplate] = React.useState<CabinetTemplateData>(generateNewTemplatePlaceholder());
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = React.useState(false);

  const [drawerSetInput, setDrawerSetInput] = React.useState<DrawerSetCalculatorInput>({
    cabinetInternalHeight: 684, cabinetWidth: 564, numDrawers: 3, drawerReveal: 3,
    panelThickness: 18, drawerSlideClearanceTotal: 13, drawerBoxSideDepth: 500,
    drawerBoxSideHeight: 150, customDrawerFrontHeights: [],
  });
  const [drawerSetResult, setDrawerSetResult] = React.useState<DrawerSetCalculatorResult | null>(null);
  const [isCalculatingDrawers, setIsCalculatingDrawers] = React.useState(false);
  const [drawerCalcError, setDrawerCalcError] = React.useState<string | null>(null);
  
  const [projectCabinetItems, setProjectCabinetItems] = React.useState<ProjectCabinetItem[]>([]);

  const fetchAndSetTemplates = React.useCallback(async () => {
    try {
      const templatesFromDb = await getCabinetTemplatesAction();
      setDbTemplates(templatesFromDb);
      const combinedTypes = [
        ...initialHardcodedCabinetTypes,
        ...templatesFromDb.map(t => ({ value: t.id, label: `${t.name} (Custom DB)` }))
      ];
      setSelectableCabinetTypes(combinedTypes);
    } catch (error) {
      console.error("Failed to fetch cabinet templates:", error);
      toast({ title: "Error", description: "Could not load custom templates.", variant: "destructive" });
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAndSetTemplates();
  }, [fetchAndSetTemplates]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalculationInput(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleTypeChange = async (value: string) => {
    setCalculationInput(prev => {
        const newCalcInput: CabinetCalculationInput = { ...prev, cabinetType: value, customTemplate: undefined };
        const hardcodedType = initialHardcodedCabinetTypes.find(hct => hct.value === value);
        const dbType = dbTemplates.find(dbt => dbt.id === value);

        if (hardcodedType) {
            if (value === 'standard_base_2_door') {
                newCalcInput.width = defaultDims.width;
                newCalcInput.height = defaultDims.height;
                newCalcInput.depth = defaultDims.depth;
            } else if (value === 'base_cabinet_1_door_1_drawer') {
                newCalcInput.width = 600;
                newCalcInput.height = 720;
                newCalcInput.depth = 560;
                 newCalcInput.previewImage = "https://placehold.co/300x200/FADBD8/C0392B.png";
            } // Add other hardcoded defaults here
        } else if (dbType) { // This means it's a custom template from DB
            newCalcInput.customTemplate = dbType;
            newCalcInput.width = dbType.defaultDimensions.width;
            newCalcInput.height = dbType.defaultDimensions.height;
            newCalcInput.depth = dbType.defaultDimensions.depth;
        }
        return newCalcInput;
    });
    setCalculatedData(null);
    setCalculationError(null);
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    setCalculatedData(null);
    setCalculationError(null);

    if (calculationInput.width <= 0 || calculationInput.height <= 0 || calculationInput.depth <= 0) {
      toast({ title: "Invalid Dimensions", description: "Width, Height, and Depth must be positive numbers.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    let result;
    let templateToCalculateWith = calculationInput.customTemplate;

    // If customTemplate isn't set directly, try to load it from dbTemplates if it's a custom ID
    if (!templateToCalculateWith && !initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType)) {
        const foundDbTemplate = dbTemplates.find(dbt => dbt.id === calculationInput.cabinetType);
        if (foundDbTemplate) {
            templateToCalculateWith = foundDbTemplate;
        } else { // Try fetching from DB directly if not in local state (e.g., after save and re-select)
            const fetchedFromDb = await getCabinetTemplateByIdAction(calculationInput.cabinetType);
            if (fetchedFromDb) templateToCalculateWith = fetchedFromDb;
        }
    }
    
    if (templateToCalculateWith) {
        result = await calculateCabinetDetails({ ...calculationInput, customTemplate: templateToCalculateWith });
    } else if (initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType)) {
        // For hardcoded types, ensure customTemplate is undefined
        result = await calculateCabinetDetails({ ...calculationInput, customTemplate: undefined });
    } else {
      toast({
        title: "Calculation Not Implemented",
        description: `Calculation logic for "${calculationInput.cabinetType}" is not yet fully implemented or the template could not be loaded.`,
        variant: "default",
        duration: 7000,
      });
      setCalculationError(`Calculation logic for "${calculationInput.cabinetType}" is not available or template missing.`);
      setIsLoading(false);
      return;
    }

    if (result.success && result.data) {
      setCalculatedData(result.data);
      toast({ title: "Calculation Successful", description: "Cabinet parts and cost estimated." });
    } else {
      setCalculationError(result.error || "An unknown error occurred during calculation.");
      toast({ title: "Calculation Failed", description: result.error || "Could not calculate cabinet details.", variant: "destructive" });
    }
    setIsLoading(false);
  };
  
  const getPreviewImageSrc = () => {
    const selectedIsHardcoded = initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType);
    const selectedIsDbType = dbTemplates.some(dbt => dbt.id === calculationInput.cabinetType);

    if (selectedIsHardcoded) {
        switch(calculationInput.cabinetType) {
            case 'standard_base_2_door': return "https://placehold.co/300x200/EBF4FA/5DADE2.png";
            case 'wall_cabinet_1_door': return "https://placehold.co/300x200/D6EAF8/85C1E9.png";
            case 'tall_pantry_2_door': return "https://placehold.co/300x200/D1F2EB/76D7C4.png";
            case 'base_cabinet_1_door_1_drawer': return "https://placehold.co/300x200/FADBD8/C0392B.png";
            case 'corner_wall_cabinet': return "https://placehold.co/300x200/E8DAEF/C39BD3.png";
            default: return "https://placehold.co/300x200/EEEEEE/BDBDBD.png";
        }
    } else if (selectedIsDbType) {
        const template = dbTemplates.find(dbt => dbt.id === calculationInput.cabinetType);
        return template?.previewImage || "https://placehold.co/300x200/AEB6BF/566573.png";
    } else if (calculationInput.customTemplate?.previewImage) { // For a template being actively defined
        return calculationInput.customTemplate.previewImage;
    }
    return "https://placehold.co/300x200/EEEEEE/BDBDBD.png";
  }

  const getImageAiHint = () => {
    const selectedIsHardcoded = initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType);
    const selectedIsDbType = dbTemplates.some(dbt => dbt.id === calculationInput.cabinetType);

    if (selectedIsHardcoded) {
        switch(calculationInput.cabinetType) {
            case 'standard_base_2_door': return "base cabinet";
            case 'wall_cabinet_1_door': return "wall cabinet";
            case 'tall_pantry_2_door': return "pantry cabinet";
            case 'base_cabinet_1_door_1_drawer': return "drawer door";
            case 'corner_wall_cabinet': return "corner cabinet";
            default: return "cabinet furniture";
        }
    } else if (selectedIsDbType || calculationInput.customTemplate) {
        // Generic hint for custom templates, often drawer/door combos
        return "drawer door"; 
    }
    return "cabinet furniture";
  }


  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, path: string, partIndex?: number, field?: keyof PartDefinition | keyof PartDefinition['edgeBanding']) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;
    if (type === 'number') processedValue = parseFloat(value) || 0;
    if (type === 'checkbox' && field) {
        processedValue = (e.target as HTMLInputElement).checked;
    }

    setCurrentTemplate(prev => {
        const newTemplate = JSON.parse(JSON.stringify(prev));
        let target: any = newTemplate;
        const pathArray = path.split('.');

        for (let i = 0; i < pathArray.length - 1; i++) {
            const currentPathSegment = pathArray[i];
            if (currentPathSegment === 'parts' && partIndex !== undefined) {
                target = target[currentPathSegment][partIndex];
            } else {
                target = target[currentPathSegment];
            }
            if (!target) {
                console.error(`Path segment ${currentPathSegment} (index ${i}) not found in template path ${path}. Target became undefined.`);
                return prev;
            }
        }

        const finalKey = pathArray[pathArray.length -1];
        if (partIndex !== undefined && path.startsWith('parts.') && field) {
             if (finalKey === 'edgeBanding' && typeof field === 'string' && (field === 'front' || field === 'back' || field === 'top' || field === 'bottom')) {
                if (!target.edgeBanding) target.edgeBanding = {};
                target.edgeBanding = { ...target.edgeBanding, [field as keyof PartDefinition['edgeBanding']]: processedValue };
            } else if (target && finalKey !== 'edgeBanding') {
                 target[finalKey as keyof PartDefinition] = processedValue as any;
            }
        } else if (target) {
             target[finalKey] = processedValue;
        }
        return newTemplate;
    });
  };

  const handleFormulaSelect = (partIndex: number, formulaField: 'widthFormula' | 'heightFormula' | 'quantityFormula' | 'thicknessFormula', selectedFormulaValue: string) => {
    setCurrentTemplate(prev => {
        const newTemplate = JSON.parse(JSON.stringify(prev));
        if (newTemplate.parts && newTemplate.parts[partIndex]) {
            if (selectedFormulaValue === PREDEFINED_FORMULAS.find(f => f.key === 'CUSTOM')?.formula) { 
                (newTemplate.parts[partIndex] as any)[`${formulaField}Key`] = 'CUSTOM';
                (newTemplate.parts[partIndex] as any)[formulaField] = ""; 
            } else {
                const selectedFormula = PREDEFINED_FORMULAS.find(f => f.formula === selectedFormulaValue);
                (newTemplate.parts[partIndex] as any)[`${formulaField}Key`] = selectedFormula?.key;
                (newTemplate.parts[partIndex] as any)[formulaField] = selectedFormulaValue;
            }
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

  const handleSaveTemplate = async () => {
    setIsLoading(true);
    try {
        const result = await saveCabinetTemplateAction(currentTemplate);
        if (result.success && result.id) {
            toast({
                title: "Template Saved to Database",
                description: `Template "${currentTemplate.name}" has been saved.`,
                duration: 5000,
            });
            await fetchAndSetTemplates(); // Refresh the list of templates from DB
            setCalculationInput({ // Pre-select the newly saved template for calculation
                cabinetType: result.id,
                width: currentTemplate.defaultDimensions.width,
                height: currentTemplate.defaultDimensions.height,
                depth: currentTemplate.defaultDimensions.depth,
                customTemplate: currentTemplate, // Pass the full template data
            });
            setViewMode('calculator');
        } else {
            throw new Error(result.error || "Failed to save template to database.");
        }
    } catch (error) {
        console.error("Failed to save template:", error);
        toast({
            title: "Error Saving Template",
            description: (error instanceof Error ? error.message : "An unknown error occurred."),
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };


  const handleDrawerSetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "customDrawerFrontHeights") {
      setDrawerSetInput(prev => ({ ...prev, [name]: value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) }));
    } else {
      setDrawerSetInput(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
  };

  const handleCalculateDrawerSet = async () => {
    setIsCalculatingDrawers(true);
    setDrawerSetResult(null);
    setDrawerCalcError(null);
    try {
      const result = await calculateDrawerSet(drawerSetInput);
      setDrawerSetResult(result);
      if (!result.success) {
        setDrawerCalcError(result.message || "An unknown error occurred in drawer calculation.");
        toast({ title: "Drawer Calculation Warning", description: result.message || "Could not calculate drawer set components.", variant: "default" });
      } else {
         toast({ title: "Drawer Set Calculated", description: "Drawer components have been calculated." });
      }
    } catch (error) {
      console.error("Drawer calculation error:", error);
      const msg = error instanceof Error ? error.message : "Failed to calculate drawer set.";
      setDrawerCalcError(msg);
      toast({ title: "Drawer Calculation Failed", description: msg, variant: "destructive" });
    } finally {
      setIsCalculatingDrawers(false);
    }
  };


  const FormulaInputWithHelper = ({ partIndex, formulaField, label, placeholder }: { partIndex: number, formulaField: keyof PartDefinition, label: string, placeholder: string }) => {
      const currentFormulaKey = (currentTemplate.parts[partIndex] as any)[`${formulaField}Key`];
      const isCustom = currentFormulaKey === 'CUSTOM' || !PREDEFINED_FORMULAS.find(f => f.key === currentFormulaKey && (f.dimension === 'Width' ? formulaField === 'widthFormula' : f.dimension === 'Height' ? formulaField === 'heightFormula' : f.dimension === 'Quantity' ? formulaField === 'quantityFormula' : formulaField === 'thicknessFormula' ));
      const relevantFormulas = PREDEFINED_FORMULAS.filter(f => {
          const part = currentTemplate.parts[partIndex];
          if (!part) return false;
          const contextMatch = f.context === null || (part.cabinetContext && f.context.includes(part.cabinetContext));
          const partTypeMatch = Array.isArray(f.partType) ? f.partType.includes(part.partType) : f.partType === part.partType || f.partType.length === 0;
          const dimensionMatch = (f.dimension === 'Width' && formulaField === 'widthFormula') ||
                               (f.dimension === 'Height' && formulaField === 'heightFormula') ||
                               (f.dimension === 'Quantity' && formulaField === 'quantityFormula') ||
                               (f.dimension === 'Thickness' && formulaField === 'thicknessFormula');
          return contextMatch && partTypeMatch && dimensionMatch;
      }).sort((a,b) => a.name.localeCompare(b.name));


      return (
        <div className="flex items-end gap-2">
          <div className="flex-grow">
            <Label htmlFor={`part_${partIndex}_${formulaField}`}>{label}</Label>
            {(formulaField === 'widthFormula' || formulaField === 'heightFormula' || formulaField === 'quantityFormula' || formulaField === 'thicknessFormula') ? (
                <Textarea
                  id={`part_${partIndex}_${formulaField}`}
                  rows={1}
                  value={(currentTemplate.parts[partIndex] as any)[formulaField] || ''}
                  onChange={(e) => handleTemplateInputChange(e, `parts.${formulaField}`, partIndex, formulaField as keyof PartDefinition)}
                  placeholder={placeholder}
                  className="text-sm"
                  readOnly={!isCustom && formulaField !== 'quantityFormula' && formulaField !== 'thicknessFormula'}
                />
            ) : (
                 <Input
                    id={`part_${partIndex}_${formulaField}`}
                    value={(currentTemplate.parts[partIndex] as any)[formulaField] || ''}
                    onChange={(e) => handleTemplateInputChange(e, `parts.${formulaField}`, partIndex, formulaField as keyof PartDefinition)}
                    placeholder={placeholder}
                    className="text-sm"
                    readOnly={!isCustom}
                 />
            )}
          </div>
          {(formulaField === 'widthFormula' || formulaField === 'heightFormula' || formulaField === 'quantityFormula' || formulaField === 'thicknessFormula') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="whitespace-nowrap px-2">
                  <ChevronDown className="h-4 w-4" /> <span className="ml-1 text-xs">Ins</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
                {relevantFormulas.map((item) => (
                  <DropdownMenuItem key={item.key} onSelect={() => handleFormulaSelect(partIndex, formulaField as any, item.formula)} className="flex justify-between items-center">
                    <span className="text-xs">{item.name} ({item.formula})</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100">
                          <HelpCircle className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs text-xs p-2 bg-popover text-popover-foreground">
                        <p className="font-semibold">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.example}</p>
                      </TooltipContent>
                    </Tooltip>
                  </DropdownMenuItem>
                ))}
                 <DropdownMenuItem key="CUSTOM" onSelect={() => handleFormulaSelect(partIndex, formulaField as any, PREDEFINED_FORMULAS.find(f => f.key === 'CUSTOM')?.formula || "")} className="flex justify-between items-center">
                     <span className="text-xs">Custom Formula...</span>
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
  };

  const handleAddProjectItem = () => {
    const firstTemplateSelectable = selectableCabinetTypes[0];
    let initialWidth = defaultDims.width;
    let initialHeight = defaultDims.height;
    let initialDepth = defaultDims.depth;

    const firstTemplateData = dbTemplates.find(t => t.id === firstTemplateSelectable.value) || 
                             (firstTemplateSelectable.value === currentTemplate?.id ? currentTemplate : undefined);
    
    if (firstTemplateData) {
        initialWidth = firstTemplateData.defaultDimensions.width;
        initialHeight = firstTemplateData.defaultDimensions.height;
        initialDepth = firstTemplateData.defaultDimensions.depth;
    } else if (firstTemplateSelectable.value === 'standard_base_2_door') {
        // Default dims already set for this one
    } else if (firstTemplateSelectable.value === 'base_cabinet_1_door_1_drawer') {
        initialWidth = 600; initialHeight = 720; initialDepth = 560;
    }
    
    setProjectCabinetItems(prev => [
      ...prev,
      {
        id: `proj_item_${Date.now()}`,
        templateId: firstTemplateSelectable.value,
        templateName: firstTemplateSelectable.label,
        quantity: 1,
        width: initialWidth,
        height: initialHeight,
        depth: initialDepth,
      }
    ]);
  };

  const handleRemoveProjectItem = (itemId: string) => {
    setProjectCabinetItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleProjectItemChange = (itemId: string, field: keyof Omit<ProjectCabinetItem, 'id'|'templateName'>, value: string | number) => {
    setProjectCabinetItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'templateId') {
            const selectedTemplateInfo = selectableCabinetTypes.find(ct => ct.value === value);
            updatedItem.templateName = selectedTemplateInfo?.label || "Unknown Template";
            
            const newTemplateData = dbTemplates.find(t => t.id === value) || 
                                    (value === currentTemplate?.id ? currentTemplate : undefined);

            if (newTemplateData) {
                updatedItem.width = newTemplateData.defaultDimensions.width;
                updatedItem.height = newTemplateData.defaultDimensions.height;
                updatedItem.depth = newTemplateData.defaultDimensions.depth;
            } else if (selectedTemplateInfo?.value === 'standard_base_2_door') {
                updatedItem.width = defaultDims.width;
                updatedItem.height = defaultDims.height;
                updatedItem.depth = defaultDims.depth;
            } else if (selectedTemplateInfo?.value === 'base_cabinet_1_door_1_drawer') {
                updatedItem.width = 600; updatedItem.height = 720; updatedItem.depth = 560;
            } else {
                updatedItem.width = 600; updatedItem.height = 700; updatedItem.depth = 500;
            }
          }
          return updatedItem;
        }
        return item;
      })
    );
  };


  const renderCalculatorView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" />Configure Cabinet</CardTitle>
          <CardDescription>Select type and customize dimensions for individual calculation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button onClick={() => { 
              setCurrentTemplate(generateNewTemplatePlaceholder()); 
              setViewMode('templateDefinition'); 
            }} 
            variant="outline" className="w-full"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Define New Cabinet Template
          </Button>
          <Separator />
          <div>
            <Label htmlFor="cabinetType">Cabinet Type</Label>
            <Select value={calculationInput.cabinetType} onValueChange={handleTypeChange}>
              <SelectTrigger id="cabinetType"><SelectValue placeholder="Select a cabinet type" /></SelectTrigger>
              <SelectContent>{selectableCabinetTypes.map(type => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent>
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
          <CardDescription>Estimated parts, materials, and costs for the configured cabinet.</CardDescription>
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
                        <TableRow key={index}><TableCell>{part.name} ({part.partType})</TableCell><TableCell className="text-center">{part.quantity}</TableCell><TableCell className="text-right">{part.width.toFixed(0)}</TableCell><TableCell className="text-right">{part.height.toFixed(0)}</TableCell><TableCell className="text-center">{part.thickness}</TableCell><TableCell>{part.material}</TableCell>
                        <TableCell className="text-xs">
                          {part.edgeBanding && Object.entries(part.edgeBanding).filter(([, value]) => typeof value === 'number' && value > 0).map(([edge, length]) => `${edge.charAt(0).toUpperCase()}${edge.slice(1)}: ${ (length as number).toFixed(0)}mm`).join(', ')}
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
      
      <Card className="lg:col-span-3 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />Project Planner (Conceptual)</CardTitle>
          <CardDescription>
            Add cabinet instances to your project. Specify template, quantity, and dimensions for each.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectCabinetItems.map((item, index) => (
            <Card key={item.id} className="p-4 space-y-3 relative bg-muted/30">
               <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => handleRemoveProjectItem(item.id)}><XCircle className="h-4 w-4"/></Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2 md:col-span-2">
                  <Label htmlFor={`project_template_${item.id}`} className="text-xs">Cabinet Template</Label>
                  <Select
                    value={item.templateId}
                    onValueChange={(value) => handleProjectItemChange(item.id, 'templateId', value)}
                  >
                    <SelectTrigger id={`project_template_${item.id}`} className="h-9 text-xs">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableCabinetTypes.map(type => (
                        <SelectItem key={type.value} value={type.value} className="text-xs">{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor={`project_qty_${item.id}`} className="text-xs">Quantity</Label>
                  <Input
                    id={`project_qty_${item.id}`}
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleProjectItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="h-9 text-xs"
                    min={1}
                  />
                </div>
                <div>
                  <Label htmlFor={`project_width_${item.id}`} className="text-xs">Width (mm)</Label>
                  <Input
                    id={`project_width_${item.id}`}
                    type="number"
                    value={item.width}
                    onChange={(e) => handleProjectItemChange(item.id, 'width', parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`project_height_${item.id}`} className="text-xs">Height (mm)</Label>
                  <Input
                    id={`project_height_${item.id}`}
                    type="number"
                    value={item.height}
                    onChange={(e) => handleProjectItemChange(item.id, 'height', parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`project_depth_${item.id}`} className="text-xs">Depth (mm)</Label>
                  <Input
                    id={`project_depth_${item.id}`}
                    type="number"
                    value={item.depth}
                    onChange={(e) => handleProjectItemChange(item.id, 'depth', parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </Card>
          ))}
           <Button onClick={handleAddProjectItem} variant="outline" size="sm" className="mt-3">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Cabinet to Project
          </Button>
          <Separator className="my-4" />
          <Button className="w-full md:w-auto" disabled>
            Calculate Entire Project (Conceptual)
          </Button>
          <p className="text-xs text-muted-foreground">
            Note: Full project calculation (aggregating parts from all instances) is a planned feature.
            For now, use the 'Configure Cabinet' section above to calculate each unique configuration individually.
          </p>
        </CardContent>
      </Card>

    </div>
  );

 const renderTemplateDefinitionView = () => {
    const evalParams = {
        W: currentTemplate.defaultDimensions.width,
        H: currentTemplate.defaultDimensions.height,
        D: currentTemplate.defaultDimensions.depth,
        ...currentTemplate.parameters
    };

    return (
    <div className="space-y-6">
        <TooltipProvider>
            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><DraftingCompass className="mr-2 h-5 w-5 text-primary" />Define New Cabinet Template</CardTitle>
                <CardDescription>Specify the parameters, parts, formulas, and edge banding for your custom cabinet.</CardDescription>
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
                        <div><Label htmlFor="defaultWidth">Width (W)</Label><Input id="defaultWidth" name="width" type="number" value={currentTemplate.defaultDimensions.width} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.width')} /></div>
                        <div><Label htmlFor="defaultHeight">Height (H)</Label><Input id="defaultHeight" name="height" type="number" value={currentTemplate.defaultDimensions.height} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.height')} /></div>
                        <div><Label htmlFor="defaultDepth">Depth (D)</Label><Input id="defaultDepth" name="depth" type="number" value={currentTemplate.defaultDimensions.depth} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.depth')} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-lg">Global Parameters (mm)</CardTitle><CardDescription>Define variables to use in formulas (e.g., W - 2\*PT).</CardDescription></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {globalParameterUIDefinitions.map(({ key, displayName, tooltip }) => (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-1">
                                    <Label htmlFor={`param_${key}`}>{displayName}</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100 p-0">
                                                <HelpCircle className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs text-xs p-2">
                                            <p className="font-medium">{tooltip}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Input
                                    id={`param_${key}`}
                                    name={key}
                                    type="number"
                                    value={(currentTemplate.parameters as any)[key] || ''}
                                    onChange={(e) => handleTemplateInputChange(e, `parameters.${key}`)}
                                />
                            </div>
                        ))}
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
                                templateParameters={currentTemplate.parameters}
                            />
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {currentTemplate.parts.map((part, index) => {
                            const materialInfo = PREDEFINED_MATERIALS.find(m => m.id === part.materialId);
                            const grainText = part.grainDirection === 'with' ? 'With Grain' : part.grainDirection === 'reverse' ? 'Reverse Grain' : 'None';
                            
                            const calculatedHeight = evaluateFormulaClientSide(part.heightFormula, evalParams);
                            const calculatedWidth = evaluateFormulaClientSide(part.widthFormula, evalParams);
                            const calculatedThickness = evaluateFormulaClientSide(part.thicknessFormula, evalParams);
                            const calculatedQty = evaluateFormulaClientSide(part.quantityFormula, evalParams);

                            return (
                            <Card key={part.partId || index} className="p-4 relative bg-card/80">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => handleRemovePartFromTemplate(index)}><XCircle className="h-5 w-5"/></Button>
                                <div className="mb-2">
                                  <Input 
                                      id={`partName_${index}`} 
                                      value={part.nameLabel} 
                                      onChange={(e) => handleTemplateInputChange(e, 'parts.nameLabel', index, 'nameLabel')} 
                                      placeholder="e.g., Side Panel" 
                                      className="text-base font-medium"
                                  />
                                </div>
                                <div className="mb-3 p-2 border rounded-md bg-muted/30 text-xs space-y-0.5">
                                    <p><span className="font-medium">Type:</span> {part.partType} ({part.cabinetContext || 'General'})</p>
                                    <p>
                                        <span className="font-medium">Calculated Dim. (H x W x T):</span> 
                                        {` ${calculatedHeight}${isNaN(Number(calculatedHeight)) ? '' : 'mm'} x ${calculatedWidth}${isNaN(Number(calculatedWidth)) ? '' : 'mm'} x ${calculatedThickness}${isNaN(Number(calculatedThickness)) ? '' : 'mm'}`}
                                        <span className="text-muted-foreground text-[10px] block">
                                          (Formulas: {part.heightFormula || 'N/A'} x {part.widthFormula || 'N/A'} x {part.thicknessFormula || 'N/A'})
                                        </span>
                                    </p>
                                    <p><span className="font-medium">Calculated Qty:</span> {calculatedQty} <span className="text-muted-foreground text-[10px]">(Formula: {part.quantityFormula})</span></p>
                                    <p><span className="font-medium">Material:</span> {materialInfo?.name || part.materialId}{materialInfo?.hasGrain ? " (Grain)" : ""}</p>
                                    <p><span className="font-medium">Grain:</span> {grainText}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-start">
                                    <FormulaInputWithHelper partIndex={index} formulaField="quantityFormula" label="Quantity Formula" placeholder="e.g., 2"/>
                                    <FormulaInputWithHelper partIndex={index} formulaField="widthFormula" label="Width Formula" placeholder="e.g., D or W - 2*PT"/>
                                    <FormulaInputWithHelper partIndex={index} formulaField="heightFormula" label="Height Formula" placeholder="e.g., H or D - BPO"/>

                                    <div>
                                        <Label>Material ID</Label>
                                        <Select
                                            value={part.materialId}
                                            onValueChange={(value) => handleTemplateInputChange({ target: { name: 'materialId', value }} as any, 'parts.materialId', index, 'materialId')}
                                        >
                                            <SelectTrigger className="text-sm"><SelectValue placeholder="Select material" /></SelectTrigger>
                                            <SelectContent>
                                                {PREDEFINED_MATERIALS.map((material) => (
                                                    <SelectItem key={material.id} value={material.id}>
                                                        {material.name} {material.hasGrain ? "(Grain)" : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <FormulaInputWithHelper partIndex={index} formulaField="thicknessFormula" label="Thickness Formula" placeholder="e.g., PT or 18"/>

                                    <div>
                                        <Label>Grain Direction</Label>
                                        <Select
                                            value={part.grainDirection || 'none'}
                                            onValueChange={(value) => handleTemplateInputChange({ target: { name: 'grainDirection', value: value === 'none' ? null : value }} as any, 'parts.grainDirection', index, 'grainDirection')}
                                        >
                                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
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
                                        For typical panels: "Top" & "Bottom" refer to edges along Width dimension. "Front" & "Back" refer to edges along Height dimension. Adjust interpretation based on part type.
                                    </p>
                                </div>
                                
                                <div className="mt-3">
                                    <Label className="font-medium">Part Notes:</Label>
                                    <Textarea 
                                        value={part.notes || ''} 
                                        onChange={(e) => handleTemplateInputChange(e, 'parts.notes', index, 'notes')} 
                                        rows={2} 
                                        className="text-sm"
                                        placeholder="Optional notes specific to this part in the template..."
                                    />
                                </div>
                            </Card>
                        )})}
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
                <Button onClick={handleSaveTemplate} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Template to Database
                </Button>
            </CardFooter>
            </Card>
        </TooltipProvider>

        {(currentTemplate.type === 'base' || currentTemplate.type === 'tall' || currentTemplate.type === 'custom') && (
            <Card className="shadow-lg">
                <CardHeader>
                <CardTitle className="flex items-center"><BoxSelect className="mr-2 h-5 w-5 text-primary" />Drawer Set Calculator</CardTitle>
                <CardDescription>Helper tool to calculate drawer components for your cabinet template. These parts would then need to be added to the 'Part Definitions' above manually for now.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><Label htmlFor="ds_cabInternalHeight">Cabinet Internal Height (mm)</Label><Input id="ds_cabInternalHeight" name="cabinetInternalHeight" type="number" value={drawerSetInput.cabinetInternalHeight} onChange={handleDrawerSetInputChange} placeholder="e.g., 684"/></div>
                    <div><Label htmlFor="ds_cabWidth">Cabinet Width (mm)</Label><Input id="ds_cabWidth" name="cabinetWidth" type="number" value={drawerSetInput.cabinetWidth} onChange={handleDrawerSetInputChange} placeholder="e.g., 564"/></div>
                    <div><Label htmlFor="ds_numDrawers">Number of Drawers</Label><Input id="ds_numDrawers" name="numDrawers" type="number" value={drawerSetInput.numDrawers} onChange={handleDrawerSetInputChange} placeholder="e.g., 3"/></div>
                    <div><Label htmlFor="ds_drawerReveal">Drawer Reveal (mm)</Label><Input id="ds_drawerReveal" name="drawerReveal" type="number" value={drawerSetInput.drawerReveal} onChange={handleDrawerSetInputChange} placeholder="e.g., 3"/></div>
                    <div><Label htmlFor="ds_panelThickness">Panel Thickness (T, mm)</Label><Input id="ds_panelThickness" name="panelThickness" type="number" value={drawerSetInput.panelThickness} onChange={handleDrawerSetInputChange} placeholder="e.g., 18"/></div>
                    <div><Label htmlFor="ds_slideClearance">Total Slide Clearance (mm)</Label><Input id="ds_slideClearance" name="drawerSlideClearanceTotal" type="number" value={drawerSetInput.drawerSlideClearanceTotal} onChange={handleDrawerSetInputChange} placeholder="e.g., 13"/></div>
                    <div><Label htmlFor="ds_boxSideDepth">Drawer Box Side Depth (mm)</Label><Input id="ds_boxSideDepth" name="drawerBoxSideDepth" type="number" value={drawerSetInput.drawerBoxSideDepth} onChange={handleDrawerSetInputChange} placeholder="e.g., 500"/></div>
                    <div><Label htmlFor="ds_boxSideHeight">Drawer Box Side Height (mm)</Label><Input id="ds_boxSideHeight" name="drawerBoxSideHeight" type="number" value={drawerSetInput.drawerBoxSideHeight} onChange={handleDrawerSetInputChange} placeholder="e.g., 150"/></div>
                    <div className="lg:col-span-3"><Label htmlFor="ds_customFronts">Custom Drawer Front Heights (mm, comma-separated, optional)</Label><Input id="ds_customFronts" name="customDrawerFrontHeights" type="text" value={drawerSetInput.customDrawerFrontHeights?.join(', ') || ''} onChange={handleDrawerSetInputChange} placeholder="e.g., 100, 150, 200"/></div>
                </div>
                <Button onClick={handleCalculateDrawerSet} className="w-full md:w-auto" disabled={isCalculatingDrawers}>
                    {isCalculatingDrawers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    {isCalculatingDrawers ? "Calculating Drawers..." : "Calculate Drawer Set Components"}
                </Button>

                {isCalculatingDrawers && (<div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Calculating drawer parts...</p></div>)}
                {drawerCalcError && !isCalculatingDrawers && (
                    <div className="text-destructive bg-destructive/10 p-3 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4"/> {drawerCalcError}
                    </div>
                )}
                {drawerSetResult && drawerSetResult.success && drawerSetResult.calculatedDrawers.length > 0 && !isCalculatingDrawers && (
                    <div className="space-y-4 mt-4">
                    <h3 className="text-md font-semibold">Calculated Drawer Components:</h3>
                    {drawerSetResult.cabinetInternalHeight && drawerSetResult.totalFrontsHeightWithReveals && (
                        <p className="text-xs text-muted-foreground">
                            Total height used by fronts + reveals: {drawerSetResult.totalFrontsHeightWithReveals.toFixed(1)}mm (Cabinet internal height: {drawerSetResult.cabinetInternalHeight.toFixed(1)}mm)
                        </p>
                    )}
                    {drawerSetResult.calculatedDrawers.map((drawer: SingleCalculatedDrawer) => (
                        <Card key={drawer.drawerNumber} className="bg-muted/30">
                        <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-base">Drawer {drawer.drawerNumber}</CardTitle>
                            <CardDescription className="text-xs">Front Height: {drawer.overallFrontHeight.toFixed(1)}mm, Box Side Height: {drawer.boxHeight.toFixed(1)}mm</CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <Table className="text-xs">
                            <TableHeader><TableRow><TableHead>Part Name</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Width (mm)</TableHead><TableHead className="text-right">Height (mm)</TableHead><TableHead className="text-center">Thick (mm)</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {drawer.parts.map(part => (
                                <TableRow key={part.name}>
                                    <TableCell>{part.name}</TableCell>
                                    <TableCell className="text-center">{part.quantity}</TableCell>
                                    <TableCell className="text-right">{part.width.toFixed(1)}</TableCell>
                                    <TableCell className="text-right">{part.height.toFixed(1)}</TableCell>
                                    <TableCell className="text-center">{part.thickness.toFixed(0)}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                        </CardContent>
                        </Card>
                    ))}
                    </div>
                )}
                {!isCalculatingDrawers && !drawerSetResult && !drawerCalcError && (<div className="text-center py-6 text-muted-foreground text-sm">Enter drawer parameters and click "Calculate Drawer Set Components".</div>)}
                </CardContent>
            </Card>
        )}
    </div>
    );
  }

  return (
    <TooltipProvider> 
      <PageHeader
        title="Cabinet Designer"
        description={viewMode === 'calculator' ? "Configure cabinet modules, calculate parts, and estimate costs." : "Define a new parametric cabinet template."}
      />
      {viewMode === 'calculator' ? renderCalculatorView() : renderTemplateDefinitionView()}
    </TooltipProvider>
  );
}
    
