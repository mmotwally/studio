
"use client";

import * as React from "react";
import Image from "next/image";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type InventoryItemFormValues, inventoryItemSchema } from "@/app/(app)/inventory/schema";
import type { SelectItem as SelectItemType } from "@/types";

import { getCategories } from "@/app/(app)/settings/categories/actions";
import { getSubCategories } from "@/app/(app)/settings/sub-categories/actions";
import { getLocations } from "@/app/(app)/settings/locations/actions";
import { getSuppliers } from "@/app/(app)/settings/suppliers/actions";
import { getUnitsOfMeasurement } from "@/app/(app)/settings/units/actions";
import { Trash2 } from "lucide-react";


interface InventoryItemFormProps {
  onSubmit: (values: InventoryItemFormValues, formData: FormData) => Promise<void>;
  defaultValues?: InventoryItemFormValues;
  isEditMode: boolean;
  isLoading?: boolean;
  initialImageUrl?: string | null;
}

export function InventoryItemForm({
  onSubmit,
  defaultValues,
  isEditMode,
  isLoading = false,
  initialImageUrl,
}: InventoryItemFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = React.useState<string | null>(initialImageUrl || null);
  const imageFileRef = React.useRef<HTMLInputElement>(null);
  const [removeImageChecked, setRemoveImageChecked] = React.useState(false);

  const [categories, setCategories] = React.useState<SelectItemType[]>([]);
  const [subCategories, setSubCategories] = React.useState<SelectItemType[]>([]);
  const [locations, setLocations] = React.useState<SelectItemType[]>([]);
  const [suppliers, setSuppliers] = React.useState<SelectItemType[]>([]);
  const [units, setUnits] = React.useState<SelectItemType[]>([]);
  const [isLoadingDropdownData, setIsLoadingDropdownData] = React.useState(true);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: defaultValues || { // Ensure a base structure if defaultValues is undefined initially
      name: "",
      description: "",
      quantity: 0,
      unitCost: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      lowStock: false,
      categoryId: "",
      subCategoryId: null,
      locationId: null,
      supplierId: null,
      unitId: "",
      removeImage: false,
    },
  });

  // Effect to reset form when defaultValues prop changes (primarily for edit mode)
  React.useEffect(() => {
    if (defaultValues) {
      // Ensure optional fields are explicitly null if they are empty strings in defaultValues
      // to match react-hook-form's handling and Select component expectations for clearing.
      const processedDefaults = {
        ...defaultValues,
        subCategoryId: defaultValues.subCategoryId || null,
        locationId: defaultValues.locationId || null,
        supplierId: defaultValues.supplierId || null,
      };
      form.reset(processedDefaults);
    }
  }, [defaultValues, form.reset]);


  const selectedCategoryId = form.watch("categoryId");

  React.useEffect(() => {
    if (initialImageUrl) {
        setImagePreview(initialImageUrl);
    }
  }, [initialImageUrl]);
  
  React.useEffect(() => {
    async function loadDropdownData() {
      setIsLoadingDropdownData(true);
      try {
        const [
          fetchedCategories,
          fetchedLocations,
          fetchedSuppliers,
          fetchedUnits,
        ] = await Promise.all([
          getCategories(),
          getLocations(),
          getSuppliers(),
          getUnitsOfMeasurement(),
        ]);

        setCategories(fetchedCategories.map(c => ({ value: c.id, label: `${c.name} (${c.code})` })));
        setLocations(fetchedLocations.map(l => ({ value: l.id, label: l.fullName || l.store })));
        setSuppliers(fetchedSuppliers.map(s => ({ value: s.id, label: s.name })));
        setUnits(fetchedUnits.map(u => ({ value: u.id, label: `${u.name} ${u.abbreviation ? '('+u.abbreviation+')' : ''}`.trim() })));

        // If editing, and categoryId is set from defaultValues, load its subcategories
        // This is now handled more robustly by the form.reset and the subsequent selectedCategoryId effect.
        // However, ensuring subcategories are loaded if defaultValues.categoryId is present can be done here too,
        // or rely on selectedCategoryId effect. For simplicity, let selectedCategoryId effect handle it
        // to avoid potential race conditions with form.reset.

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
  }, [toast]); // Removed defaultValues from here as form.reset handles it.

  React.useEffect(() => {
    async function loadSubCategoriesForSelectedCategory() {
      if (selectedCategoryId) {
        // Fetch sub-categories for the currently selected categoryId
        try {
          const fetchedSubCategories = await getSubCategories(selectedCategoryId);
          setSubCategories(fetchedSubCategories.map(sc => ({ value: sc.id, label: `${sc.name} (${sc.code})` })));
          // If the main category changes, and we are in edit mode,
          // we might need to reset subCategoryId IF it's no longer valid for the new category.
          // form.reset in the main useEffect should handle initial default subCategory.
          // If user *changes* category, then subCategory field should be reset.
          if (form.getValues('categoryId') !== defaultValues?.categoryId) {
             form.setValue("subCategoryId", null);
          }

        } catch (error) {
           console.error("Failed to load sub-categories:", error);
           setSubCategories([]);
           form.setValue("subCategoryId", null);
        }
      } else {
        setSubCategories([]);
        form.setValue("subCategoryId", null); 
      }
    }
    
    if(!isLoadingDropdownData) { // Only run if main dropdowns are loaded
        loadSubCategoriesForSelectedCategory();
    }
  }, [selectedCategoryId, isLoadingDropdownData, form, defaultValues?.categoryId]);


  const handleFormSubmit = async (values: InventoryItemFormValues) => {
    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (key !== 'removeImage') { 
          formData.append(key, value as string | Blob);
        }
      }
    });
    
    if (removeImageChecked) {
      formData.append('removeImage', 'true');
    }

    if (imageFileRef.current?.files && imageFileRef.current.files[0]) {
      formData.append('imageFile', imageFileRef.current.files[0]);
    }

    await onSubmit(values, formData);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setRemoveImageChecked(false); 
        form.setValue('removeImage', false);
      };
      reader.readAsDataURL(file);
    } else if (!isEditMode) { 
      setImagePreview(null);
    }
  };

  const handleRemoveImageToggle = (checked: boolean) => {
    setRemoveImageChecked(checked);
    form.setValue('removeImage', checked);
    if (checked) {
      setImagePreview(null); 
      if (imageFileRef.current) {
        imageFileRef.current.value = ""; 
      }
    } else if (initialImageUrl) {
        setImagePreview(initialImageUrl); 
    }
  };


  const renderSelect = (
    name: keyof InventoryItemFormValues,
    label: string,
    placeholder: string,
    options: SelectItemType[],
    isLoadingOpt?: boolean,
    isDisabled?: boolean,
    isRequired?: boolean
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{isRequired ? '*' : ''}</FormLabel>
          <Select
            onValueChange={(value) => field.onChange(value === "" ? null : value)}
            value={field.value || ""} // Use empty string for Select value if field.value is null/undefined
            disabled={isLoadingOpt || isDisabled || (!isLoadingOpt && options.length === 0 && name !== 'subCategoryId')}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingOpt ? "Loading..." : 
                  (name === 'subCategoryId' && !selectedCategoryId) ? "Select a category first" :
                  (name === 'subCategoryId' && selectedCategoryId && options.length === 0) ? "No sub-categories for this category" :
                  (options.length === 0 && (name === 'categoryId' || name === 'unitId')) ? "No options available" :
                  placeholder
                } />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {isLoadingOpt ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : options.length > 0 ? (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {name === 'subCategoryId' && !selectedCategoryId && "Select a category first to see sub-categories."}
                  {name === 'subCategoryId' && selectedCategoryId && "No sub-categories for this category."}
                  {name !== 'subCategoryId' && "No options available. Please add some first via Settings or quick add."}
                </div>
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Item Details" : "New Item Details"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
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
                name="description"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detailed description of the item..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem className="lg:col-span-3">
                <FormLabel>Item Image</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={imageFileRef}
                    onChange={handleImageChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </FormControl>
                {(imagePreview || initialImageUrl) && !removeImageChecked && (
                  <div className="mt-2">
                    <Image src={imagePreview || initialImageUrl!} alt="Image preview" width={128} height={128} className="h-32 w-32 object-cover rounded-md" data-ai-hint="product image" />
                  </div>
                )}
                {isEditMode && initialImageUrl && (
                    <FormField
                        control={form.control}
                        name="removeImage"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 mt-2">
                            <FormControl>
                            <Checkbox
                                checked={field.value || false}
                                onCheckedChange={(checked) => {
                                    const val = typeof checked === 'boolean' ? checked : false;
                                    field.onChange(val);
                                    handleRemoveImageToggle(val);
                                }}
                            />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">Remove current image</FormLabel>
                        </FormItem>
                        )}
                    />
                )}
                <FormDescription>Upload an image for the item. Max 2MB.</FormDescription>
                <FormMessage />
              </FormItem>

              {renderSelect("categoryId", "Category", "Select a category", categories, isLoadingDropdownData, false, true)}
              {renderSelect("subCategoryId", "Sub-Category", "Select a sub-category (optional)", subCategories, isLoadingDropdownData || (!!selectedCategoryId && subCategories.length === 0 && !isLoadingDropdownData && form.getFieldState("categoryId").isDirty) , !selectedCategoryId || (isLoadingDropdownData && !!selectedCategoryId), false)}
              {renderSelect("unitId", "Unit of Measurement", "Select a unit", units, isLoadingDropdownData, false, true)}
              
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
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Stock Level</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5" {...field} value={(field.value === 0 || field.value === undefined) && !form.formState.dirtyFields.minStockLevel ? "" : field.value} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Stock Level</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50" {...field} value={(field.value === 0 || field.value === undefined) && !form.formState.dirtyFields.maxStockLevel ? "" : field.value} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderSelect("locationId", "Location (Optional)", "Select a location", locations, isLoadingDropdownData)}
              {renderSelect("supplierId", "Supplier (Optional)", "Select a supplier", suppliers, isLoadingDropdownData)}
              
              <FormField
                control={form.control}
                name="lowStock"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-1 lg:col-span-3">
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
              <Button type="button" variant="outline" onClick={() => router.push('/inventory')} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isLoadingDropdownData}>
                {isLoading ? (isEditMode ? "Saving Changes..." : "Adding Item...") : (isEditMode ? "Save Changes" : "Add Item")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

