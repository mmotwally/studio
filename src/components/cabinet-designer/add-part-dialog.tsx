
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { PartDefinition, CabinetPartType, EdgeBandingAssignment, CabinetTypeContext, PredefinedFormula, CabinetTemplateData, SelectItem as GenericSelectItem, CustomFormulaEntry } from "@/app/(app)/cabinet-designer/types";
import { PREDEFINED_FORMULAS } from "@/app/(app)/cabinet-designer/predefined-formulas";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, HelpCircle, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";


const cabinetPartTypes: CabinetPartType[] = [
  'Side Panel', 'Bottom Panel', 'Top Panel', 'Back Panel', 'Double Back Panel',
  'Door', 'Doors', 'Drawer Front', 'Drawer Back', 'Drawer Side', 'Drawer Counter Front',
  'Drawer Bottom', 'Mobile Shelf', 'Fixed Shelf', 'Upright', 'Front Panel',
  'Top Rail (Front)', 'Top Rail (Back)', 'Bottom Rail (Front)', 'Bottom Rail (Back)',
  'Stretcher', 'Toe Kick'
];

const cabinetTypeContexts: CabinetTypeContext[] = ['Base', 'Wall', 'Drawer', 'General'];

const CUSTOM_FORMULA_KEY = "CUSTOM";
const NO_EDGE_BANDING_PLACEHOLDER = "__NO_EDGE_BAND__";

const addPartFormSchema = z.object({
  partType: z.custom<CabinetPartType>((val) => cabinetPartTypes.includes(val as CabinetPartType), {
    message: "Valid part type is required.",
  }),
  cabinetContext: z.custom<CabinetTypeContext>((val) => cabinetTypeContexts.includes(val as CabinetTypeContext), {
    message: "Valid cabinet context is required.",
  }),
  nameLabel: z.string().min(1, "Part name label is required."),
  quantityFormula: z.string().min(1, "Quantity formula is required (e.g., '1', '2', or parameter).").default("1"),
  widthFormulaKey: z.string().optional(),
  customWidthFormula: z.string().optional(),
  heightFormulaKey: z.string().optional(),
  customHeightFormula: z.string().optional(),
  materialId: z.string().min(1, "Material selection is required."),
  edgeBandingMaterialId: z.string().optional().nullable(),
  grainDirection: z.enum(["with", "reverse", "none"]).nullable().default(null),
  edgeBanding_front: z.boolean().default(false),
  edgeBanding_back: z.boolean().default(false),
  edgeBanding_top: z.boolean().default(false),
  edgeBanding_bottom: z.boolean().default(false),
  notes: z.string().optional(),
}).refine(data => {
    if (data.widthFormulaKey === CUSTOM_FORMULA_KEY && !data.customWidthFormula?.trim()) {
        return false;
    }
    return true;
}, { message: "Custom width formula cannot be empty.", path: ["customWidthFormula"] })
.refine(data => {
    if (data.heightFormulaKey === CUSTOM_FORMULA_KEY && !data.customHeightFormula?.trim()) {
        return false;
    }
    return true;
}, { message: "Custom height formula cannot be empty.", path: ["customHeightFormula"] });


type AddPartFormValues = z.infer<typeof addPartFormSchema>;

interface AddPartDialogProps {
  setOpen: (open: boolean) => void;
  onAddPart: (newPart: PartDefinition) => void;
  existingPartCount: number;
  templateParameters: CabinetTemplateData['parameters'];
  materialOptions: GenericSelectItem[];
  onRequestOpenPanelMaterialDialog: () => void;
  onRequestOpenEdgeBandMaterialDialog: () => void;
  globalCustomFormulas: CustomFormulaEntry[];
}

