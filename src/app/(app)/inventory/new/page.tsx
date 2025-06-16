
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";
import { addInventoryItemAction } from "../actions";
import type { InventoryItemFormValues } from "../schema";


export default function AddInventoryItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  const handleAddItem = async (values: InventoryItemFormValues, formData: FormData) => {
    setIsSubmitting(true);
    try {
      await addInventoryItemAction(formData);
      // Toast and redirect are handled by the action on success
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Error Adding Item",
        description: (error instanceof Error ? error.message : String(error)) || "Could not add item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return (
    <>
      <PageHeader
        title="Add New Inventory Item"
        description="Fill in the details to add a new item to your inventory. Item ID will be auto-generated."
      />
      <InventoryItemForm
        onSubmit={handleAddItem}
        isEditMode={false}
        isLoading={isSubmitting}
      />
    </>
  );
}
    
