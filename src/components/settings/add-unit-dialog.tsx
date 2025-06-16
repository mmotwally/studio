
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
import { useToast } from "@/hooks/use-toast";
import { type UnitOfMeasurementFormValues, unitOfMeasurementSchema } from "@/app/(app)/settings/units/schema";
import { addUnitOfMeasurementAction } from "@/app/(app)/settings/units/actions";

interface AddUnitDialogProps {
  setOpen: (open: boolean) => void;
  onUnitAdded?: () => void;
}

export function AddUnitDialog({ setOpen, onUnitAdded }: AddUnitDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UnitOfMeasurementFormValues>({
    resolver: zodResolver(unitOfMeasurementSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
    },
  });

  async function onSubmit(values: UnitOfMeasurementFormValues) {
    setIsSubmitting(true);
    try {
      await addUnitOfMeasurementAction(values);
      toast({
        title: "Success",
        description: "Unit of measurement added successfully.",
      });
      if (onUnitAdded) {
        onUnitAdded();
      }
      setOpen(false);
      form.reset();
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

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add New Unit of Measurement</DialogTitle>
        <DialogDescription>
          Enter the details for the new unit.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Unit"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
    