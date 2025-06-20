
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2, Users, Package, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { type PurchaseOrderFormValues, purchaseOrderFormSchema } from "@/app/(app)/purchase-orders/schema";
import { getInventoryItemsForSelect } from "@/app/(app)/requisitions/actions"; 
import { getSuppliersForSelect } from "@/app/(app)/settings/suppliers/actions";
import type { SelectItem as GenericSelectItem } from "@/types";
import { useRouter } from "next/navigation";

interface PurchaseOrderFormProps {
  onSubmit: (values: PurchaseOrderFormValues) => Promise<void> | void;
  isLoading?: boolean;
  defaultValues?: Partial<PurchaseOrderFormValues>;
  isEditMode?: boolean;
}

interface DetailedInventoryItemForSelect {
  value: string;
  label: string;
  lastPurchasePrice?: number | null;
  unitCost?: number | null; // This is the item's current/default cost from inventory
  quantity?: number;
  unitName?: string | null;
}


export function PurchaseOrderForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  isEditMode = false,
}: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = React.useState<DetailedInventoryItemForSelect[]>([]);
  const [suppliers, setSuppliers] = React.useState<GenericSelectItem[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = React.useState(true);

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      supplierId: defaultValues?.supplierId || "",
      orderDate: defaultValues?.orderDate || new Date(), // Default to today
      expectedDeliveryDate: defaultValues?.expectedDeliveryDate || null,
      notes: defaultValues?.notes || "",
      shippingAddress: defaultValues?.shippingAddress || "",
      billingAddress: defaultValues?.billingAddress || "",
      items: defaultValues?.items || [{ inventoryItemId: "", quantityOrdered: 1, unitCost: 0, description: "" }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    if (defaultValues) {
      const processedDefaults = {
        ...defaultValues,
        orderDate: defaultValues.orderDate ? new Date(defaultValues.orderDate) : new Date(),
        expectedDeliveryDate: defaultValues.expectedDeliveryDate ? new Date(defaultValues.expectedDeliveryDate) : null,
      };
      form.reset(processedDefaults);
    }
  }, [defaultValues, form]);

  React.useEffect(() => {
    async function loadDropdownData() {
      setIsLoadingDropdowns(true);
      try {
        const [fetchedItems, fetchedSuppliers] = await Promise.all([
          getInventoryItemsForSelect(), // This now returns richer objects
          getSuppliersForSelect(),
        ]);
        setInventoryItems(fetchedItems as DetailedInventoryItemForSelect[]);
        setSuppliers(fetchedSuppliers);
      } catch (error) {
        console.error("Failed to load dropdown data for PO form:", error);
        toast({
          title: "Error Loading Data",
          description: "Could not load selection data. Please try refreshing.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDropdowns(false);
      }
    }
    loadDropdownData();
  }, [toast]);

  const handleFormSubmit = async (values: PurchaseOrderFormValues) => {
    await onSubmit(values);
  };

  const handleItemSelectionChange = (itemValue: string, itemIndex: number) => {
    const selectedItem = inventoryItems.find(invItem => invItem.value === itemValue);
    if (selectedItem) {
      // Update the unitCost for the current PO line item to the selected inventory item's last purchase price (or current unit cost if LPP is null)
      // Also, store the lastPurchasePrice for display if needed elsewhere, though it's mainly for the new read-only field
      form.setValue(`items.${itemIndex}.unitCost`, selectedItem.lastPurchasePrice ?? selectedItem.unitCost ?? 0, { shouldValidate: true });
      // No need to explicitly set a 'lastPurchasePrice' field in the form item data itself for submission,
      // as it's for display. We'll grab it from `selectedItem` for the read-only field.
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdowns}>
                  <FormControl>
                    <SelectTrigger>
                      <Users className="mr-2 h-4 w-4 text-muted-foreground inline-block" />
                      <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select a supplier"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.value} value={sup.value}>
                        {sup.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orderDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Order Date*</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedDeliveryDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expected Delivery Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={field.onChange}
                       disabled={(date) =>
                          form.getValues("orderDate") ? date < new Date(form.getValues("orderDate")) : false
                        }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any general notes for this purchase order..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="shippingAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping Address (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter shipping address" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="billingAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Address (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter billing address (if different from shipping)" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 pt-4">
          <FormLabel className="text-lg font-semibold">Order Items</FormLabel>
          {fields.map((field, index) => {
            const currentInventoryItemId = form.watch(`items.${index}.inventoryItemId`);
            const selectedInventoryItemDetails = inventoryItems.find(item => item.value === currentInventoryItemId);
            const lastPurchasePriceDisplay = selectedInventoryItemDetails?.lastPurchasePrice !== null && selectedInventoryItemDetails?.lastPurchasePrice !== undefined 
                                          ? selectedInventoryItemDetails.lastPurchasePrice.toFixed(2) 
                                          : "N/A";
            return (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-md shadow-sm relative items-start">
              <FormField
                control={form.control}
                name={`items.${index}.inventoryItemId`}
                render={({ field: f }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Item*</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        f.onChange(value);
                        handleItemSelectionChange(value, index);
                      }}
                      value={f.value}
                      disabled={isLoadingDropdowns}
                    >
                      <FormControl>
                        <SelectTrigger>
                           <Package className="mr-2 h-4 w-4 text-muted-foreground inline-block" />
                          <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select an inventory item"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`items.${index}.description`}
                render={({ field: f }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Item description" {...f} value={f.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormItem className="md:col-span-2">
                <FormLabel>Last Purchase Price ($)</FormLabel>
                <FormControl>
                  <div className="flex items-center h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm">
                     <DollarSign className="mr-1 h-4 w-4 text-muted-foreground opacity-70" />
                    {lastPurchasePriceDisplay}
                  </div>
                </FormControl>
              </FormItem>
              <FormField
                control={form.control}
                name={`items.${index}.quantityOrdered`}
                render={({ field: f }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Quantity*</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Qty" {...f} onChange={e => f.onChange(parseInt(e.target.value,10) || 1)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`items.${index}.unitCost`}
                render={({ field: f }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Unit Cost ($)*</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Cost" {...f} onChange={e => f.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-1 flex items-center md:pt-7">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    className="mt-auto"
                    title="Remove Item"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove Item</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ inventoryItemId: "", quantityOrdered: 1, unitCost: 0, description: "" })}
            className="mt-2"
            disabled={isLoadingDropdowns}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
          </Button>
           {form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-6">
          <Button type="button" variant="outline" onClick={() => router.push('/purchase-orders')} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isLoadingDropdowns}>
            {isLoading ? (isEditMode ? "Saving..." : "Creating PO...") : (isEditMode ? "Save Changes" : "Create Purchase Order")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

