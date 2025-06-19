
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
import type { PartDefinition, CabinetPartType, EdgeBandingAssignment, CabinetTypeContext, PredefinedFormula, CabinetTemplateData, SelectItem as GenericSelectItem } from "@/app/(app)/cabinet-designer/types";
import { PREDEFINED_FORMULAS } from "@/app/(app)/cabinet-designer/predefined-formulas";
import { Textarea } from "@/components/ui/textarea";

const cabinetPartTypes: CabinetPartType[] = [
  'Side Panel', 'Bottom Panel', 'Top Panel', 'Back Panel', 'Double Back Panel', 
  'Door', 'Doors', 'Drawer Front', 'Drawer Back', 'Drawer Side', 'Drawer Counter Front', 
  'Drawer Bottom', 'Mobile Shelf', 'Fixed Shelf', 'Upright', 'Front Panel',
  'Top Rail (Front)', 'Top Rail (Back)', 'Bottom Rail (Front)', 'Bottom Rail (Back)',
  'Stretcher', 'Toe Kick'
];

const cabinetTypeContexts: CabinetTypeContext[] = ['Base', 'Wall', 'Drawer', 'General'];

const CUSTOM_FORMULA_KEY = "CUSTOM_FORMULA_KEY";

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
  thicknessChoice: z.enum(["global", "custom"]).default("global"),
  customThicknessValue: z.string().optional(),
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
}, { message: "Custom height formula cannot be empty.", path: ["customHeightFormula"] })
.refine(data => {
    if (data.thicknessChoice === "custom" && (!data.customThicknessValue?.trim() || isNaN(parseFloat(data.customThicknessValue)) || parseFloat(data.customThicknessValue) <=0 )) {
        return false;
    }
    return true;
}, { message: "Custom thickness must be a valid positive number.", path: ["customThicknessValue"] });

type AddPartFormValues = z.infer<typeof addPartFormSchema>;

interface AddPartDialogProps {
  setOpen: (open: boolean) => void;
  onAddPart: (newPart: PartDefinition) => void;
  existingPartCount: number;
  templateParameters: CabinetTemplateData['parameters']; 
  materialOptions: GenericSelectItem[];
}

