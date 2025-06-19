
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
import { type AccessoryTypeFormValues, accessoryTypeFormSchema } from "@/app/(app)/cabinet-designer/accessory-type-schema";
import { saveAccessoryDefinitionAction } from "@/app/(app)/cabinet-designer/actions";
import { getSuppliersForSelect } from "@/app/(app)/settings/suppliers/actions"; // Assuming you have this
import type { SelectItem as GenericSelectItem } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";


interface AddAccessoryTypeDialogProps {
  setOpen: (open: boolean) => void;
  onAccessoryTypeAdded: () => void;
}

export function AddAccessoryTypeDialog({ setOpen, onAccessoryTypeAdded }: AddAccessoryTypeDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [suppliers, setSuppliers] = React.useState<GenericSelectItem[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(true);

  const form = useForm<AccessoryTypeFormValues>({
    resolver: zodResolver(accessoryTypeFormSchema),
    defaultValues: {
      name: "",
      type: "other",
      unitCost: 0.01,
      description: "",
      supplierId: undefined,
      sku: "",
    },
  });

  React.useEffect(() => {
    async function loadSuppliers() {
      setIsLoadingSuppliers(true);
      try {
        const fetchedSuppliers = await getSuppliersForSelect();
        setSuppliers(fetchedSuppliers);
      } catch (error) {
        console.error("Failed to load suppliers:", error);
        toast({ title: "Error", description: "Could not load supplier list.", variant: "destructive" });
      } finally {
        setIsLoadingSuppliers(false);
      }
    }
    loadSuppliers();
  }, [toast]);

  async function onSubmit(values: AccessoryTypeFormValues) {
    setIsSubmitting(true);
    try {
      await saveAccessoryDefinitionAction(values);
      toast({
        title: "Success",
        description: `Accessory type "${values.name}" saved successfully.`,
      });
      onAccessoryTypeAdded();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to save accessory type:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not save accessory type."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Define New Accessory Type</DialogTitle>
        <DialogDescription>
          Enter the details for a new accessory type to be available globally.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4">
              <FormField control={form.control} name="name"
                render={({ field }) => (
                  <FormItem><FormLabel>Accessory Name*</FormLabel>
                    <FormControl><Input placeholder="e.g., Heavy Duty Drawer Slide (Pair)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>)} />
              <FormField control={form.control} name="type"
                render={({ field }) => (
                  <FormItem><FormLabel>Accessory Type*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="hinge">Hinge</SelectItem>
                        <SelectItem value="drawer_slide">Drawer Slide</SelectItem>
                        <SelectItem value="handle">Handle/Knob</SelectItem>
                        <SelectItem value="shelf_pin">Shelf Pin</SelectItem>
                        <SelectItem value="leg">Leg</SelectItem>
                        <SelectItem value="screw">Screw/Fastener</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)} />
              <FormField control={form.control} name="unitCost"
                render={({ field }) => (
                  <FormItem><FormLabel>Unit Cost ($)*</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 12.50" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl>
                    <FormMessage />
                  </FormItem>)} />
              <FormField control={form.control} name="description"
                render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Optional description..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>)} />
              <FormField control={form.control} name="supplierId"
                render={({ field }) => (
                  <FormItem><FormLabel>Supplier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingSuppliers}>
                      <FormControl><SelectTrigger><SelectValue placeholder={isLoadingSuppliers ? "Loading..." : "Select a supplier"} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {suppliers.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)} />
              <FormField control={form.control} name="sku"
                render={({ field }) => (
                  <FormItem><FormLabel>SKU (Optional)</FormLabel>
                    <FormControl><Input placeholder="Supplier SKU or part number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>)} />
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Accessory Type"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
