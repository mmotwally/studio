
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addInventoryItemAction, type InventoryItemFormValues, inventoryItemSchema } from "../actions";

export default function AddInventoryItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: 0,
      unitCost: 0,
      location: "",
      supplier: "",
      lowStock: false,
    },
  });

  async function onSubmit(values: InventoryItemFormValues) {
    setIsSubmitting(true);
    try {
      await addInventoryItemAction(values);
      // Toast for success is now handled within the component,
      // as server actions redirect and might unmount the component before toast is shown from here.
      // However, for client-side feedback before potential redirect, this can be kept.
      // For robust success feedback, consider showing toast *after* redirect on the target page,
      // or use a mechanism that survives navigation (e.g., query params, session flash messages).
      // Given the current setup, the redirect in the action will likely make this toast not visible.
      // Let's keep it simple for now; if issues arise, we can refine.
      router.push('/inventory'); // Manually redirecting after success
      toast({ // This toast might not be seen due to immediate redirect
        title: "Success",
        description: "Inventory item added successfully.",
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : String(error)) || "Could not add item. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Only set isSubmitting to false if there was an error, 
      // because on success, the redirect will navigate away.
      // If an error occurs, we stay on the page, so we need to re-enable the button.
      if (form.formState.isSubmitSuccessful === false) {
         setIsSubmitting(false);
      }
      // If there was an error, ensure isSubmitting is false
      // If successful, the redirect happens in the action.
      // To ensure button state is correct if error occurs BEFORE action's redirect:
      const wasSuccessful = !Object.keys(form.formState.errors).length;
      if (!wasSuccessful) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Add New Inventory Item"
        description="Fill in the details to add a new item to your inventory."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Office Chair" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Furniture" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity*</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10" {...field} value={field.value === 0 && !form.formState.dirtyFields.quantity ? "" : field.value} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost ($)*</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 150.99" {...field} value={field.value === 0 && !form.formState.dirtyFields.unitCost ? "" : field.value} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Warehouse A, Shelf 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Office Supplies Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Mark as low stock
                        </FormLabel>
                        <FormDescription>
                          Check this if the item quantity is considered low.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.push('/inventory')} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding Item..." : "Add Item"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
