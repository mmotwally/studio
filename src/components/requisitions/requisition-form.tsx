
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
import { CalendarIcon, PlusCircle, Trash2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { type RequisitionFormValues, requisitionFormSchema } from "@/app/(app)/requisitions/schema";
import { getInventoryItemsForSelect } from "@/app/(app)/requisitions/actions";
import { getDepartmentsForSelect } from "@/app/(app)/settings/departments/actions";
import type { SelectItem as SelectItemType } from "@/types";
import { useRouter } from "next/navigation";


interface RequisitionFormProps {
  onSubmit: (values: RequisitionFormValues) => Promise<void> | void;
  isLoading?: boolean;
  defaultValues?: Partial<RequisitionFormValues>;
  isEditMode?: boolean;
}

export function RequisitionForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  isEditMode = false,
}: RequisitionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = React.useState<SelectItemType[]>([]);
  const [departments, setDepartments] = React.useState<SelectItemType[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = React.useState(true);

  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionFormSchema),
    defaultValues: {
      departmentId: defaultValues?.departmentId || "",
      orderNumber: defaultValues?.orderNumber || "",
      bomNumber: defaultValues?.bomNumber || "",
      dateNeeded: defaultValues?.dateNeeded || null,
      notes: defaultValues?.notes || "",
      items: defaultValues?.items || [{ inventoryItemId: "", quantityRequested: 1, notes: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    if (defaultValues) {
      // Ensure dateNeeded is a Date object if it exists
      const processedDefaults = {
        ...defaultValues,
        dateNeeded: defaultValues.dateNeeded ? new Date(defaultValues.dateNeeded) : null,
      };
      form.reset(processedDefaults);
    }
  }, [defaultValues, form]);

  React.useEffect(() => {
    async function loadDropdownData() {
      setIsLoadingDropdowns(true);
      try {
        const [fetchedItems, fetchedDepartments] = await Promise.all([
          getInventoryItemsForSelect(),
          getDepartmentsForSelect(),
        ]);
        setInventoryItems(fetchedItems);
        setDepartments(fetchedDepartments);
      } catch (error) {
        console.error("Failed to load dropdown data for requisition form:", error);
        toast({
          title: "Error",
          description: "Could not load selection data. Please try refreshing.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDropdowns(false);
      }
    }
    loadDropdownData();
  }, [toast]);

  const handleFormSubmit = async (values: RequisitionFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdowns}>
                  <FormControl>
                    <SelectTrigger>
                      <Briefcase className="mr-2 h-4 w-4 text-muted-foreground inline-block" />
                      <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select a department"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
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
            name="dateNeeded"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Needed (Optional)</FormLabel>
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
                      disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } 
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
            name="orderNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Number (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., ORD-12345" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bomNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BOM Number (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., BOM-XYZ-001" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Overall Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any general notes for this requisition..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormLabel className="text-lg font-semibold">Requested Items</FormLabel>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-md shadow-sm relative">
              <FormField
                control={form.control}
                name={`items.${index}.inventoryItemId`}
                render={({ field: f }) => (
                  <FormItem className="md:col-span-5">
                    <FormLabel>Item*</FormLabel>
                    <Select
                      onValueChange={f.onChange}
                      value={f.value} 
                      disabled={isLoadingDropdowns}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdowns ? "Loading items..." : "Select an inventory item"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryItems.length === 0 && !isLoadingDropdowns ? (
                          <SelectItem value="no-item" disabled>No items available</SelectItem>
                        ) : (
                          inventoryItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`items.${index}.quantityRequested`}
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
                name={`items.${index}.notes`}
                render={({ field: f }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Item Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes for this item" {...f} value={f.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-1 flex items-end justify-end">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    className="mt-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove Item</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ inventoryItemId: "", quantityRequested: 1, notes: "" })}
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
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isLoadingDropdowns}>
            {isLoading ? (isEditMode ? "Saving..." : "Submitting...") : (isEditMode ? "Save Changes" : "Submit Requisition")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
