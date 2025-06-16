
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
import { useToast } from "@/hooks/use-toast";
import { type SupplierFormValues, supplierSchema } from "@/app/(app)/settings/suppliers/schema";
import { addSupplierAction } from "@/app/(app)/settings/suppliers/actions";

interface AddSupplierDialogProps {
  setOpen: (open: boolean) => void;
  onSupplierAdded?: () => void;
}

export function AddSupplierDialog({ setOpen, onSupplierAdded }: AddSupplierDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      contactMail: "",
      contactPhone: "",
      address: "",
    },
  });

  async function onSubmit(values: SupplierFormValues) {
    setIsSubmitting(true);
    try {
      await addSupplierAction(values);
      toast({
        title: "Success",
        description: "Supplier added successfully.",
      });
      if (onSupplierAdded) {
        onSupplierAdded();
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to add supplier:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not add supplier.") || "Could not add supplier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Supplier</DialogTitle>
        <DialogDescription>
          Enter the details for the new supplier.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Global Office Inc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Jane Doe" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactMail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="e.g., jane.doe@example.com" {...field} value={field.value ?? ""}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="e.g., +1-555-123-4567" {...field} value={field.value ?? ""}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., 123 Supply St, Suite 100, City, Country" {...field} value={field.value ?? ""} />
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
              {isSubmitting ? "Saving..." : "Save Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
    
