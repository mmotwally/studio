
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
import { addInventoryItemAction } from "../actions";
import { type InventoryItemFormValues, inventoryItemSchema } from "../schema";

export default function AddInventoryItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      unitCost: 0,
      lowStock: false,
      categoryId: "",
      subCategoryId: "",
      locationId: "",
      supplierId: "",
      unitId: "",
    },
  });

  async function onSubmit(values: InventoryItemFormValues) {
    setIsSubmitting(true);
    try {
      await addInventoryItemAction(values);
      // Action handles redirect
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : String(error)) || "Could not add item. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
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
                {/* Placeholder for Category Dropdown - Will be Select component */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category ID (temp)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Category ID" {...field} />
                      </FormControl>
                       <FormDescription>This will be a dropdown later.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Placeholder for Sub-Category Dropdown - Will be Select component */}
                 <FormField
                  control={form.control}
                  name="subCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Category ID (temp)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Sub-Category ID" {...field} />
                      </FormControl>
                      <FormDescription>This will be a dropdown later.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Placeholder for Location Dropdown - Will be Select component */}
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location ID (temp)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Location ID" {...field} />
                      </FormControl>
                      <FormDescription>This will be a dropdown later.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Placeholder for Supplier Dropdown - Will be Select component */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier ID (temp)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Supplier ID" {...field} />
                      </FormControl>
                      <FormDescription>This will be a dropdown later.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {/* Placeholder for Unit Dropdown - Will be Select component */}
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit ID (temp)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Unit ID" {...field} />
                      </FormControl>
                      <FormDescription>This will be a dropdown later.</FormDescription>
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
