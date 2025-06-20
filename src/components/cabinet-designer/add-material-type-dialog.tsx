
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { type MaterialTypeFormValues, materialTypeFormSchema } from "@/app/(app)/cabinet-designer/material-type-schema";
import { saveMaterialDefinitionAction } from "@/app/(app)/cabinet-designer/actions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddMaterialTypeDialogProps {
  setOpen: (open: boolean) => void;
  onMaterialTypeAdded: () => void;
  initialType?: "panel" | "edge_band" | "other" | null;
}

export function AddMaterialTypeDialog({ setOpen, onMaterialTypeAdded, initialType }: AddMaterialTypeDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<MaterialTypeFormValues>({
    resolver: zodResolver(materialTypeFormSchema),
    // Default values will be set by useEffect based on initialType
  });
  
  const watchedType = form.watch("type");

  React.useEffect(() => {
    // Reset the form with appropriate defaults when initialType changes or dialog opens
    form.reset({
      name: "",
      type: initialType || "panel",
      costPerSqm: initialType === "panel" || !initialType ? 0 : undefined,
      costPerMeter: initialType === "edge_band" ? 0 : undefined,
      thickness: initialType === "panel" || !initialType ? 18 : undefined,
      defaultSheetWidth: initialType === "panel" || !initialType ? 2440 : undefined,
      defaultSheetHeight: initialType === "panel" || !initialType ? 1220 : undefined,
      hasGrain: initialType === "panel" ? false : undefined, // Only relevant for panels
      notes: "",
    });
  }, [initialType, form]);


  async function onSubmit(values: MaterialTypeFormValues) {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...values,
        costPerSqm: values.type === 'panel' ? values.costPerSqm : null,
        costPerMeter: values.type === 'edge_band' ? values.costPerMeter : null,
        thickness: values.type === 'panel' ? values.thickness : null,
        defaultSheetWidth: values.type === 'panel' ? values.defaultSheetWidth : null,
        defaultSheetHeight: values.type === 'panel' ? values.defaultSheetHeight : null,
        hasGrain: values.type === 'panel' ? values.hasGrain : false, // Ensure hasGrain is boolean for panel, false otherwise
      };

      await saveMaterialDefinitionAction(dataToSave);
      toast({
        title: "Success",
        description: `Material type "${values.name}" saved successfully.`,
      });
      onMaterialTypeAdded();
      setOpen(false);
    } catch (error) {
      console.error("Failed to save material type:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not save material type."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Define New Material Type</DialogTitle>
        <DialogDescription>
          Enter the details for a new material type to be available globally.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Name*</FormLabel>
                    <FormControl><Input placeholder="e.g., Birch Plywood 18mm AA" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Type*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="panel">Panel (Sheet Material)</SelectItem>
                        <SelectItem value="edge_band">Edge Banding</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchedType === "panel" && (
                <>
                  <FormField control={form.control} name="costPerSqm"
                    render={({ field }) => (
                      <FormItem><FormLabel>Cost per Square Meter ($)*</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 25.50" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>)} />
                  <FormField control={form.control} name="thickness"
                    render={({ field }) => (
                      <FormItem><FormLabel>Thickness (mm)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="e.g., 18" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>)} />
                  <FormField control={form.control} name="defaultSheetWidth"
                    render={({ field }) => (
                      <FormItem><FormLabel>Default Sheet Width (mm)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 2440" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                        <FormMessage />
                      </FormItem>)} />
                  <FormField control={form.control} name="defaultSheetHeight"
                    render={({ field }) => (
                      <FormItem><FormLabel>Default Sheet Height (mm)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 1220" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                        <FormMessage />
                      </FormItem>)} />
                  <FormField control={form.control} name="hasGrain"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 pt-2">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal mb-0!">Has Grain Direction</FormLabel>
                      </FormItem>)} />
                </>
              )}
              {watchedType === "edge_band" && (
                <FormField control={form.control} name="costPerMeter"
                  render={({ field }) => (
                    <FormItem><FormLabel>Cost per Meter ($)*</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g., 0.75" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>)} />
              )}
              <FormField control={form.control} name="notes"
                render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel>
                    <FormControl><Textarea placeholder="Optional notes about this material..." {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>)} />
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Material Type"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
