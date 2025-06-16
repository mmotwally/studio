
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
import { type LocationFormValues, locationSchema } from "@/app/(app)/settings/locations/schema";
import { addLocationAction } from "@/app/(app)/settings/locations/actions";

interface AddLocationDialogProps {
  setOpen: (open: boolean) => void;
  onLocationAdded?: () => void;
}

export function AddLocationDialog({ setOpen, onLocationAdded }: AddLocationDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      store: "",
      rack: "",
      shelf: "",
    },
  });

  async function onSubmit(values: LocationFormValues) {
    setIsSubmitting(true);
    try {
      await addLocationAction(values);
      toast({
        title: "Success",
        description: "Location added successfully.",
      });
      if (onLocationAdded) {
        onLocationAdded();
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to add location:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not add location.") || "Could not add location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogDescription>
          Enter the details for the new location.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="store"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store / Building*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Main Warehouse, Store A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rack"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rack</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., R10, Section 2" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="shelf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shelf / Bin</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., S05, Bin 3A" {...field} value={field.value ?? ""} />
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
              {isSubmitting ? "Saving..." : "Save Location"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
    