
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { type CustomFormulaFormValues, customFormulaSchema } from "@/app/(app)/cabinet-designer/custom-formula-schema";
import { saveCustomFormulaAction } from "@/app/(app)/cabinet-designer/actions";
import type { CabinetPartType, CabinetTypeContext } from "@/app/(app)/cabinet-designer/types";

const cabinetPartTypes: CabinetPartType[] = [
  'Side Panel', 'Bottom Panel', 'Top Panel', 'Back Panel', 'Double Back Panel',
  'Door', 'Doors', 'Drawer Front', 'Drawer Back', 'Drawer Side', 'Drawer Counter Front',
  'Drawer Bottom', 'Mobile Shelf', 'Fixed Shelf', 'Upright', 'Front Panel',
  'Top Rail (Front)', 'Top Rail (Back)', 'Bottom Rail (Front)', 'Bottom Rail (Back)',
  'Stretcher', 'Toe Kick'
];
const cabinetTypeContexts: CabinetTypeContext[] = ['Base', 'Wall', 'Drawer', 'General'];

const ALL_TYPES_PLACEHOLDER = "__ALL__";


interface AddCustomFormulaDialogProps {
  setOpen: (open: boolean) => void;
  onFormulaAdded: () => void;
}

export function AddCustomFormulaDialog({ setOpen, onFormulaAdded }: AddCustomFormulaDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CustomFormulaFormValues>({
    resolver: zodResolver(customFormulaSchema),
    defaultValues: {
      name: "",
      formulaString: "",
      dimensionType: "Width",
      description: "",
      partType: null,
      context: null,
    },
  });

  async function onSubmit(values: CustomFormulaFormValues) {
    setIsSubmitting(true);
    try {
      await saveCustomFormulaAction(
        values.name, 
        values.formulaString, 
        values.dimensionType, 
        values.description || undefined,
        values.partType,
        values.context
      );
      toast({
        title: "Success",
        description: `Global formula "${values.name}" saved successfully.`,
      });
      onFormulaAdded();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to save global formula:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not save formula."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Define New Global Formula</DialogTitle>
        <DialogDescription>
          Create a reusable formula. You can optionally associate it with a part type and context to narrow down when it appears in dropdowns. Use parameters like W, H, D, and PT.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FormField control={form.control} name="name"
            render={({ field }) => (
              <FormItem><FormLabel>Formula Name*</FormLabel>
                <FormControl><Input placeholder="e.g., Standard Shelf Depth" {...field} /></FormControl>
                <FormMessage />
              </FormItem>)}
          />
          <FormField control={form.control} name="formulaString"
            render={({ field }) => (
              <FormItem><FormLabel>Formula String*</FormLabel>
                <FormControl><Input placeholder="e.g., D - BPO - 10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>)}
          />
          <FormField control={form.control} name="dimensionType"
            render={({ field }) => (
              <FormItem><FormLabel>Applies to Dimension*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Width">Width</SelectItem>
                    <SelectItem value="Height">Height</SelectItem>
                    <SelectItem value="Quantity">Quantity</SelectItem>
                    <SelectItem value="Thickness">Thickness</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>)}
          />
           <FormField control={form.control} name="partType"
            render={({ field }) => (
              <FormItem><FormLabel>Part Type Association (Optional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === ALL_TYPES_PLACEHOLDER ? null : value)}
                  value={field.value || ALL_TYPES_PLACEHOLDER}>
                  <FormControl><SelectTrigger><SelectValue placeholder="All Part Types"/></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_TYPES_PLACEHOLDER}>All Part Types</SelectItem>
                    {cabinetPartTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>)}
          />
           <FormField control={form.control} name="context"
            render={({ field }) => (
              <FormItem><FormLabel>Context Association (Optional)</FormLabel>
                 <Select
                    onValueChange={(value) => field.onChange(value === ALL_TYPES_PLACEHOLDER ? null : value)}
                    value={field.value || ALL_TYPES_PLACEHOLDER}>
                  <FormControl><SelectTrigger><SelectValue placeholder="All Contexts" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_TYPES_PLACEHOLDER}>All Contexts</SelectItem>
                    {cabinetTypeContexts.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>)}
          />
          <FormField control={form.control} name="description"
            render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Optional description of what this formula calculates..." {...field} value={field.value ?? ""} /></FormControl>
                <FormMessage />
              </FormItem>)}
          />

          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Global Formula"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
