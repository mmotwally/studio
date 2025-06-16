
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addInventoryItemAction } from "../actions";
import { type InventoryItemFormValues, inventoryItemSchema } from "../schema";
import type { SelectItem as SelectItemType, CategoryDB, SubCategoryDB, LocationDB, SupplierDB, UnitOfMeasurementDB } from "@/types";

import { getCategories } from "@/app/(app)/settings/categories/actions";
import { getSubCategories } from "@/app/(app)/settings/sub-categories/actions";
import { getLocations } from "@/app/(app)/settings/locations/actions";
import { getSuppliers } from "@/app/(app)/settings/suppliers/actions";
import { getUnitsOfMeasurement } from "@/app/(app)/settings/units/actions";

export default function AddInventoryItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [categories, setCategories] = React.useState<SelectItemType[]>([]);
  const [subCategories, setSubCategories] = React.useState<SelectItemType[]>([]);
  const [locations, setLocations] = React.useState<SelectItemType[]>([]);
  const [suppliers, setSuppliers] = React.useState<SelectItemType[]>([]);
  const [units, setUnits] = React.useState<SelectItemType[]>([]);
  const [isLoadingDropdownData, setIsLoadingDropdownData] = React.useState(true);

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

  const selectedCategoryId = form.watch("categoryId");

  React.useEffect(() => {
    async function loadDropdownData() {
      setIsLoadingDropdownData(true);
      try {
        const [
          fetchedCategories,
          // fetchedSubCategories, // Fetch subcategories dynamically or all initially
          fetchedLocations,
          fetchedSuppliers,
          fetchedUnits,
        ] = await Promise.all([
          getCategories(),
          // getSubCategories(), // Pass selectedCategoryId if dynamic
          getLocations(),
          getSuppliers(),
          getUnitsOfMeasurement(),
        ]);

        setCategories(fetchedCategories.map(c => ({ value: c.id, label: c.name })));
        setLocations(fetchedLocations.map(l => ({ value: l.id, label: l.fullName || l.store })));
        setSuppliers(fetchedSuppliers.map(s => ({ value: s.id, label: s.name })));
        setUnits(fetchedUnits.map(u => ({ value: u.id, label: `${u.name} ${u.abbreviation ? '('+u.abbreviation+')' : ''}`.trim() })));

      } catch (error) {
        console.error("Failed to load dropdown data:", error);
        toast({
          title: "Error",
          description: "Could not load data for dropdowns. Please try refreshing.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDropdownData(false);
      }
    }
    loadDropdownData();
  }, [toast]);

  React.useEffect(() => {
    async function loadSubCategories() {
      if (selectedCategoryId) {
        try {
          const fetchedSubCategories = await getSubCategories(selectedCategoryId);
          setSubCategories(fetchedSubCategories.map(sc => ({ value: sc.id, label: sc.name })));
        } catch (error) {
           console.error("Failed to load sub-categories:", error);
           setSubCategories([]); // Clear previous if error
        }
      } else {
        setSubCategories([]); // Clear if no category selected
      }
    }
    if(!isLoadingDropdownData) { // Only run if initial data load is complete
        loadSubCategories();
    }
  }, [selectedCategoryId, isLoadingDropdownData]);


  async function onSubmit(values: InventoryItemFormValues) {
    setIsSubmitting(true);
    try {
      await addInventoryItemAction(values);
      // Action handles redirect, toast is shown by server action or upon redirect
      // For client-side toast after server action:
      // toast({ title: "Success", description: "Inventory item added."});
      // router.push('/inventory'); // if redirect is not in server action
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

  const renderSelect = (
    name: keyof InventoryItemFormValues,
    label: string,
    placeholder: string,
    options: SelectItemType[],
    isLoading?: boolean,
    isDisabled?: boolean
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={isLoading || isDisabled || options.length === 0}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.length === 0 && !isLoading ? (
                <SelectItem value="no-options" disabled>No options available</SelectItem>
              ) : (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

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
                
                {renderSelect("categoryId", "Category", "Select a category", categories, isLoadingDropdownData)}
                {renderSelect("subCategoryId", "Sub-Category", "Select a sub-category", subCategories, isLoadingDropdownData || (selectedCategoryId && subCategories.length === 0 && !isLoadingDropdownData) , !selectedCategoryId)}
                {renderSelect("locationId", "Location", "Select a location", locations, isLoadingDropdownData)}
                {renderSelect("supplierId", "Supplier", "Select a supplier", suppliers, isLoadingDropdownData)}
                {renderSelect("unitId", "Unit of Measurement", "Select a unit", units, isLoadingDropdownData)}

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
                <Button type="submit" disabled={isSubmitting || isLoadingDropdownData}>
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
