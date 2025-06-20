
"use client";

import * as React from 'react';
import Image from 'next/image';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { Library, Settings2, Loader2, Calculator, Palette, PackagePlus, PlusCircle, Save, XCircle, DraftingCompass, HelpCircle, ChevronDown, BookOpen, BoxSelect, AlertCircle, ListChecks, Trash2, Wrench, Construction, Hammer, Edit2, List, SendToBack, UploadCloud, SheetIcon } from 'lucide-react';
import {
    calculateCabinetDetails, calculateDrawerSet, saveCabinetTemplateAction, getCabinetTemplatesAction, getCabinetTemplateByIdAction, deleteCabinetTemplateAction,
    getMaterialDefinitionsAction, getAccessoryDefinitionsAction, getCustomFormulasAction, saveCustomFormulaAction
} from './actions';
import type {
    CabinetCalculationInput, CalculatedCabinet, CabinetPart, CabinetTemplateData, PartDefinition, CabinetPartType, CabinetTypeContext,
    DrawerSetCalculatorInput, DrawerSetCalculatorResult, CalculatedDrawer as SingleCalculatedDrawer, TemplateAccessoryEntry,
    MaterialDefinitionDB, AccessoryDefinitionDB, PredefinedMaterialSimple, PredefinedAccessory, SelectItem as GenericSelectItem, AccessoryItem,
    InputPart, NestingJob, CustomFormulaEntry, FormulaDimensionType
} from './types';
import { PREDEFINED_MATERIALS, PREDEFINED_ACCESSORIES } from './types';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddPartDialog } from '@/components/cabinet-designer/add-part-dialog';
import { AddMaterialTypeDialog } from '@/components/cabinet-designer/add-material-type-dialog';
import { AddAccessoryTypeDialog } from '@/components/cabinet-designer/add-accessory-type-dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PREDEFINED_FORMULAS } from './predefined-formulas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';


const initialHardcodedCabinetTypes = [
  { value: 'standard_base_2_door', label: 'Standard Base Cabinet - 2 Door (600x720x560mm default)' },
];

const defaultDims = { width: 600, height: 720, depth: 560 };
const NO_EDGE_BANDING_PLACEHOLDER = "__NO_EDGE_BAND__";

const generateNewTemplatePlaceholder = (): CabinetTemplateData => ({
  id: crypto.randomUUID(),
  name: 'My New Custom Cabinet',
  type: 'custom',
  previewImage: 'https://placehold.co/300x200/FADBD8/C0392B.png',
  defaultDimensions: { width: 600, height: 700, depth: 500 },
  parameters: { PT: 18, BPT: 3, BPO: 10, DG: 2, DCG: 3, TRD: 80, DW: 500, DD: 450, DH: 150, Clearance: 13 },
  parts: [],
  accessories: [],
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
});


