
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { PartDefinition, CabinetPartType, EdgeBandingAssignment } from "@/app/(app)/cabinet-designer/types";
import { PREDEFINED_MATERIALS } from "@/app/(app)/cabinet-designer/types"; // Assuming materials are exported

const cabinetPartTypes: CabinetPartType[] = [
  'Side Panel', 'Bottom Panel', 'Top Panel', 'Back Panel', 'Double Back Panel', 
  'Door', 'Doors', 'Drawer Front', 'Drawer Back', 'Drawer Side', 'Drawer Counter Front', 
  'Drawer Bottom', 'Mobile Shelf', 'Fixed Shelf', 'Upright', 'Front Panel',
  'Top Rail (Front)', 'Top Rail (Back)', 'Bottom Rail (Front)', 'Bottom Rail (Back)',
  'Stretcher', 'Toe Kick'
];

// Schema for the Add Part Dialog form
const addPartFormSchema = z.object({
  partType: z.custom<CabinetPartType>((val) => cabinetPartTypes.includes(val as CabinetPartType), {
    message: "Valid part type is required.",
  }),
  nameLabel: z.string().min(1, "Part name label is required."),
  quantityFormula: z.string().min(1, "Quantity formula is required (e.g., '1', '2').").default("1"),
  materialId: z.string().min(1, "Material selection is required."),
  grainDirection: z.enum(["with", "reverse", "none"]).nullable().default(null),
  edgeBanding_front: z.boolean().default(false),
  edgeBanding_back: z.boolean().default(false),
  edgeBanding_top: z.boolean().default(false),
  edgeBanding_bottom: z.boolean().default(false),
  // widthFormula, heightFormula, thicknessFormula will be initially basic or set by user later
});

type AddPartFormValues = z.infer<typeof addPartFormSchema>;

interface AddPartDialogProps {
  setOpen: (open: boolean) => void;
  onAddPart: (newPart: PartDefinition) => void;
  existingPartCount: number;
}

export function AddPartDialog({ setOpen, onAddPart, existingPartCount }: AddPartDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AddPartFormValues>({
    resolver: zodResolver(addPartFormSchema),
    defaultValues: {
      partType: 'Side Panel', // Default selection
      nameLabel: "",
      quantityFormula: "1",
      materialId: PREDEFINED_MATERIALS[0]?.id || "", // Default to first material or empty
      grainDirection: null,
      edgeBanding_front: false,
      edgeBanding_back: false,
      edgeBanding_top: false,
      edgeBanding_bottom: false,
    },
  });
  
  const selectedPartType = form.watch("partType");

  React.useEffect(() => {
    if (selectedPartType) {
        const defaultLabel = selectedPartType.includes("Panel") || selectedPartType.includes("Door") || selectedPartType.includes("Shelf") || selectedPartType.includes("Front")
                            ? selectedPartType 
                            : `${selectedPartType}`;
        form.setValue("nameLabel", defaultLabel);

        // Basic quantity logic
        if (selectedPartType === 'Side Panel' || selectedPartType === 'Doors' || selectedPartType === 'Drawer Side' || selectedPartType === 'Top Rail (Front)' || selectedPartType === 'Top Rail (Back)') {
            form.setValue("quantityFormula", "2");
        } else {
            form.setValue("quantityFormula", "1");
        }
    }
  }, [selectedPartType, form]);


  async function onSubmit(values: AddPartFormValues) {
    setIsSubmitting(true);
    try {
      const edgeBanding: EdgeBandingAssignment = {
        front: values.edgeBanding_front,
        back: values.edgeBanding_back,
        top: values.edgeBanding_top,
        bottom: values.edgeBanding_bottom,
      };

      const newPart: PartDefinition = {
        partId: `${values.partType.toLowerCase().replace(/\s+/g, '_')}_${existingPartCount + 1}_${Date.now()}`,
        nameLabel: values.nameLabel,
        partType: values.partType,
        quantityFormula: values.quantityFormula,
        widthFormula: "W", // Default placeholder, user to edit
        heightFormula: "H", // Default placeholder
        thicknessFormula: "PT", // Default placeholder
        materialId: values.materialId,
        grainDirection: values.grainDirection,
        edgeBanding: edgeBanding,
        notes: `Added via dialog. Part Type: ${values.partType}`,
      };

      onAddPart(newPart);
      toast({
        title: "Part Added",
        description: `"${values.nameLabel}" has been added to the template.`,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to add part:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not add part.") || "Could not add part.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Part to Template</DialogTitle>
        <DialogDescription>
          Select the type of part and configure its basic properties. Formulas can be refined later.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          <FormField
            control={form.control}
            name="partType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Part Type*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a part type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cabinetPartTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="nameLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Part Name Label*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Left Side Panel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="quantityFormula"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity Formula*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 1 or 2" {...field} />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="materialId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PREDEFINED_MATERIALS.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} {material.hasGrain ? "(Grain)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="grainDirection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grain Direction</FormLabel>
                <FormControl>
                    <RadioGroup
                        onValueChange={(value) => field.onChange(value === 'none' ? null : value as "with" | "reverse")}
                        value={field.value || "none"}
                        className="flex flex-row gap-4"
                    >
                        <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="grain-none" />
                        <Label htmlFor="grain-none" className="font-normal">None</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="with" id="grain-with" />
                        <Label htmlFor="grain-with" className="font-normal">With Grain (Height)</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="reverse" id="grain-reverse" />
                        <Label htmlFor="grain-reverse" className="font-normal">Reverse Grain (Width)</Label>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel className="text-base font-medium">Edge Banding</FormLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
              {(['front', 'back', 'top', 'bottom'] as const).map((edge) => (
                <FormField
                  key={edge}
                  control={form.control}
                  name={`edgeBanding_${edge}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal capitalize">{edge}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Part to Template"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
