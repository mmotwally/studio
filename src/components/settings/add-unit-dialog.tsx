
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { type UnitOfMeasurementFormValues, unitOfMeasurementSchema } from "@/app/(app)/settings/units/schema";
import { addUnitOfMeasurementAction, getUnitsOfMeasurement } from "@/app/(app)/settings/units/actions";
import type { UnitOfMeasurementDB } from "@/types";

interface AddUnitDialogProps {
  setOpen: (open: boolean) => void;
  onUnitAdded?: () => void;
}

export function AddUnitDialog({ setOpen, onUnitAdded }: AddUnitDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [existingUnits, setExistingUnits] = React.useState<UnitOfMeasurementDB[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = React.useState(true);

  const form = useForm<UnitOfMeasurementFormValues>({
    resolver: zodResolver(unitOfMeasurementSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      baseUnitId: undefined,
      conversionFactor: 1.0,
    },
  });

  const watchedBaseUnitId = form.watch("baseUnitId");

  React.useEffect(() => {
    async function fetchUnits() {
      setIsLoadingUnits(true);
      try {
        const units = await getUnitsOfMeasurement();
        setExistingUnits(units);
      } catch (error) {
        console.error("Failed to fetch units for dialog:", error);
        toast({
          title: "Error",
          description: "Could not load existing units for selection.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUnits(false);
      }
    }
    fetchUnits();
  }, [toast]);

  React.useEffect(() => {
    if (!watchedBaseUnitId) {
      form.setValue("conversionFactor", 1.0, { shouldValidate: true });
    }
  }, [watchedBaseUnitId, form]);


  async function onSubmit(values: UnitOfMeasurementFormValues) {
    setIsSubmitting(true);
    
    const submissionValues = {
      ...values,
      baseUnitId: values.baseUnitId || null, // Ensure null if empty/undefined
      conversionFactor: values.baseUnitId ? values.conversionFactor : 1.0,
    };

    try {
      await addUnitOfMeasurementAction(submissionValues);
      toast({
        title: "Success",
        description: "Unit of measurement added successfully.",
      });
      if (onUnitAdded) {
        onUnitAdded(); // This should trigger re-fetch in parent
        fetchUnitsForDropdown(); // Re-fetch units for this dialog's dropdown
      }
      setOpen(false);
      form.reset({ name: "", abbreviation: "", baseUnitId: undefined, conversionFactor: 1.0 });
    } catch (error) {
      console.error("Failed to add unit:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not add unit.") || "Could not add unit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  async function fetchUnitsForDropdown() {
    setIsLoadingUnits(true);
    try {
      const units = await getUnitsOfMeasurement();
      setExistingUnits(units);
    } catch (error) {
      // Error already handled by toast in initial load, or can be shown again
    } finally {
      setIsLoadingUnits(false);
    }
  }


  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Unit of Measurement</DialogTitle>
        <DialogDescription>
          Enter the details for the new unit. Specify a base unit and conversion factor if applicable.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Pieces, Kilograms" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Abbreviation</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., pcs, kg" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="baseUnitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Unit (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingUnits}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingUnits ? "Loading units..." : "Select a base unit (if applicable)"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None (This is a base unit)</SelectItem>
                    {existingUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>If this unit is derived from another (e.g., Kilogram from Gram).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {watchedBaseUnitId && (
            <FormField
              control={form.control}
              name="conversionFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversion Factor*</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="any" 
                      placeholder="e.g., 1000" {...field} 
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                      value={field.value === undefined ? "" : field.value}
                    />
                  </FormControl>
                  <FormDescription>How many selected Base Units are in 1 of this new Unit (e.g., if Base is Gram and New is Kilogram, factor is 1000).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || isLoadingUnits}>
              {isSubmitting ? "Saving..." : "Save Unit"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