function evaluateFormulaClientSide(
  formula: string | undefined,
  params: { W: number; H: number; D: number; [key: string]: number | undefined }
): string {
  if (typeof formula !== 'string' || !formula.trim()) return 'N/A';
  try {
    const { W, H, D, ...templateParams } = params;
    const evalScope = { W, H, D, ...templateParams };
    let formulaToEvaluate = formula;
    for (const key in evalScope) {
      if (evalScope[key] !== undefined && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        formulaToEvaluate = formulaToEvaluate.replace(regex, String(evalScope[key]));
      }
    }
    const unresolvedParamsRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    let match;
    let hasUnresolved = false;
    while ((match = unresolvedParamsRegex.exec(formulaToEvaluate)) !== null) {
      if (!/^(?:Math|abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan)$/i.test(match[0]) && isNaN(Number(match[0]))) {
        if (Object.keys(templateParams).includes(match[0])) {
          hasUnresolved = true;
          break;
        }
      }
    }
    if (hasUnresolved) return formula;
    // eslint-disable-next-line no-eval
    const result = eval(formulaToEvaluate.replace(/[^0-9.+\-*/\s()]/g, ''));
    if (typeof result === 'number' && !isNaN(result)) return String(parseFloat(result.toFixed(1)));
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

interface ProjectCalculationResult {
  totalCost: number;
  totalPanelArea: number;
  totalBackPanelArea: number;
  individualCabinetResults: Array<{ name: string; cost: number; quantity: number }>;
  aggregatedParts: CabinetPart[];
  aggregatedAccessories: AccessoryItem[];
}

export default function CabinetDesignerPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [dbTemplates, setDbTemplates] = React.useState<CabinetTemplateData[]>([]);
  const [selectableCabinetTypes, setSelectableCabinetTypes] = React.useState(initialHardcodedCabinetTypes);
  const [calculationInput, setCalculationInput] = React.useState<CabinetCalculationInput>({
    cabinetType: 'standard_base_2_door',
    width: defaultDims.width, height: defaultDims.height, depth: defaultDims.depth,
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
  const [projectCalculationResult, setProjectCalculationResult] = React.useState<ProjectCalculationResult | null>(null);
  const [isCalculatingProject, setIsCalculatingProject] = React.useState(false);
  const [latestCalculatedProjectPartsForNesting, setLatestCalculatedProjectPartsForNesting] = React.useState<InputPart[]>([]);
  const [customNestingJobName, setCustomNestingJobName] = React.useState<string>("");


  const [customMaterialTypes, setCustomMaterialTypes] = React.useState<MaterialDefinitionDB[]>([]);
  const [customAccessoryTypes, setCustomAccessoryTypes] = React.useState<AccessoryDefinitionDB[]>([]);
  const [globalCustomFormulas, setGlobalCustomFormulas] = React.useState<CustomFormulaEntry[]>([]);
  const [isMaterialDialogOp, setIsMaterialDialogOp] = React.useState(false);
  const [isAccessoryDialogOp, setIsAccessoryDialogOp] = React.useState(false);
  const [templateToDelete, setTemplateToDelete] = React.useState<CabinetTemplateData | null>(null);


  const fetchAndSetTemplates = React.useCallback(async () => {
    try {
      const templatesFromDb = await getCabinetTemplatesAction();
      setDbTemplates(templatesFromDb);
      const combinedTypes = [
        ...initialHardcodedCabinetTypes,
        ...templatesFromDb.map(t => ({ value: t.id, label: `${t.name} (Custom DB)` }))
      ];
      setSelectableCabinetTypes(combinedTypes);
      return templatesFromDb;
    } catch (error) {
      console.error("Failed to fetch cabinet templates:", error);
      toast({ title: "Error", description: "Could not load custom templates.", variant: "destructive" });
      return [];
    }
  }, [toast]);

  const fetchCustomDefinitionsAndFormulas = React.useCallback(async () => {
    try {
      const [materials, accessories, formulas] = await Promise.all([
        getMaterialDefinitionsAction(),
        getAccessoryDefinitionsAction(),
        getCustomFormulasAction(),
      ]);
      setCustomMaterialTypes(materials);
      setCustomAccessoryTypes(accessories);
      setGlobalCustomFormulas(formulas);
    } catch (error) {
      console.error("Failed to fetch custom definitions/formulas:", error);
      toast({ title: "Error", description: "Could not load custom types or formulas.", variant: "destructive" });
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAndSetTemplates();
    fetchCustomDefinitionsAndFormulas();
  }, [fetchAndSetTemplates, fetchCustomDefinitionsAndFormulas]);

  const combinedMaterialOptions = React.useMemo((): GenericSelectItem[] => {
    const predefined = PREDEFINED_MATERIALS.map(m => ({ 
        value: m.id, 
        label: `${m.name}${m.hasGrain ? " (Grain)" : ""}${m.thickness ? ` - ${m.thickness}mm` : ''}`,
        type: m.id.startsWith("EDGE_") ? "edge_band" : "panel" 
    }));
    const custom = customMaterialTypes.map(m => ({ 
        value: m.id, 
        label: `${m.name}${m.hasGrain ? " (Grain)" : ""}${m.thickness ? ` - ${m.thickness}mm` : ''}`,
        type: m.type
    }));
    return [...predefined, ...custom].sort((a, b) => a.label.localeCompare(b.label));
  }, [customMaterialTypes]);


  const combinedAccessoryOptions = React.useMemo((): GenericSelectItem[] => {
    const predefined = PREDEFINED_ACCESSORIES.map(a => ({ value: a.id, label: `${a.name} ($${a.unitCost.toFixed(2)})` }));
    const custom = customAccessoryTypes.map(a => ({ value: a.id, label: `${a.name} ($${a.unitCost.toFixed(2)})` }));
    return [...predefined, ...custom].sort((a, b) => a.label.localeCompare(b.label));
  }, [customAccessoryTypes]);


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
                newCalcInput.width = defaultDims.width; newCalcInput.height = defaultDims.height; newCalcInput.depth = defaultDims.depth;
            }
        } else if (dbType) {
            newCalcInput.customTemplate = dbType;
            newCalcInput.width = dbType.defaultDimensions.width; newCalcInput.height = dbType.defaultDimensions.height; newCalcInput.depth = dbType.defaultDimensions.depth;
        }
        return newCalcInput;
    });
    setCalculatedData(null); setCalculationError(null);
  };

  const handleCalculate = async () => {
    setIsLoading(true); setCalculatedData(null); setCalculationError(null);
    if (calculationInput.width <= 0 || calculationInput.height <= 0 || calculationInput.depth <= 0) {
      toast({ title: "Invalid Dimensions", description: "Width, Height, and Depth must be positive numbers.", variant: "destructive" });
      setIsLoading(false); return;
    }
    let result;
    let templateToCalculateWith = calculationInput.customTemplate;
    if (!templateToCalculateWith && !initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType)) {
        const foundDbTemplate = dbTemplates.find(dbt => dbt.id === calculationInput.cabinetType);
        if (foundDbTemplate) {
            templateToCalculateWith = foundDbTemplate;
            if (!calculationInput.customTemplate || calculationInput.customTemplate.id !== foundDbTemplate.id) {
                 setCalculationInput(prev => ({...prev, customTemplate: foundDbTemplate}));
            }
        } else {
            const fetchedFromDb = await getCabinetTemplateByIdAction(calculationInput.cabinetType);
            if (fetchedFromDb) {
                 templateToCalculateWith = fetchedFromDb;
                 setCalculationInput(prev => ({...prev, customTemplate: fetchedFromDb}));
            }
        }
    }
    if (templateToCalculateWith) result = await calculateCabinetDetails({ ...calculationInput, customTemplate: templateToCalculateWith });
    else if (initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType)) result = await calculateCabinetDetails({ ...calculationInput, customTemplate: undefined });
    else {
      toast({ title: "Calculation Error", description: `Could not find definition for "${calculationInput.cabinetType}". Try selecting again.`, variant: "destructive", duration: 7000 });
      setCalculationError(`Calculation logic for "${calculationInput.cabinetType}" is not available or template missing.`);
      setIsLoading(false); return;
    }
    if (result.success && result.data) {
      setCalculatedData(result.data);
      toast({ title: "Calculation Successful", description: "Cabinet parts and cost estimated." });
    } else {
      setCalculationError(result.error || "An unknown error occurred.");
      toast({ title: "Calculation Failed", description: result.error || "Could not calculate details.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const getPreviewImageSrc = () => {
    const selectedIsHardcoded = initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType);
    if (calculationInput.customTemplate?.previewImage) return calculationInput.customTemplate.previewImage;
    const dbTemplate = dbTemplates.find(dbt => dbt.id === calculationInput.cabinetType);
    if (dbTemplate?.previewImage) return dbTemplate.previewImage;
    if (selectedIsHardcoded) {
        switch(calculationInput.cabinetType) {
            case 'standard_base_2_door': return "https://placehold.co/300x200/EBF4FA/5DADE2.png";
            default: return "https://placehold.co/300x200/EEEEEE/BDBDBD.png";
        }
    }
    return "https://placehold.co/300x200/EEEEEE/BDBDBD.png";
  };

  const getImageAiHint = () => {
    if (calculationInput.customTemplate) return "custom cabinet";
    const dbTemplate = dbTemplates.find(dbt => dbt.id === calculationInput.cabinetType);
    if (dbTemplate) return "custom cabinet";
    if (initialHardcodedCabinetTypes.some(hct => hct.value === calculationInput.cabinetType)) {
        switch(calculationInput.cabinetType) {
            case 'standard_base_2_door': return "base cabinet";
            default: return "cabinet furniture";
        }
    }
    return "cabinet furniture";
  };

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, path: string, partIndex?: number, field?: keyof PartDefinition | keyof PartDefinition['edgeBanding']) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean | null = value;
    if (type === 'number') processedValue = parseFloat(value) || 0;
    if (type === 'checkbox' && field) {
        processedValue = (e.target as HTMLInputElement).checked;
         setCurrentTemplate(prev => {
            const newTemplate = JSON.parse(JSON.stringify(prev));
            if (partIndex !== undefined && newTemplate.parts[partIndex]) {
                if (!newTemplate.parts[partIndex].edgeBanding) newTemplate.parts[partIndex].edgeBanding = {};
                (newTemplate.parts[partIndex].edgeBanding as any)[field as keyof PartDefinition['edgeBanding']] = processedValue;
            }
            return newTemplate;
        }); return;
    }
    setCurrentTemplate(prev => {
        const newTemplate = JSON.parse(JSON.stringify(prev));
        let target: any = newTemplate;
        const pathArray = path.split('.');
        for (let i = 0; i < pathArray.length - 1; i++) {
            const currentPathSegment = pathArray[i];
            if (currentPathSegment === 'parts' && partIndex !== undefined) target = target[currentPathSegment][partIndex];
            else if (currentPathSegment.match(/^accessories\[(\d+)\]$/)) {
                 const arrIndex = parseInt(currentPathSegment.match(/^accessories\[(\d+)\]$/)![1], 10);
                 target = target.accessories[arrIndex];
            } else target = target[currentPathSegment];
            if (!target && i < pathArray.length -1) { console.error(`Path segment ${currentPathSegment} not found.`); return prev; }
        }
        const finalKey = pathArray[pathArray.length -1];
        if(target) {
            if (finalKey === 'edgeBandingMaterialId' && processedValue === NO_EDGE_BANDING_PLACEHOLDER) {
                target[finalKey] = null;
            } else {
                target[finalKey] = processedValue;
            }
        }
        else console.error(`Final target for path ${path} is undefined.`);
        return newTemplate;
    });
  };

  const handleFormulaSelect = (partIndex: number, formulaField: 'widthFormula' | 'heightFormula' | 'quantityFormula', selectedFormulaValue: string) => {
    setCurrentTemplate(prev => {
        const newTemplate = JSON.parse(JSON.stringify(prev));
        if (newTemplate.parts && newTemplate.parts[partIndex]) {
            (newTemplate.parts[partIndex] as any)[formulaField] = selectedFormulaValue;
            const isPredefined = PREDEFINED_FORMULAS.find(f => f.formula === selectedFormulaValue &&
                ( (f.dimension === 'Width' && formulaField === 'widthFormula') ||
                  (f.dimension === 'Height' && formulaField === 'heightFormula') ||
                  (f.dimension === 'Quantity' && formulaField === 'quantityFormula') )
            );
            const isGlobalCustom = globalCustomFormulas.find(f => f.formulaString === selectedFormulaValue &&
                 ( (f.dimensionType === 'Width' && formulaField === 'widthFormula') ||
                   (f.dimensionType === 'Height' && formulaField === 'heightFormula') ||
                   (f.dimensionType === 'Quantity' && formulaField === 'quantityFormula') )
            );

            if (isPredefined) {
                (newTemplate.parts[partIndex] as any)[`${formulaField}Key`] = isPredefined.key;
            } else if (isGlobalCustom || selectedFormulaValue === PREDEFINED_FORMULAS.find(f => f.key === 'CUSTOM')?.formula) {
                (newTemplate.parts[partIndex] as any)[`${formulaField}Key`] = 'CUSTOM';
                 if (selectedFormulaValue === PREDEFINED_FORMULAS.find(f => f.key === 'CUSTOM')?.formula) {
                    (newTemplate.parts[partIndex] as any)[formulaField] = "";
                 }
            } else {
                 (newTemplate.parts[partIndex] as any)[`${formulaField}Key`] = 'CUSTOM';
                 if (selectedFormulaValue === "") {
                    (newTemplate.parts[partIndex] as any)[formulaField] = "";
                 }
            }
        } else console.error(`Part at index ${partIndex} not found.`);
        return newTemplate;
    });
  };


  const handleAddPartToTemplate = (newPart: PartDefinition) => {
    setCurrentTemplate(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
  };

  const handleRemovePartFromTemplate = (partIndex: number) => {
    setCurrentTemplate(prev => ({ ...prev, parts: prev.parts.filter((_, index) => index !== partIndex) }));
  };

  const handleSaveTemplate = async () => {
    setIsLoading(true);
    try {
        const result = await saveCabinetTemplateAction(currentTemplate);
        if (result.success && result.id) {
            toast({ title: "Template Saved to Database", description: `Template "${currentTemplate.name}" (ID: ${result.id}) saved.` });
            const updatedTemplates = await fetchAndSetTemplates();
            const savedFullTemplate = updatedTemplates.find(t => t.id === result.id) || currentTemplate;
            setCalculationInput({
                cabinetType: result.id, width: savedFullTemplate.defaultDimensions.width, height: savedFullTemplate.defaultDimensions.height,
                depth: savedFullTemplate.defaultDimensions.depth, customTemplate: savedFullTemplate,
            });
            setViewMode('calculator');
        } else throw new Error(result.error || "Failed to save template to database.");
    } catch (error) {
        console.error("Failed to save template:", error);
        toast({ title: "Error Saving Template", description: (error instanceof Error ? error.message : "Unknown error."), variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleEditSelectedTemplate = () => {
    if (calculationInput.customTemplate) {
        setCurrentTemplate(calculationInput.customTemplate);
        setViewMode('templateDefinition');
    } else if (dbTemplates.find(t => t.id === calculationInput.cabinetType)) {
        const templateToEdit = dbTemplates.find(t => t.id === calculationInput.cabinetType);
        if (templateToEdit) {
            setCurrentTemplate(templateToEdit);
            setViewMode('templateDefinition');
        } else {
            toast({ title: "Error", description: "Could not load selected template for editing.", variant: "destructive" });
        }
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsLoading(true);
    try {
      await deleteCabinetTemplateAction(templateToDelete.id);
      toast({ title: "Template Deleted", description: `Template "${templateToDelete.name}" has been deleted.` });
      setTemplateToDelete(null);
      await fetchAndSetTemplates();
      if (calculationInput.cabinetType === templateToDelete.id) {
        setCalculationInput({
          cabinetType: 'standard_base_2_door',
          width: defaultDims.width, height: defaultDims.height, depth: defaultDims.depth,
          customTemplate: undefined,
        });
        setCalculatedData(null);
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({ title: "Error Deleting Template", description: (error instanceof Error ? error.message : "Unknown error."), variant: "destructive" });
    } finally { setIsLoading(false); }
  };


  const handleAddAccessoryToTemplate = () => {
    setCurrentTemplate(prev => {
      const newAccessory: TemplateAccessoryEntry = {
        id: `acc_${Date.now()}`, accessoryId: combinedAccessoryOptions[0]?.value || '', quantityFormula: "1", notes: "",
      };
      return { ...prev, accessories: [...(prev.accessories || []), newAccessory] };
    });
  };

  const handleRemoveAccessoryFromTemplate = (accessoryEntryId: string) => {
    setCurrentTemplate(prev => ({ ...prev, accessories: (prev.accessories || []).filter(acc => acc.id !== accessoryEntryId) }));
  };

  const handleAccessoryInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, accessoryIndex: number, field: keyof TemplateAccessoryEntry) => {
    setCurrentTemplate(prev => {
      const newTemplate = JSON.parse(JSON.stringify(prev));
      if (newTemplate.accessories && newTemplate.accessories[accessoryIndex]) {
        if (typeof e === 'string') (newTemplate.accessories[accessoryIndex] as any)[field] = e;
        else (newTemplate.accessories[accessoryIndex] as any)[field] = e.target.value;
      }
      return newTemplate;
    });
  };

  const handleDrawerSetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "customDrawerFrontHeights") setDrawerSetInput(prev => ({ ...prev, [name]: value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) }));
    else setDrawerSetInput(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleCalculateDrawerSet = async () => {
    setIsCalculatingDrawers(true); setDrawerSetResult(null); setDrawerCalcError(null);
    try {
      const result = await calculateDrawerSet(drawerSetInput);
      setDrawerSetResult(result);
      if (!result.success) {
        setDrawerCalcError(result.message || "Unknown error in drawer calculation.");
        toast({ title: "Drawer Calculation Warning", description: result.message || "Could not calculate components.", variant: "default" });
      } else toast({ title: "Drawer Set Calculated", description: "Drawer components calculated." });
    } catch (error) {
      console.error("Drawer calculation error:", error);
      const msg = error instanceof Error ? error.message : "Failed to calculate.";
      setDrawerCalcError(msg); toast({ title: "Drawer Calculation Failed", description: msg, variant: "destructive" });
    } finally { setIsCalculatingDrawers(false); }
  };

  const FormulaInputWithHelper = ({ partIndex, formulaField, label, placeholder, customDbFormulas, onRefreshGlobalFormulas }: { partIndex: number, formulaField: 'widthFormula' | 'heightFormula' | 'quantityFormula', label: string, placeholder: string, customDbFormulas: CustomFormulaEntry[], onRefreshGlobalFormulas: () => void }) => {
      const currentFormulaKey = (currentTemplate.parts[partIndex] as any)[`${formulaField}Key`];
      const currentFormulaValue = (currentTemplate.parts[partIndex] as any)[formulaField] || "";
      const isCustomEntryMode = currentFormulaKey === 'CUSTOM';

      let relevantFormulas = PREDEFINED_FORMULAS.filter(f => {
          const part = currentTemplate.parts[partIndex];
          if (!part) return false;
          const contextMatch = f.context === null || (part.cabinetContext && f.context.includes(part.cabinetContext));
          const partTypeMatch = Array.isArray(f.partType) ? f.partType.includes(part.partType) : f.partType === part.partType || f.partType.length === 0;
          const dimensionMatch = (f.dimension === 'Width' && formulaField === 'widthFormula') || (f.dimension === 'Height' && formulaField === 'heightFormula') || (f.dimension === 'Quantity' && formulaField === 'quantityFormula');
          return contextMatch && partTypeMatch && dimensionMatch;
      }).map(f => ({ ...f, type: 'predefined' as const, id: f.key }));

      const relevantCustomDbFormulas = customDbFormulas.filter(f =>
           (f.dimensionType === 'Width' && formulaField === 'widthFormula') ||
           (f.dimensionType === 'Height' && formulaField === 'heightFormula') ||
           (f.dimensionType === 'Quantity' && formulaField === 'quantityFormula')
      ).map(f => ({
          id: f.id, key: f.id, name: `${f.name} (DB)`, formula: f.formulaString,
          description: f.description || 'User-defined custom formula.',
          example: `Custom Formula: ${f.formulaString}`, type: 'custom_db' as const,
          partType: [], context: null, dimension: f.dimensionType
      }));

      const combinedFormulas = [...relevantFormulas, ...relevantCustomDbFormulas].sort((a,b) => a.name.localeCompare(b.name));

      const handleSaveGlobal = async () => {
        const formulaToSave = (currentTemplate.parts[partIndex] as any)[formulaField];
        if (!formulaToSave || !formulaToSave.trim()) {
            toast({title: "Empty Formula", description: "Cannot save an empty formula globally.", variant: "default"});
            return;
        }
        const formulaName = window.prompt("Enter a name for this global formula:");
        if (!formulaName || !formulaName.trim()) {
            toast({title: "Name Required", description: "A name is required to save the formula globally.", variant: "default"});
            return;
        }
        let dimType: FormulaDimensionType = 'Width';
        if (formulaField === 'heightFormula') dimType = 'Height';
        else if (formulaField === 'quantityFormula') dimType = 'Quantity';

        try {
            const result = await saveCustomFormulaAction(formulaName, formulaToSave, dimType, "Saved from template editor");
            if (result.success) {
                toast({title: "Formula Saved", description: `Formula "${formulaName}" saved globally.`});
                onRefreshGlobalFormulas();
            } else {
                 toast({title: "Error Saving Formula", description: result.error || "Could not save formula.", variant: "destructive"});
            }
        } catch (err) {
            toast({title: "Error", description: (err instanceof Error ? err.message : "Unknown error."), variant: "destructive"});
        }
      };

      return (
        <div className="flex items-end gap-2">
          <div className="flex-grow">
            <Label htmlFor={`part_${partIndex}_${formulaField}`}>{label}</Label>
            <Textarea id={`part_${partIndex}_${formulaField}`} rows={1} value={currentFormulaValue} onChange={(e) => handleTemplateInputChange(e, `parts.${partIndex}.${formulaField}`)} placeholder={placeholder} className="text-sm" readOnly={!isCustomEntryMode} />
          </div>
           <div className="flex flex-col items-center space-y-1">
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="whitespace-nowrap px-2"><ChevronDown className="h-4 w-4" /> <span className="ml-1 text-xs">Ins</span></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                    {combinedFormulas.map((item) => ( <DropdownMenuItem key={item.id} onSelect={() => handleFormulaSelect(partIndex, formulaField as any, item.formula)} className="flex justify-between items-center text-xs">
                        <span className={item.type === 'custom_db' ? 'italic' : ''}>{item.name} ({item.formula})</span>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100"><HelpCircle className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent side="left" className="max-w-xs text-xs p-2 bg-popover text-popover-foreground"><p className="font-semibold">{item.description}</p><p className="text-xs text-muted-foreground">{item.example}</p></TooltipContent></Tooltip></DropdownMenuItem> ))}
                    <DropdownMenuItem key="CUSTOM" onSelect={() => handleFormulaSelect(partIndex, formulaField as any, PREDEFINED_FORMULAS.find(f => f.key === 'CUSTOM')?.formula || "")} className="flex justify-between items-center text-xs"><span className="font-semibold">Custom Formula... (Type directly)</span></DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu>
             {isCustomEntryMode && (
                <Button type="button" variant="outline" size="sm" onClick={handleSaveGlobal} className="whitespace-nowrap px-2" title="Save this custom formula globally" disabled={!currentFormulaValue || !currentFormulaValue.trim()}>
                    <Save className="h-4 w-4" /> <span className="ml-1 text-xs">Save</span>
                </Button>
            )}
          </div>
        </div>);
  };

  const handleAddProjectItem = () => {
    const firstTemplateSelectable = selectableCabinetTypes[0];
    let initialWidth = defaultDims.width, initialHeight = defaultDims.height, initialDepth = defaultDims.depth;
    const firstTemplateData = dbTemplates.find(t => t.id === firstTemplateSelectable.value) || (firstTemplateSelectable.value === currentTemplate?.id ? currentTemplate : undefined);
    if (firstTemplateData) { initialWidth = firstTemplateData.defaultDimensions.width; initialHeight = firstTemplateData.defaultDimensions.height; initialDepth = firstTemplateData.defaultDimensions.depth; }
    setProjectCabinetItems(prev => [ ...prev, { id: `proj_item_${Date.now()}`, templateId: firstTemplateSelectable.value, templateName: firstTemplateSelectable.label, quantity: 1, width: initialWidth, height: initialHeight, depth: initialDepth, } ]);
  };

  const handleRemoveProjectItem = (itemId: string) => setProjectCabinetItems(prev => prev.filter(item => item.id !== itemId));

  const handleProjectItemChange = (itemId: string, field: keyof Omit<ProjectCabinetItem, 'id'|'templateName'>, value: string | number) => {
    setProjectCabinetItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'templateId') {
            const selectedTemplateInfo = selectableCabinetTypes.find(ct => ct.value === value);
            updatedItem.templateName = selectedTemplateInfo?.label || "Unknown";
            const newTemplateData = dbTemplates.find(t => t.id === value) || (value === currentTemplate?.id ? currentTemplate : undefined);
            if (newTemplateData) { updatedItem.width = newTemplateData.defaultDimensions.width; updatedItem.height = newTemplateData.defaultDimensions.height; updatedItem.depth = newTemplateData.defaultDimensions.depth; }
            else { updatedItem.width = 600; updatedItem.height = 700; updatedItem.depth = 500; }
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleCalculateProject = async () => {
    if (projectCabinetItems.length === 0) {
      toast({ title: "Project Empty", description: "Add some cabinets to the project first." });
      return;
    }
    setIsCalculatingProject(true);
    setProjectCalculationResult(null);
    setLatestCalculatedProjectPartsForNesting([]);
    let cumulativeCost = 0;
    let cumulativePanelArea = 0;
    let cumulativeBackPanelArea = 0;
    const individualResults: Array<{ name: string; cost: number; quantity: number }> = [];
    const aggregatedPartsMap = new Map<string, CabinetPart>();
    const aggregatedAccessoriesMap = new Map<string, AccessoryItem>();

    try {
      for (const projectItem of projectCabinetItems) {
        let templateForCalc: CabinetTemplateData | undefined = undefined;
        const isHardcoded = initialHardcodedCabinetTypes.some(hct => hct.value === projectItem.templateId);

        if (!isHardcoded) {
          if (currentTemplate && currentTemplate.id === projectItem.templateId) {
            templateForCalc = currentTemplate;
          } else {
            templateForCalc = dbTemplates.find(dbT => dbT.id === projectItem.templateId);
          }
          if (!templateForCalc) {
              const fetchedTemplate = await getCabinetTemplateByIdAction(projectItem.templateId);
              if (fetchedTemplate) templateForCalc = fetchedTemplate;
          }
        }

        const calcInput: CabinetCalculationInput = {
          cabinetType: projectItem.templateId,
          width: projectItem.width,
          height: projectItem.height,
          depth: projectItem.depth,
          customTemplate: templateForCalc,
        };

        const result = await calculateCabinetDetails(calcInput);
        if (result.success && result.data) {
          const itemTotalCost = result.data.estimatedTotalCost * projectItem.quantity;
          cumulativeCost += itemTotalCost;
          cumulativePanelArea += (result.data.totalPanelAreaMM / (1000*1000)) * projectItem.quantity;
          cumulativeBackPanelArea += (result.data.totalBackPanelAreaMM / (1000*1000)) * projectItem.quantity;
          individualResults.push({
            name: `${projectItem.templateName} (${projectItem.width}x${projectItem.height}x${projectItem.depth})`,
            cost: itemTotalCost,
            quantity: projectItem.quantity,
          });


          result.data.parts.forEach(part => {
            const partKey = `${part.name}-${part.width.toFixed(1)}-${part.height.toFixed(1)}-${part.thickness.toFixed(1)}-${part.material}-${part.grainDirection || 'none'}`;
            const existingPart = aggregatedPartsMap.get(partKey);
            const quantityToAdd = part.quantity * projectItem.quantity;
            if (existingPart) {
              existingPart.quantity += quantityToAdd;
            } else {
              aggregatedPartsMap.set(partKey, { ...part, quantity: quantityToAdd });
            }
          });


          result.data.accessories.forEach(accessory => {
            const existingAccessory = aggregatedAccessoriesMap.get(accessory.id);
            const quantityToAdd = accessory.quantity * projectItem.quantity;
            if (existingAccessory) {
              existingAccessory.quantity += quantityToAdd;
              existingAccessory.totalCost += (accessory.unitCost * quantityToAdd);
            } else {
              aggregatedAccessoriesMap.set(accessory.id, {
                ...accessory,
                quantity: quantityToAdd,
                totalCost: accessory.unitCost * quantityToAdd,
              });
            }
          });

        } else {
          throw new Error(`Failed to calculate details for ${projectItem.templateName}: ${result.error || 'Unknown error'}`);
        }
      }

      const finalAggregatedParts = Array.from(aggregatedPartsMap.values());
      setProjectCalculationResult({
        totalCost: cumulativeCost,
        totalPanelArea: cumulativePanelArea,
        totalBackPanelArea: cumulativeBackPanelArea,
        individualCabinetResults: individualResults,
        aggregatedParts: finalAggregatedParts,
        aggregatedAccessories: Array.from(aggregatedAccessoriesMap.values()),
      });


      const partsForNesting: InputPart[] = finalAggregatedParts.map(p => ({
        name: `${p.name} (${p.material}, ${p.thickness.toFixed(0)}mm)`,
        width: p.width,
        height: p.height,
        qty: p.quantity,
        material: p.material,
        grainDirection: p.grainDirection,
        originalName: p.name,
        originalWidth: p.width,
        originalHeight: p.height,
      }));
      setLatestCalculatedProjectPartsForNesting(partsForNesting);

      toast({ title: "Project Calculation Complete", description: "Summary costs, areas, parts, and accessories estimated. Parts list ready for nesting tool." });
    } catch (error) {
      console.error("Project calculation failed:", error);
      toast({
        title: "Project Calculation Failed",
        description: (error instanceof Error ? error.message : "An unknown error occurred during project calculation."),
        variant: "destructive",
      });
      setProjectCalculationResult(null);
      setLatestCalculatedProjectPartsForNesting([]);
    } finally {
      setIsCalculatingProject(false);
    }
  };

  const handleSaveProjectForNesting = () => {
    if (latestCalculatedProjectPartsForNesting.length === 0) {
      toast({ title: "No Parts", description: "Calculate a project first to generate parts for nesting.", variant: "default" });
      return;
    }

    try {
      const existingJobsString = localStorage.getItem("cabinetDesignerNestingJobs");
      let existingJobs: NestingJob[] = existingJobsString ? JSON.parse(existingJobsString) : [];

      const now = new Date();
      const jobName = customNestingJobName.trim() !== "" ? customNestingJobName.trim() : `Project Parts - ${format(now, "yyyy-MM-dd HH:mm:ss")}`;
      const jobId = `nestJob_${now.getTime()}_${jobName.replace(/\s+/g, '_').slice(0,20)}`;

      const newJob: NestingJob = {
        id: jobId,
        name: jobName,
        timestamp: now.toISOString(),
        parts: latestCalculatedProjectPartsForNesting,
      };

      existingJobs.unshift(newJob);
      existingJobs = existingJobs.slice(0, 10);

      localStorage.setItem("cabinetDesignerNestingJobs", JSON.stringify(existingJobs));
      toast({ title: "Project Parts Saved", description: `"${jobName}" saved for nesting tool. You can now load it in Advanced Tools.`, });
      setCustomNestingJobName("");
    } catch (e) {
      console.error("Error saving project for nesting:", e);
      toast({ title: "Error Saving for Nesting", description: "Could not save parts to localStorage.", variant: "destructive" });
    }
  };


  const isSelectedTemplateCustomDb = dbTemplates.some(t => t.id === calculationInput.cabinetType);
  const edgeBandingMaterialOptions = React.useMemo(() => combinedMaterialOptions.filter(m => m.type === 'edge_band'), [combinedMaterialOptions]);


  const renderCalculatorView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 shadow-lg">
        <CardHeader><CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" />Configure Cabinet</CardTitle><CardDescription>Select type and customize dimensions for calculation.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isMaterialDialogOp} onOpenChange={setIsMaterialDialogOp}>
              <DialogTrigger asChild><Button variant="outline" className="flex-1"><Construction className="mr-2 h-4 w-4"/>Define Material</Button></DialogTrigger>
              <AddMaterialTypeDialog setOpen={setIsMaterialDialogOp} onMaterialTypeAdded={fetchCustomDefinitionsAndFormulas} />
            </Dialog>
            <Dialog open={isAccessoryDialogOp} onOpenChange={setIsAccessoryDialogOp}>
              <DialogTrigger asChild><Button variant="outline" className="flex-1"><Hammer className="mr-2 h-4 w-4"/>Define Accessory</Button></DialogTrigger>
              <AddAccessoryTypeDialog setOpen={setIsAccessoryDialogOp} onAccessoryTypeAdded={fetchCustomDefinitionsAndFormulas} />
            </Dialog>
          </div>
           <Button onClick={() => { setCurrentTemplate(generateNewTemplatePlaceholder()); setViewMode('templateDefinition'); }} variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Define New Cabinet Template</Button>
          <Separator />
          <div><Label htmlFor="cabinetType">Cabinet Type</Label><Select value={calculationInput.cabinetType} onValueChange={handleTypeChange}><SelectTrigger id="cabinetType"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{selectableCabinetTypes.map(type => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent></Select></div>
          {isSelectedTemplateCustomDb && (
            <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={handleEditSelectedTemplate} className="flex-1">
                    <Edit2 className="mr-2 h-4 w-4" /> Edit Template
                </Button>
                <Button variant="destructive" size="sm" onClick={() => {
                    const template = dbTemplates.find(t => t.id === calculationInput.cabinetType);
                    if(template) setTemplateToDelete(template);
                }} className="flex-1">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Template
                </Button>
            </div>
          )}
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center"><Image src={getPreviewImageSrc()} alt={`${calculationInput.cabinetType} Preview`} width={300} height={200} className="object-contain" data-ai-hint={getImageAiHint()}/></div>
          <div><Label htmlFor="width">Width (mm)</Label><Input id="width" name="width" type="number" value={calculationInput.width} onChange={handleInputChange}/></div>
          <div><Label htmlFor="height">Height (mm)</Label><Input id="height" name="height" type="number" value={calculationInput.height} onChange={handleInputChange}/></div>
          <div><Label htmlFor="depth">Depth (mm)</Label><Input id="depth" name="depth" type="number" value={calculationInput.depth} onChange={handleInputChange}/></div>
          <Button onClick={handleCalculate} className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}{isLoading ? "Calculating..." : "Calculate Parts & Cost"}</Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2 shadow-lg">
        <CardHeader><CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" />Calculation Results</CardTitle><CardDescription>Estimated parts, materials, and costs for the selected cabinet.</CardDescription></CardHeader>
        <CardContent>
          {isLoading && (<div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Calculating...</p></div>)}
          {calculationError && !isLoading && (<div className="text-destructive bg-destructive/10 p-4 rounded-md"><p className="font-semibold">Error:</p><p>{calculationError}</p></div>)}
          {calculatedData && !isLoading && !calculationError && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold mb-2">Estimated Totals</h3><div className="grid grid-cols-2 gap-2 text-sm p-3 border rounded-md bg-muted/50">
                  <p>Main Panel Area:</p><p className="text-right font-medium">{(calculatedData.totalPanelAreaMM / (1000*1000)).toFixed(2)} m²</p>
                  <p>Back Panel Area:</p><p className="text-right font-medium">{(calculatedData.totalBackPanelAreaMM / (1000*1000)).toFixed(2)} m²</p>
                  <p>Material Cost:</p><p className="text-right font-medium">${calculatedData.estimatedMaterialCost.toFixed(2)}</p>
                  <p>Accessory Cost:</p><p className="text-right font-medium">${calculatedData.estimatedAccessoryCost.toFixed(2)}</p>
                  <p className="font-bold text-base">Total Cost:</p><p className="text-right font-bold text-base">${calculatedData.estimatedTotalCost.toFixed(2)}</p></div></div>
              <div><h3 className="text-lg font-semibold mb-2 flex items-center"><PackagePlus className="mr-2 h-5 w-5"/>Calculated Part List</h3><div className="max-h-[400px] overflow-y-auto border rounded-md"><Table><TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>Part</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">W</TableHead><TableHead className="text-right">H</TableHead><TableHead className="text-center">Th</TableHead><TableHead>Material</TableHead><TableHead>Edges</TableHead><TableHead>Grain</TableHead></TableRow></TableHeader>
                    <TableBody>{calculatedData.parts.map((part, index) => (<TableRow key={index}><TableCell>{part.name} ({part.partType})</TableCell><TableCell className="text-center">{part.quantity}</TableCell><TableCell className="text-right">{part.width.toFixed(0)}</TableCell><TableCell className="text-right">{part.height.toFixed(0)}</TableCell><TableCell className="text-center">{part.thickness}</TableCell><TableCell>{part.material}</TableCell>
                        <TableCell className="text-xs">{part.edgeBanding && Object.entries(part.edgeBanding).filter(([, value]) => typeof value === 'number' && value > 0).map(([edge, length]) => `${edge[0].toUpperCase()}${edge.slice(1)}: ${(length as number).toFixed(0)}`).join(', ')}</TableCell>
                        <TableCell className="text-xs capitalize">{part.grainDirection || '-'}</TableCell></TableRow>))}</TableBody></Table></div>
                <p className="text-xs text-muted-foreground mt-2">Note: Raw cutting list. Nesting optimization needed separately.</p></div>
              <div><h3 className="text-lg font-semibold mb-2 flex items-center"><Wrench className="mr-2 h-5 w-5"/>Accessories</h3><div className="max-h-[200px] overflow-y-auto border rounded-md"><Table><TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>Accessory</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                    <TableBody>{calculatedData.accessories.map((acc, index) => (<TableRow key={index}><TableCell>{acc.name}</TableCell><TableCell className="text-center">{acc.quantity}</TableCell><TableCell className="text-right">${acc.unitCost.toFixed(2)}</TableCell><TableCell className="text-right">${acc.totalCost.toFixed(2)}</TableCell><TableCell className="text-xs">{acc.notes || '-'}</TableCell></TableRow>))}</TableBody></Table></div></div>
              <div className="mt-4 p-4 border border-dashed rounded-md"><h4 className="font-semibold text-muted-foreground">Nesting Output (Placeholder)</h4><p className="text-sm text-muted-foreground">2D nesting layout (SVG/PDF) and sheet count would appear here.</p></div>
              <div className="flex space-x-2 mt-4"><Button variant="outline" disabled>Export Cutting List (CSV)</Button><Button variant="outline" disabled>Export Layout (PDF/SVG)</Button></div></div>)}
          {!isLoading && !calculatedData && !calculationError && (<div className="text-center py-10 text-muted-foreground"><Library className="mx-auto h-12 w-12 mb-4" /><p>Select type, enter dimensions, and click "Calculate".</p></div>)}
        </CardContent>
      </Card>
      <Card className="lg:col-span-3 shadow-lg"><CardHeader><CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />Project Planner</CardTitle><CardDescription>Add cabinet instances to your project and estimate overall costs, materials, and aggregated parts/accessories lists.</CardDescription></CardHeader>
        <CardContent className="space-y-4">{projectCabinetItems.map((item) => (<Card key={item.id} className="p-4 space-y-3 relative bg-muted/30"><Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => handleRemoveProjectItem(item.id)}><XCircle className="h-4 w-4"/></Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2 md:col-span-2"><Label htmlFor={`project_template_${item.id}`} className="text-xs">Template</Label><Select value={item.templateId} onValueChange={(value) => handleProjectItemChange(item.id, 'templateId', value)}><SelectTrigger id={`project_template_${item.id}`} className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{selectableCabinetTypes.map(type => (<SelectItem key={type.value} value={type.value} className="text-xs">{type.label}</SelectItem>))}</SelectContent></Select></div>
                <div><Label htmlFor={`project_qty_${item.id}`} className="text-xs">Qty</Label><Input id={`project_qty_${item.id}`} type="number" value={item.quantity} onChange={(e) => handleProjectItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)} className="h-9 text-xs" min={1}/></div>
                <div><Label htmlFor={`project_width_${item.id}`} className="text-xs">W (mm)</Label><Input id={`project_width_${item.id}`} type="number" value={item.width} onChange={(e) => handleProjectItemChange(item.id, 'width', parseInt(e.target.value, 10) || 0)} className="h-9 text-xs"/></div>
                <div><Label htmlFor={`project_height_${item.id}`} className="text-xs">H (mm)</Label><Input id={`project_height_${item.id}`} type="number" value={item.height} onChange={(e) => handleProjectItemChange(item.id, 'height', parseInt(e.target.value, 10) || 0)} className="h-9 text-xs"/></div>
                <div><Label htmlFor={`project_depth_${item.id}`} className="text-xs">D (mm)</Label><Input id={`project_depth_${item.id}`} type="number" value={item.depth} onChange={(e) => handleProjectItemChange(item.id, 'depth', parseInt(e.target.value, 10) || 0)} className="h-9 text-xs"/></div></div></Card>))}
           <Button onClick={handleAddProjectItem} variant="outline" size="sm" className="mt-3"><PlusCircle className="mr-2 h-4 w-4" /> Add Cabinet to Project</Button><Separator className="my-4" />
            <div className="space-y-3">
                <Button onClick={handleCalculateProject} className="w-full sm:w-auto" disabled={isCalculatingProject || projectCabinetItems.length === 0}>
                    {isCalculatingProject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    {isCalculatingProject ? "Calculating Project..." : "Calculate Entire Project"}
                </Button>
                {latestCalculatedProjectPartsForNesting.length > 0 && (
                  <div className="p-4 border rounded-md bg-muted/40 space-y-3">
                    <Label htmlFor="nestingJobName" className="font-medium">Nesting Job Name (Optional)</Label>
                    <Input
                        id="nestingJobName"
                        value={customNestingJobName}
                        onChange={(e) => setCustomNestingJobName(e.target.value)}
                        placeholder={`Default: Project Parts - ${format(new Date(), "yyyy-MM-dd HH:mm")}`}
                        className="text-sm h-9"
                    />
                    <Button
                        onClick={handleSaveProjectForNesting}
                        variant="secondary"
                        className="w-full sm:w-auto"
                        disabled={isCalculatingProject}>
                        <SendToBack className="mr-2 h-4 w-4" />
                        Save Parts for Nesting Tool
                    </Button>
                    <p className="text-xs text-muted-foreground">Saves the aggregated parts list to be loaded in "Advanced Tools".</p>
                  </div>
                )}
            </div>

           {isCalculatingProject && (<div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Calculating project estimates...</p></div>)}
           {projectCalculationResult && !isCalculatingProject && (
             <div className="mt-4 p-4 border rounded-md bg-muted/40 space-y-6">
               <div>
                 <h4 className="font-semibold text-md mb-3">Project Calculation Summary:</h4>
                 <div className="grid grid-cols-2 gap-2 text-sm">
                   <p>Overall Estimated Cost:</p><p className="text-right font-medium">${projectCalculationResult.totalCost.toFixed(2)}</p>
                   <p>Total Main Panel Area:</p><p className="text-right font-medium">{projectCalculationResult.totalPanelArea.toFixed(2)} m²</p>
                   <p>Total Back Panel Area:</p><p className="text-right font-medium">{projectCalculationResult.totalBackPanelArea.toFixed(2)} m²</p>
                 </div>
                 <h5 className="font-semibold mt-4 mb-2">Individual Cabinet Costs:</h5>
                 <ul className="list-disc list-inside text-sm space-y-1">
                   {projectCalculationResult.individualCabinetResults.map((res, idx) => (
                     <li key={idx}>
                       {res.quantity} x {res.name}: ${res.cost.toFixed(2)}
                     </li>
                   ))}
                 </ul>
               </div>

               <div>
                <h4 className="text-md font-semibold mb-2 flex items-center"><List className="mr-2 h-5 w-5"/>Aggregated Project Part List</h4>
                <div className="max-h-[400px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                      <TableRow>
                        <TableHead>Part Name</TableHead>
                        <TableHead className="text-center">Total Qty</TableHead>
                        <TableHead className="text-right">W</TableHead>
                        <TableHead className="text-right">H</TableHead>
                        <TableHead className="text-center">Th</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Grain</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectCalculationResult.aggregatedParts.map((part, index) => (
                        <TableRow key={index}>
                          <TableCell>{part.name} ({part.partType})</TableCell>
                          <TableCell className="text-center">{part.quantity}</TableCell>
                          <TableCell className="text-right">{part.width.toFixed(0)}</TableCell>
                          <TableCell className="text-right">{part.height.toFixed(0)}</TableCell>
                          <TableCell className="text-center">{part.thickness.toFixed(0)}</TableCell>
                          <TableCell>{part.material}</TableCell>
                          <TableCell className="text-xs capitalize">{part.grainDirection || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
               </div>

               <div>
                <h4 className="text-md font-semibold mb-2 flex items-center"><Wrench className="mr-2 h-5 w-5"/>Aggregated Project Accessories List</h4>
                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                      <TableRow>
                        <TableHead>Accessory Name</TableHead>
                        <TableHead className="text-center">Total Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectCalculationResult.aggregatedAccessories.map((acc, index) => (
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
             </div>
           )}
           </CardContent></Card>
    </div>);

 const renderTemplateDefinitionView = () => {
    const evalParams = { W: currentTemplate.defaultDimensions.width, H: currentTemplate.defaultDimensions.height, D: currentTemplate.defaultDimensions.depth, ...currentTemplate.parameters };
    return (<div className="space-y-6"><TooltipProvider><Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center"><DraftingCompass className="mr-2 h-5 w-5 text-primary" />Define Cabinet Template</CardTitle><CardDescription>Specify parameters, parts, formulas, and accessories. Part thickness is derived from the selected material.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="templateName">Template Name</Label><Input id="templateName" name="name" value={currentTemplate.name} onChange={(e) => handleTemplateInputChange(e, 'name')}/></div>
                <div><Label htmlFor="templateType">Template Type</Label><Select value={currentTemplate.type} onValueChange={(value) => handleTemplateInputChange({ target: { name: 'type', value } } as any, 'type')}><SelectTrigger id="templateType"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="base">Base</SelectItem><SelectItem value="wall">Wall</SelectItem><SelectItem value="tall">Tall</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div></div>
                <Card><CardHeader><CardTitle className="text-lg">Default Dimensions (mm)</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-4">
                    <div><Label htmlFor="defaultWidth">Width (W)</Label><Input id="defaultWidth" name="width" type="number" value={currentTemplate.defaultDimensions.width} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.width')} /></div>
                    <div><Label htmlFor="defaultHeight">Height (H)</Label><Input id="defaultHeight" name="height" type="number" value={currentTemplate.defaultDimensions.height} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.height')} /></div>
                    <div><Label htmlFor="defaultDepth">Depth (D)</Label><Input id="defaultDepth" name="depth" type="number" value={currentTemplate.defaultDimensions.depth} onChange={(e) => handleTemplateInputChange(e, 'defaultDimensions.depth')} /></div></CardContent></Card>

                <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-lg">Part Definitions</CardTitle><CardDescription>Define each part, its quantity, dimensions, material, and edge banding.</CardDescription></div>
                    <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}><DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Part</Button></DialogTrigger>
                        <AddPartDialog
                            setOpen={setIsAddPartDialogOpen}
                            onAddPart={handleAddPartToTemplate}
                            existingPartCount={currentTemplate.parts.length}
                            templateParameters={currentTemplate.parameters}
                            materialOptions={combinedMaterialOptions}
                            onRequestOpenMaterialDialog={() => setIsMaterialDialogOp(true)}
                        />
                    </Dialog></CardHeader>
                    <CardContent className="space-y-4"><ScrollArea className="max-h-[600px] pr-3">
                      {currentTemplate.parts.map((part, index) => {
                        const materialInfo = combinedMaterialOptions.find(m => m.value === part.materialId);
                        const grainText = part.grainDirection === 'with' ? 'With Grain' : part.grainDirection === 'reverse' ? 'Reverse Grain' : 'None';
                        const calculatedHeight = evaluateFormulaClientSide(part.heightFormula, evalParams); const calculatedWidth = evaluateFormulaClientSide(part.widthFormula, evalParams);
                        const calculatedQty = evaluateFormulaClientSide(part.quantityFormula, evalParams);
                        return (<Card key={part.partId || index} className="p-4 relative bg-card/80 mb-4"><Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => handleRemovePartFromTemplate(index)}><XCircle className="h-5 w-5"/></Button>
                            <div className="mb-3 p-2 border rounded-md bg-muted/30 text-sm space-y-1"><Input id={`partName_${index}`} value={part.nameLabel} onChange={(e) => handleTemplateInputChange(e, `parts.${index}.nameLabel`)} className="text-base font-medium mb-1"/>
                                <p><span className="font-medium">Type:</span> {part.partType} ({part.cabinetContext || 'General'})</p>
                                <p><span className="font-medium">Calc. Dim (H x W):</span>{` ${calculatedHeight}${isNaN(Number(calculatedHeight)) ? '' : 'mm'} x ${calculatedWidth}${isNaN(Number(calculatedWidth)) ? '' : 'mm'}`}<span className="text-muted-foreground text-[10px] block">(Formulas: {part.heightFormula || 'N/A'} x {part.widthFormula || 'N/A'})</span></p>
                                <p><span className="font-medium">Calc. Qty:</span> {calculatedQty} <span className="text-muted-foreground text-[10px]">(Formula: {part.quantityFormula})</span></p>
                                <p><span className="font-medium">Material:</span> {materialInfo?.label || part.materialId} (Thickness derived from material)</p><p><span className="font-medium">Grain:</span> {grainText}</p></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-start">
                                <FormulaInputWithHelper partIndex={index} formulaField="quantityFormula" label="Quantity Formula*" placeholder="e.g., 2" customDbFormulas={globalCustomFormulas} onRefreshGlobalFormulas={fetchCustomDefinitionsAndFormulas} />
                                <FormulaInputWithHelper partIndex={index} formulaField="widthFormula" label="Width Formula*" placeholder="e.g., D or W - 2*PT" customDbFormulas={globalCustomFormulas} onRefreshGlobalFormulas={fetchCustomDefinitionsAndFormulas} />
                                <FormulaInputWithHelper partIndex={index} formulaField="heightFormula" label="Height Formula*" placeholder="e.g., H or D - BPO" customDbFormulas={globalCustomFormulas} onRefreshGlobalFormulas={fetchCustomDefinitionsAndFormulas} />
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <FormLabel>Material (Panel)*</FormLabel>
                                        <Button type="button" variant="link" size="sm" onClick={() => setIsMaterialDialogOp(true)} className="p-0 h-auto text-xs">
                                            <PlusCircle className="mr-1 h-3 w-3" /> Define New...
                                        </Button>
                                    </div>
                                    <Select value={part.materialId} onValueChange={(value) => handleTemplateInputChange({ target: { name: 'materialId', value }} as any, `parts.${index}.materialId`)}>
                                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select material" /></SelectTrigger>
                                      <SelectContent>{combinedMaterialOptions.filter(m => m.type === 'panel' || m.type === 'other').map((material) => (<SelectItem key={material.value} value={material.value}>{material.label}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                <div><FormLabel>Grain Direction</FormLabel><Select value={part.grainDirection || 'none'} onValueChange={(value) => handleTemplateInputChange({ target: { name: 'grainDirection', value: value === 'none' ? null : value }} as any, `parts.${index}.grainDirection`)}><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="with">With Grain (Height)</SelectItem><SelectItem value="reverse">Reverse Grain (Width)</SelectItem></SelectContent></Select></div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <FormLabel>Edge Banding Material (Optional)</FormLabel>
                                        <Button type="button" variant="link" size="sm" onClick={() => setIsMaterialDialogOp(true)} className="p-0 h-auto text-xs">
                                            <PlusCircle className="mr-1 h-3 w-3" /> Define New...
                                        </Button>
                                    </div>
                                    <Select 
                                        value={part.edgeBandingMaterialId || NO_EDGE_BANDING_PLACEHOLDER} 
                                        onValueChange={(value) => handleTemplateInputChange({ target: { name: 'edgeBandingMaterialId', value: value === NO_EDGE_BANDING_PLACEHOLDER ? null : value }} as any, `parts.${index}.edgeBandingMaterialId`)}
                                    >
                                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select edge band material" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={NO_EDGE_BANDING_PLACEHOLDER}>None</SelectItem>
                                        {edgeBandingMaterialOptions.map((ebMaterial) => (<SelectItem key={ebMaterial.value} value={ebMaterial.value}>{ebMaterial.label}</SelectItem>))}
                                      </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="mt-3"><FormLabel className="font-medium">Edge Banding Application:</FormLabel><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 text-sm">
                                {(['front', 'back', 'top', 'bottom'] as Array<keyof PartDefinition['edgeBanding']>).map(edge => (<FormItem key={edge} className="flex flex-row items-center space-x-2"><Checkbox id={`edge_${index}_${edge}`} checked={!!part.edgeBanding?.[edge]} onCheckedChange={(checked) => handleTemplateInputChange({target: {name: edge, type: 'checkbox', value: !!checked, checked: !!checked}} as any, `parts.${index}.edgeBanding.${edge}`, index, edge as keyof PartDefinition['edgeBanding'])}/><Label htmlFor={`edge_${index}_${edge}`} className="font-normal capitalize">{edge}</Label></FormItem>))}</div>
                                <p className="text-xs text-muted-foreground mt-1">For panels: Top/Bottom on Width; Front/Back on Height.</p></div>
                            <div className="mt-3"><FormLabel className="font-medium">Part Notes:</FormLabel><Textarea value={part.notes || ''} onChange={(e) => handleTemplateInputChange(e, `parts.${index}.notes`)} rows={2} className="text-sm" placeholder="Optional notes..."/></div></Card>)})}
                        {currentTemplate.parts.length === 0 && <p className="text-muted-foreground text-center py-4">No parts defined. Click "Add Part".</p>}
                    </ScrollArea></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-lg flex items-center"><Wrench className="mr-2 h-5 w-5" />Accessories</CardTitle><CardDescription>Define accessories like hinges, handles, with quantity formulas.</CardDescription></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsAccessoryDialogOp(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />Define New Accessory
                    </Button>
                    <Button size="sm" onClick={handleAddAccessoryToTemplate}><PlusCircle className="mr-2 h-4 w-4" />Add To Template</Button>
                  </div>
                  </CardHeader>
                    <CardContent className="space-y-4"><ScrollArea className="max-h-[300px] pr-3">{(currentTemplate.accessories || []).map((acc, index) => (<Card key={acc.id} className="p-4 relative bg-card/80 mb-3"><Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveAccessoryFromTemplate(acc.id)}><XCircle className="h-5 w-5"/></Button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label htmlFor={`acc_type_${index}`}>Accessory Type*</Label><Select value={acc.accessoryId} onValueChange={(value) => handleAccessoryInputChange(value, index, 'accessoryId')}><SelectTrigger id={`acc_type_${index}`} className="text-sm"><SelectValue placeholder="Select accessory" /></SelectTrigger><SelectContent>{combinedAccessoryOptions.map(pa => (<SelectItem key={pa.value} value={pa.value}>{pa.label}</SelectItem>))}</SelectContent></Select></div>
                                <div><Label htmlFor={`acc_qty_formula_${index}`}>Quantity Formula*</Label><Input id={`acc_qty_formula_${index}`} value={acc.quantityFormula} onChange={(e) => handleAccessoryInputChange(e, index, 'quantityFormula')} className="text-sm"/></div>
                                <div className="md:col-span-2"><Label htmlFor={`acc_notes_${index}`}>Notes</Label><Textarea id={`acc_notes_${index}`} value={acc.notes || ''} onChange={(e) => handleAccessoryInputChange(e, index, 'notes')} className="text-sm" rows={2}/></div></div></Card>))}
                        {(!currentTemplate.accessories || currentTemplate.accessories.length === 0) && <p className="text-muted-foreground text-center py-4">No accessories defined for this template.</p>}
                    </ScrollArea></CardContent></Card>
            </CardContent><CardFooter className="flex justify-end space-x-3"><Button variant="outline" onClick={() => setViewMode('calculator')}>Cancel</Button><Button onClick={handleSaveTemplate} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Template</Button></CardFooter></Card></TooltipProvider>
        {(currentTemplate.type === 'base' || currentTemplate.type === 'tall' || currentTemplate.type === 'custom') && (
            <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center"><BoxSelect className="mr-2 h-5 w-5 text-primary" />Drawer Set Calculator</CardTitle><CardDescription>Helper to calculate drawer components. Add these to 'Part Definitions' manually.</CardDescription></CardHeader>
                <CardContent className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><Label htmlFor="ds_cabInternalHeight">Cab Internal H (mm)</Label><Input id="ds_cabInternalHeight" name="cabinetInternalHeight" type="number" value={drawerSetInput.cabinetInternalHeight} onChange={handleDrawerSetInputChange}/></div>
                    <div><Label htmlFor="ds_cabWidth">Cab Width (mm)</Label><Input id="ds_cabWidth" name="cabinetWidth" type="number" value={drawerSetInput.cabinetWidth} onChange={handleDrawerSetInputChange}/></div>
                    <div><Label htmlFor="ds_numDrawers">Num of Drawers</Label><Input id="ds_numDrawers" name="numDrawers" type="number" value={drawerSetInput.numDrawers} onChange={handleDrawerSetInputChange}/></div>
                    <div><Label htmlFor="ds_drawerReveal">Drawer Reveal (mm)</Label><Input id="ds_drawerReveal" name="drawerReveal" type="number" value={drawerSetInput.drawerReveal} onChange={handleDrawerSetInputChange}/></div>
                    <div><Label htmlFor="ds_panelThickness">Panel Thick (T, mm)</Label><Input id="ds_panelThickness" name="panelThickness" type="number" value={drawerSetInput.panelThickness} onChange={handleDrawerSetInputChange}/></div>
                    <div><Label htmlFor="ds_slideClearance">Total Slide Clear (mm)</Label><Input id="ds_slideClearance" name="drawerSlideClearanceTotal" type="number" value={drawerSetInput.drawerSlideClearanceTotal} onChange={handleDrawerSetInputChange}/></div>
                    <div><Label htmlFor="ds_boxSideDepth">Box Side Depth (mm)</Label><Input id="ds_boxSideDepth" name="drawerBoxSideDepth" type="number" value={drawerSetInput.drawerBoxSideDepth} onChange={handleDrawerSetInputChange}/></div>
                    <div><Label htmlFor="ds_boxSideHeight">Box Side Height (mm)</Label><Input id="ds_boxSideHeight" name="drawerBoxSideHeight" type="number" value={drawerSetInput.drawerBoxSideHeight} onChange={handleDrawerSetInputChange}/></div>
                    <div className="lg:col-span-3"><Label htmlFor="ds_customFronts">Custom Front Heights (mm, comma-sep, optional)</Label><Input id="ds_customFronts" name="customDrawerFrontHeights" type="text" value={drawerSetInput.customDrawerFrontHeights?.join(', ') || ''} onChange={handleDrawerSetInputChange}/></div></div>
                <Button onClick={handleCalculateDrawerSet} className="w-full md:w-auto" disabled={isCalculatingDrawers}>{isCalculatingDrawers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}{isCalculatingDrawers ? "Calculating..." : "Calculate Drawer Set"}</Button>
                {isCalculatingDrawers && (<div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Calculating...</p></div>)}
                {drawerCalcError && !isCalculatingDrawers && (<div className="text-destructive bg-destructive/10 p-3 rounded-md text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {drawerCalcError}</div>)}
                {drawerSetResult && drawerSetResult.success && drawerSetResult.calculatedDrawers.length > 0 && !isCalculatingDrawers && (
                    <div className="space-y-4 mt-4"><h3 className="text-md font-semibold">Calculated Drawer Components:</h3>
                    {drawerSetResult.cabinetInternalHeight && drawerSetResult.totalFrontsHeightWithReveals && (<p className="text-xs text-muted-foreground">Total H used: {drawerSetResult.totalFrontsHeightWithReveals.toFixed(1)}mm (Cab internal H: {drawerSetResult.cabinetInternalHeight.toFixed(1)}mm)</p>)}
                    {drawerSetResult.calculatedDrawers.map((drawer: SingleCalculatedDrawer) => (<Card key={drawer.drawerNumber} className="bg-muted/30"><CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-base">Drawer {drawer.drawerNumber}</CardTitle><CardDescription className="text-xs">Front H: {drawer.overallFrontHeight.toFixed(1)}mm, Box Side H: {drawer.boxHeight.toFixed(1)}mm</CardDescription></CardHeader>
                        <CardContent className="px-4 pb-3"><Table className="text-xs"><TableHeader><TableRow><TableHead>Part</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">W</TableHead><TableHead className="text-right">H</TableHead><TableHead className="text-center">Th</TableHead></TableRow></TableHeader>
                            <TableBody>{drawer.parts.map(part => (<TableRow key={part.name}><TableCell>{part.name}</TableCell><TableCell className="text-center">{part.quantity}</TableCell><TableCell className="text-right">{part.width.toFixed(1)}</TableCell><TableCell className="text-right">{part.height.toFixed(1)}</TableCell><TableCell className="text-center">{part.thickness.toFixed(0)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>))}</div>)}
                {!isCalculatingDrawers && !drawerSetResult && !drawerCalcError && (<div className="text-center py-6 text-muted-foreground text-sm">Enter params and click "Calculate".</div>)}</CardContent></Card>)}
    </div>);
  };

  return (
    <TooltipProvider>
      <PageHeader title="Cabinet Designer" description={viewMode === 'calculator' ? "Configure, calculate parts, and estimate costs for individual cabinets or entire projects." : "Define a new parametric cabinet template."}/>
      {viewMode === 'calculator' ? renderCalculatorView() : renderTemplateDefinitionView()}

      <Dialog open={isMaterialDialogOp} onOpenChange={setIsMaterialDialogOp}>
        <AddMaterialTypeDialog setOpen={setIsMaterialDialogOp} onMaterialTypeAdded={fetchCustomDefinitionsAndFormulas} />
      </Dialog>
      <Dialog open={isAccessoryDialogOp} onOpenChange={setIsAccessoryDialogOp}>
         <AddAccessoryTypeDialog setOpen={setIsAccessoryDialogOp} onAccessoryTypeAdded={fetchCustomDefinitionsAndFormulas} />
      </Dialog>

      {templateToDelete && (
        <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this template?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the template "{templateToDelete.name}" from the database. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTemplateToDelete(null)} disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTemplate} className={buttonVariants({ variant: "destructive" })} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </TooltipProvider>
  );
}

    