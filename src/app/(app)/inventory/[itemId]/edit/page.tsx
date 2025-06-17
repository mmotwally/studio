
"use client";
import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryItemForm } from '@/components/inventory/inventory-item-form';
import { getInventoryItemById, updateInventoryItemAction } from '../../actions';
import type { InventoryItem, InventoryItemFormValues } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';


export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.itemId as string;
  const { toast } = useToast();

  const [item, setItem] = React.useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (itemId) {
      setIsLoading(true);
      getInventoryItemById(itemId)
        .then(fetchedItem => {
          if (fetchedItem) {
            setItem(fetchedItem);
          } else {
            setError("Item not found.");
            toast({ title: "Error", description: "Inventory item not found.", variant: "destructive" });
          }
        })
        .catch(err => {
          console.error("Failed to fetch item:", err);
          setError("Failed to load item data.");
          toast({ title: "Error", description: "Could not load item data.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    }
  }, [itemId, toast]);

  const handleUpdateItem = async (values: InventoryItemFormValues, formData: FormData) => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await updateInventoryItemAction(item.id, item.imageUrl, formData);
      toast({
        title: "Success",
        description: `Item "${values.name}" updated successfully.`,
      });
      // router.push('/inventory'); // Action handles redirect
    } catch (err) {
      console.error("Failed to update item:", err);
      toast({
        title: "Error Updating Item",
        description: (err instanceof Error ? err.message : String(err)) || "Could not update item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultFormValues = React.useMemo<InventoryItemFormValues | undefined>(() => {
    if (!item) return undefined;
    return {
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      unitCost: item.unitCost,
      minStockLevel: item.minStockLevel || 0,
      maxStockLevel: item.maxStockLevel || 0,
      lowStock: item.lowStock || false,
      categoryId: item.categoryId || "",
      subCategoryId: item.subCategoryId || null, // Ensure null for empty optional selects
      locationId: item.locationId || null,   // Ensure null for empty optional selects
      supplierId: item.supplierId || null,   // Ensure null for empty optional selects
      unitId: item.unitId || "",
      removeImage: false, // Initial state for remove image
    };
  }, [item]);


  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit Item" description="Loading item details..." />
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Error" description={error} />
         <Button onClick={() => router.push('/inventory')} variant="outline">Back to Inventory</Button>
      </>
    );
  }

  if (!item || !defaultFormValues) { // Check for defaultFormValues as well
     return (
      <>
        <PageHeader title="Edit Item" description="Item not found or data incomplete." />
         <Button onClick={() => router.push('/inventory')} variant="outline">Back to Inventory</Button>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title={`Edit Item: ${item.name}`}
        description="Modify the details of this inventory item."
      />
      <InventoryItemForm
        onSubmit={handleUpdateItem}
        defaultValues={defaultFormValues}
        isEditMode={true}
        isLoading={isSubmitting}
        initialImageUrl={item.imageUrl} 
      />
    </>
  );
}