export function AddPartDialog({ setOpen, onAddPart, existingPartCount, templateParameters, materialOptions }: AddPartDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultMaterialId = materialOptions.find(m => m.value === "STD_PANEL_18MM")?.value || materialOptions[0]?.value || "";

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
      thicknessChoice: "global",
      customThicknessValue: "",
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
  const selectedThicknessChoice = form.watch("thicknessChoice");

  const getFilteredFormulas = (dimension: 'Width' | 'Height') => {
    return PREDEFINED_FORMULAS.filter(f =>
      f.dimension === dimension &&
      (Array.isArray(f.partType) ? f.partType.includes(selectedPartType) : f.partType === selectedPartType || f.partType.length === 0) &&
      (f.context === null || (selectedCabinetContext && f.context.includes(selectedCabinetContext))) &&
      f.key !== CUSTOM_FORMULA_KEY 
    ).sort((a,b) => a.name.localeCompare(b.name));
  };
  
  const availableWidthFormulas = React.useMemo(() => getFilteredFormulas('Width'), [selectedPartType, selectedCabinetContext]);
  const availableHeightFormulas = React.useMemo(() => getFilteredFormulas('Height'), [selectedPartType, selectedCabinetContext]);

  React.useEffect(() => {
    if (selectedPartType) {
        const defaultLabel = selectedPartType.includes("Panel") || selectedPartType.includes("Door") || selectedPartType.includes("Shelf") || selectedPartType.includes("Front") ? selectedPartType : `${selectedPartType}`;
        form.setValue("nameLabel", defaultLabel, { shouldDirty: true });
        if (selectedPartType === 'Side Panel' || selectedPartType === 'Doors' || selectedPartType === 'Drawer Side' || selectedPartType === 'Top Rail (Front)' || selectedPartType === 'Top Rail (Back)') form.setValue("quantityFormula", "2", { shouldDirty: true });
        else form.setValue("quantityFormula", "1", { shouldDirty: true });
        
        const firstWidthFormula = availableWidthFormulas[0];
        if (firstWidthFormula) { form.setValue("widthFormulaKey", firstWidthFormula.key, { shouldDirty: true }); form.setValue("customWidthFormula", firstWidthFormula.formula, { shouldDirty: true }); }
        else { form.setValue("widthFormulaKey", CUSTOM_FORMULA_KEY, { shouldDirty: true }); form.setValue("customWidthFormula", "", { shouldDirty: true }); }

        const firstHeightFormula = availableHeightFormulas[0];
        if (firstHeightFormula) { form.setValue("heightFormulaKey", firstHeightFormula.key, { shouldDirty: true }); form.setValue("customHeightFormula", firstHeightFormula.formula, { shouldDirty: true }); }
        else { form.setValue("heightFormulaKey", CUSTOM_FORMULA_KEY, { shouldDirty: true }); form.setValue("customHeightFormula", "", { shouldDirty: true }); }
    }
  }, [selectedPartType, selectedCabinetContext, form, availableWidthFormulas, availableHeightFormulas]);

  async function onSubmit(values: AddPartFormValues) {
    setIsSubmitting(true);
    try {
      const edgeBanding: EdgeBandingAssignment = { front: values.edgeBanding_front, back: values.edgeBanding_back, top: values.edgeBanding_top, bottom: values.edgeBanding_bottom };
      const finalWidthFormula = values.widthFormulaKey === CUSTOM_FORMULA_KEY ? values.customWidthFormula || "" : PREDEFINED_FORMULAS.find(f => f.key === values.widthFormulaKey)?.formula || values.customWidthFormula || "";
      const finalHeightFormula = values.heightFormulaKey === CUSTOM_FORMULA_KEY ? values.customHeightFormula || "" : PREDEFINED_FORMULAS.find(f => f.key === values.heightFormulaKey)?.formula || values.customHeightFormula || "";
      const finalThicknessFormula = values.thicknessChoice === "global" ? "PT" : values.customThicknessValue || "PT"; 
      const newPart: PartDefinition = {
        partId: `${values.partType.toLowerCase().replace(/[\s()]+/g, '_')}_${existingPartCount + 1}_${Date.now()}`, nameLabel: values.nameLabel, partType: values.partType, cabinetContext: values.cabinetContext,
        quantityFormula: values.quantityFormula, widthFormula: finalWidthFormula, widthFormulaKey: values.widthFormulaKey, heightFormula: finalHeightFormula, heightFormulaKey: values.heightFormulaKey,
        thicknessFormula: finalThicknessFormula, materialId: values.materialId, grainDirection: values.grainDirection, edgeBanding: edgeBanding, notes: values.notes || `Added via dialog. Part Type: ${values.partType}`,
      };
      onAddPart(newPart);
      toast({ title: "Part Added", description: `"${values.nameLabel}" has been added.` });
      setOpen(false); form.reset(); 
    } catch (error) {
      console.error("Failed to add part:", error);
      toast({ title: "Error", description: (error instanceof Error ? error.message : "Could not add part."), variant: "destructive" });
    } finally { setIsSubmitting(false); }
  }

  const renderFormulaSelect = (dimension: 'Width' | 'Height', availableFormulas: PredefinedFormula[], valueKey: "widthFormulaKey" | "heightFormulaKey", customValueKey: "customWidthFormula" | "customHeightFormula") => (
    <FormField control={form.control} name={valueKey}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{dimension} Formula*</FormLabel>
          <Select onValueChange={(val) => { field.onChange(val); if (val !== CUSTOM_FORMULA_KEY) { const selected = PREDEFINED_FORMULAS.find(f => f.key === val); form.setValue(customValueKey, selected?.formula || "", {shouldValidate: true}); } else { form.setValue(customValueKey, "", {shouldValidate: true}); }}} value={field.value}>
            <FormControl><SelectTrigger><SelectValue placeholder={`Select ${dimension.toLowerCase()} formula`} /></SelectTrigger></FormControl>
            <SelectContent>
              {availableFormulas.map((f) => (<SelectItem key={f.key} value={f.key}>{f.name} ({f.formula})</SelectItem>))}
              <SelectItem value={CUSTOM_FORMULA_KEY}>Custom Formula...</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
           {field.value === CUSTOM_FORMULA_KEY && (
             <Controller name={customValueKey} control={form.control} render={({ field: customField }) => (<Textarea {...customField} placeholder={`Enter custom ${dimension.toLowerCase()} formula`} className="mt-2 text-sm" rows={2}/>)}/>
           )}
            {form.formState.errors[customValueKey] && <FormMessage>{form.formState.errors[customValueKey]?.message}</FormMessage>}
        </FormItem>)} /> );

  return (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add New Part to Template</DialogTitle><DialogDescription>Select type, context, and define properties and formulas.</DialogDescription></DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="partType" render={({ field }) => (<FormItem><FormLabel>Part Type*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{cabinetPartTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="cabinetContext" render={({ field }) => (<FormItem><FormLabel>Cabinet Context*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select context" /></SelectTrigger></FormControl><SelectContent>{cabinetTypeContexts.map((ctx) => (<SelectItem key={ctx} value={ctx}>{ctx}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
          </div>
           <FormField control={form.control} name="nameLabel" render={({ field }) => (<FormItem><FormLabel>Part Name Label*</FormLabel><FormControl><Input placeholder="e.g., Left Side Panel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="quantityFormula" render={({ field }) => (<FormItem><FormLabel>Quantity Formula*</FormLabel><FormControl><Input placeholder="e.g., 1 or 2" {...field} /></FormControl><FormMessage /></FormItem>)}/>
          {renderFormulaSelect('Width', availableWidthFormulas, 'widthFormulaKey', 'customWidthFormula')}
          {renderFormulaSelect('Height', availableHeightFormulas, 'heightFormulaKey', 'customHeightFormula')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="materialId"
              render={({ field }) => (
                <FormItem><FormLabel>Material*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger></FormControl>
                    <SelectContent>{materialOptions.map((material) => (<SelectItem key={material.value} value={material.value}>{material.label}</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="thicknessChoice"
                render={({ field }) => (
                <FormItem><FormLabel>Part Thickness*</FormLabel>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                        <FormItem className="flex items-center space-x-2"><RadioGroupItem value="global" id="thickness-global-dlg" /><Label htmlFor="thickness-global-dlg" className="font-normal">Use Global Panel Thickness (PT)</Label></FormItem>
                        <FormItem className="flex items-center space-x-2"><RadioGroupItem value="custom" id="thickness-custom-dlg" /><Label htmlFor="thickness-custom-dlg" className="font-normal">Specify Custom Thickness (mm)</Label></FormItem>
                    </RadioGroup><FormMessage />
                </FormItem>)}/>
           </div>
            {selectedThicknessChoice === "custom" && (<FormField control={form.control} name="customThicknessValue" render={({ field }) => (<FormItem><FormLabel>Custom Thickness Value (mm)*</FormLabel><FormControl><Input type="number" placeholder="e.g., 19" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>)}
          <FormField control={form.control} name="grainDirection"
            render={({ field }) => (
              <FormItem><FormLabel>Grain Direction</FormLabel>
                <FormControl><RadioGroup onValueChange={(value) => field.onChange(value === 'none' ? null : value as "with" | "reverse")} value={field.value || "none"} className="flex flex-row gap-4">
                        <FormItem className="flex items-center space-x-2"><RadioGroupItem value="none" id="grain-none-dlg" /><Label htmlFor="grain-none-dlg" className="font-normal">None</Label></FormItem>
                        <FormItem className="flex items-center space-x-2"><RadioGroupItem value="with" id="grain-with-dlg" /><Label htmlFor="grain-with-dlg" className="font-normal">With Grain (Height)</Label></FormItem>
                        <FormItem className="flex items-center space-x-2"><RadioGroupItem value="reverse" id="grain-reverse-dlg" /><Label htmlFor="grain-reverse-dlg" className="font-normal">Reverse Grain (Width)</Label></FormItem>
                    </RadioGroup></FormControl><FormMessage />
              </FormItem>)}/>
          <div><FormLabel className="text-base font-medium">Edge Banding</FormLabel><div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
              {(['front', 'back', 'top', 'bottom'] as const).map((edge) => (<FormField key={edge} control={form.control} name={`edgeBanding_${edge}`} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label htmlFor={`edgeBanding_${edge}_${field.name}`} className="font-normal capitalize">{edge}</Label></FormItem>)}/>))}</div></div>
          <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Part Notes</FormLabel><FormControl><Textarea placeholder="Optional notes..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Part to Template"}</Button></DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