export function AddPartDialog({
  setOpen,
  onAddPart,
  existingPartCount,
  templateParameters,
  materialOptions,
  onRequestOpenPanelMaterialDialog,
  onRequestOpenEdgeBandMaterialDialog,
  globalCustomFormulas,
}: AddPartDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultMaterialId = materialOptions.find(m => m.value === "STD_PANEL_18MM")?.value || materialOptions.find(m => m.type === 'panel')?.value || materialOptions[0]?.value || "";
  const edgeBandingMaterialOptions = React.useMemo(() => materialOptions.filter(m => m.type === 'edge_band'), [materialOptions]);


  const form = useForm<AddPartFormValues>({
    resolver: zodResolver(addPartFormSchema),
    defaultValues: {
      partType: 'Side Panel',
      cabinetContext: 'Base',
      nameLabel: "Side Panel",
      quantityFormula: "2",
      widthFormulaKey: PREDEFINED_FORMULAS.find(f => f.partType === 'Side Panel' && f.context?.includes('Base') && f.dimension === 'Width')?.key || CUSTOM_FORMULA_KEY,
      customWidthFormula: PREDEFINED_FORMULAS.find(f => f.partType === 'Side Panel' && f.context?.includes('Base') && f.dimension === 'Width')?.formula || "D",
      heightFormulaKey: PREDEFINED_FORMULAS.find(f => f.partType === 'Side Panel' && f.context?.includes('Base') && f.dimension === 'Height')?.key || CUSTOM_FORMULA_KEY,
      customHeightFormula: PREDEFINED_FORMULAS.find(f => f.partType === 'Side Panel' && f.context?.includes('Base') && f.dimension === 'Height')?.formula || "H - PT",
      materialId: defaultMaterialId,
      edgeBandingMaterialId: null,
      grainDirection: 'with',
      edgeBanding_front: true,
      edgeBanding_back: false,
      edgeBanding_top: false,
      edgeBanding_bottom: false,
      notes: "",
    },
  });

  const selectedPartType = form.watch("partType");
  const selectedCabinetContext = form.watch("cabinetContext");

  const getFilteredFormulas = React.useCallback((dimension: 'Width' | 'Height') => {
    const predefinedFiltered = PREDEFINED_FORMULAS.filter(f =>
      f.dimension === dimension &&
      (Array.isArray(f.partType) ? f.partType.includes(selectedPartType) : f.partType === selectedPartType || f.partType.length === 0) &&
      (f.context === null || (selectedCabinetContext && f.context.includes(selectedCabinetContext))) &&
      f.key !== CUSTOM_FORMULA_KEY
    ).map(f => ({ ...f, type: 'predefined' as const, id: f.key, key: f.key }));

    const relevantGlobalFormulas = (globalCustomFormulas || []).filter(f =>
        (f.dimensionType === 'Width' && dimension === 'Width') ||
        (f.dimensionType === 'Height' && dimension === 'Height')
    ).map(f_glob => ({
        id: f_glob.id, key: f_glob.id, name: `${f_glob.name} (Global)`, formula: f_glob.formulaString,
        description: f_glob.description || 'User-defined global formula.',
        example: `Global Formula: ${f_glob.formulaString}`, type: 'custom_db' as const,
        partType: [], context: null, dimension: f_glob.dimensionType,
    }));

    return [...predefinedFiltered, ...relevantGlobalFormulas].sort((a,b) => a.name.localeCompare(b.name));
  }, [selectedPartType, selectedCabinetContext, globalCustomFormulas]);

  const availableWidthFormulas = React.useMemo(() => getFilteredFormulas('Width'), [getFilteredFormulas]);
  const availableHeightFormulas = React.useMemo(() => getFilteredFormulas('Height'), [getFilteredFormulas]);


  React.useEffect(() => {
    if (selectedPartType) {
        const defaultLabel = selectedPartType.includes("Panel") || selectedPartType.includes("Door") || selectedPartType.includes("Shelf") || selectedPartType.includes("Front") ? selectedPartType : `${selectedPartType}`;
        form.setValue("nameLabel", defaultLabel, { shouldDirty: true });
        if (selectedPartType === 'Side Panel' || selectedPartType === 'Doors' || selectedPartType === 'Drawer Side' || selectedPartType === 'Top Rail (Front)' || selectedPartType === 'Top Rail (Back)') form.setValue("quantityFormula", "2", { shouldDirty: true });
        else form.setValue("quantityFormula", "1", { shouldDirty: true });

        const firstWidthFormula = availableWidthFormulas[0];
        if (firstWidthFormula) { form.setValue("widthFormulaKey", firstWidthFormula.key, { shouldDirty: true }); form.setValue("customWidthFormula", firstWidthFormula.formula, { shouldValidate: true }); }
        else { form.setValue("widthFormulaKey", CUSTOM_FORMULA_KEY, { shouldDirty: true }); form.setValue("customWidthFormula", "", { shouldValidate: true }); }

        const firstHeightFormula = availableHeightFormulas[0];
        if (firstHeightFormula) { form.setValue("heightFormulaKey", firstHeightFormula.key, { shouldDirty: true }); form.setValue("customHeightFormula", firstHeightFormula.formula, { shouldValidate: true }); }
        else { form.setValue("heightFormulaKey", CUSTOM_FORMULA_KEY, { shouldDirty: true }); form.setValue("customHeightFormula", "", { shouldValidate: true }); }
    }
  }, [selectedPartType, selectedCabinetContext, form, availableWidthFormulas, availableHeightFormulas]);

  async function onSubmit(values: AddPartFormValues) {
    setIsSubmitting(true);
    try {
      const edgeBanding: EdgeBandingAssignment = { front: values.edgeBanding_front, back: values.edgeBanding_back, top: values.edgeBanding_top, bottom: values.edgeBanding_bottom };

      let finalWidthFormula = values.customWidthFormula || "";
      if (values.widthFormulaKey !== CUSTOM_FORMULA_KEY) {
          const selectedFormula = [...availableWidthFormulas].find(f => f.key === values.widthFormulaKey);
          finalWidthFormula = selectedFormula?.formula || values.customWidthFormula || "";
      }

      let finalHeightFormula = values.customHeightFormula || "";
       if (values.heightFormulaKey !== CUSTOM_FORMULA_KEY) {
          const selectedFormula = [...availableHeightFormulas].find(f => f.key === values.heightFormulaKey);
          finalHeightFormula = selectedFormula?.formula || values.customHeightFormula || "";
      }

      const newPart: PartDefinition = {
        partId: `${values.partType.toLowerCase().replace(/[\s()]+/g, '_')}_${existingPartCount + 1}_${Date.now()}`, nameLabel: values.nameLabel, partType: values.partType, cabinetContext: values.cabinetContext,
        quantityFormula: values.quantityFormula, quantityFormulaKey: values.quantityFormula,
        widthFormula: finalWidthFormula, widthFormulaKey: values.widthFormulaKey,
        heightFormula: finalHeightFormula, heightFormulaKey: values.heightFormulaKey,
        materialId: values.materialId,
        edgeBandingMaterialId: values.edgeBandingMaterialId === NO_EDGE_BANDING_PLACEHOLDER ? null : values.edgeBandingMaterialId,
        grainDirection: values.grainDirection, edgeBanding: edgeBanding, notes: values.notes || `Added via dialog. Part Type: ${values.partType}`,
        thicknessFormula: null,
        thicknessFormulaKey: null,
      };
      onAddPart(newPart);
      toast({ title: "Part Added", description: `"${values.nameLabel}" has been added.` });
      setOpen(false); form.reset();
    } catch (error) {
      console.error("Failed to add part:", error);
      toast({ title: "Error", description: (error instanceof Error ? error.message : "Could not add part."), variant: "destructive" });
    } finally { setIsSubmitting(false); }
  }

  const renderFormulaSelect = (dimension: 'Width' | 'Height', availableFormulasForDim: Array<any>, valueKey: "widthFormulaKey" | "heightFormulaKey", customValueKey: "customWidthFormula" | "customHeightFormula") => (
    <FormField control={form.control} name={valueKey}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{dimension} Formula*</FormLabel>
          <div className="flex items-end gap-2">
             <div className="flex-grow">
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  if (val !== CUSTOM_FORMULA_KEY) {
                    const selectedF = availableFormulasForDim.find(f_item => f_item.key === val);
                    form.setValue(customValueKey, selectedF?.formula || "", {shouldValidate: true});
                  } else {
                    form.setValue(customValueKey, "", {shouldValidate: true});
                  }
                }}
                value={field.value}
              >
                <FormControl><SelectTrigger><SelectValue placeholder={`Select ${dimension.toLowerCase()} formula`} /></SelectTrigger></FormControl>
                <SelectContent>
                  {availableFormulasForDim.map((f_item) => (<SelectItem key={f_item.key || f_item.id} value={f_item.key || f_item.id}>{f_item.name} ({f_item.formula})</SelectItem>))}
                  <SelectItem value={CUSTOM_FORMULA_KEY}>Custom Formula...</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </div>
             <DropdownMenu>
                <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                    {availableFormulasForDim.map((item) => ( <DropdownMenuItem key={item.key || item.id} onSelect={() => { field.onChange(item.key || item.id); form.setValue(customValueKey, item.formula, {shouldValidate: true}); }} className="flex justify-between items-center text-xs">
                        <span className={item.type === 'custom_db' ? 'italic' : ''}>{item.name} ({item.formula})</span>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100"><HelpCircle className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent side="left" className="max-w-xs text-xs p-2 bg-popover text-popover-foreground"><p className="font-semibold">{item.description}</p><p className="text-xs text-muted-foreground">{item.example}</p></TooltipContent></Tooltip></DropdownMenuItem> ))}
                    <DropdownMenuItem key="CUSTOM" onSelect={() => { field.onChange(CUSTOM_FORMULA_KEY); form.setValue(customValueKey, "", {shouldValidate: true}); }} className="flex justify-between items-center text-xs"><span className="font-semibold">Custom Formula... (Type directly)</span></DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
           {field.value === CUSTOM_FORMULA_KEY && (
             <Controller name={customValueKey} control={form.control} render={({ field: customField }) => (<Textarea {...customField} placeholder={`Enter custom ${dimension.toLowerCase()} formula`} className="mt-2 text-sm" rows={2}/>)}/>
           )}
        </FormItem>)} /> );

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>Add New Part to Template</DialogTitle><DialogDescription>Select type, context, and define properties and formulas. Part thickness will be derived from the selected material.</DialogDescription></DialogHeader>
      <ScrollArea className="max-h-[75vh] pr-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="partType" render={({ field }) => (<FormItem><FormLabel>Part Type*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{cabinetPartTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="cabinetContext" render={({ field }) => (<FormItem><FormLabel>Cabinet Context*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select context" /></SelectTrigger></FormControl><SelectContent>{cabinetTypeContexts.map((ctx) => (<SelectItem key={ctx} value={ctx}>{ctx}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
            <FormField control={form.control} name="nameLabel" render={({ field }) => (<FormItem><FormLabel>Part Name Label*</FormLabel><FormControl><Input placeholder="e.g., Left Side Panel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="quantityFormula" render={({ field }) => (<FormItem><FormLabel>Quantity Formula*</FormLabel><FormControl><Input placeholder="e.g., 1 or 2" {...field} /></FormControl><FormMessage /></FormItem>)}/>

            {renderFormulaSelect('Width', availableWidthFormulas, 'widthFormulaKey', 'customWidthFormula')}
            {renderFormulaSelect('Height', availableHeightFormulas, 'heightFormulaKey', 'customHeightFormula')}

            <FormField control={form.control} name="materialId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Material (Panel)*</FormLabel>
                    <Button type="button" variant="link" size="sm" onClick={onRequestOpenPanelMaterialDialog} className="p-0 h-auto text-xs">
                      <PlusCircle className="mr-1 h-3 w-3" /> Define New...
                    </Button>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select panel material" /></SelectTrigger></FormControl>
                    <SelectContent>{materialOptions.filter(m => m.type === 'panel' || m.type === 'other').map((material) => (<SelectItem key={material.value} value={material.value}>{material.label}</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>)}/>

            <FormField control={form.control} name="grainDirection"
              render={({ field }) => (
                <FormItem><FormLabel>Grain Direction</FormLabel>
                  <FormControl><RadioGroup onValueChange={(value) => field.onChange(value === 'none' ? null : value as "with" | "reverse")} value={field.value || "none"} className="flex flex-row gap-4">
                          <FormItem className="flex items-center space-x-2"><RadioGroupItem value="none" id="grain-none-dlg" /><Label htmlFor="grain-none-dlg" className="font-normal">None</Label></FormItem>
                          <FormItem className="flex items-center space-x-2"><RadioGroupItem value="with" id="grain-with-dlg" /><Label htmlFor="grain-with-dlg" className="font-normal">With Grain (Height)</Label></FormItem>
                          <FormItem className="flex items-center space-x-2"><RadioGroupItem value="reverse" id="grain-reverse-dlg" /><Label htmlFor="grain-reverse-dlg" className="font-normal">Reverse Grain (Width)</Label></FormItem>
                      </RadioGroup></FormControl><FormMessage />
                </FormItem>)}/>

            <div>
              <Label className="text-base font-medium">Edge Banding Application</Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                {(['front', 'back', 'top', 'bottom'] as const).map((edge) => (<FormField key={edge} control={form.control} name={`edgeBanding_${edge}`} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label htmlFor={`edgeBanding_${edge}_${field.name}`} className="font-normal capitalize">{edge}</Label></FormItem>)}/>))}
              </div>
            </div>

            <FormField control={form.control} name="edgeBandingMaterialId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <Label>Edge Banding Material (Optional)</Label>
                     <Button type="button" variant="link" size="sm" onClick={onRequestOpenEdgeBandMaterialDialog} className="p-0 h-auto text-xs">
                      <PlusCircle className="mr-1 h-3 w-3" /> Define New...
                    </Button>
                  </div>
                  <Select
                    onValueChange={(value) => field.onChange(value === NO_EDGE_BANDING_PLACEHOLDER ? null : value)}
                    value={field.value || NO_EDGE_BANDING_PLACEHOLDER}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select edge banding material (optional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NO_EDGE_BANDING_PLACEHOLDER}>None</SelectItem>
                      {edgeBandingMaterialOptions.map((material) => (<SelectItem key={material.value} value={material.value}>{material.label}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>)}/>

            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Part Notes</FormLabel><FormControl><Textarea placeholder="Optional notes..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>

            <DialogFooter className="sticky bottom-0 bg-background py-4 border-t -mx-6 px-6">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Part to Template"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </ScrollArea>
    </DialogContent>
  );
}
