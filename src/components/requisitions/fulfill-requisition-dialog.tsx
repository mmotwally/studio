
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useToast } from "@/hooks/use-toast";
import type { Requisition, FulfillRequisitionFormValues, FulfillRequisitionItemFormValues } from "@/types";
import { processRequisitionFulfillmentAction } from "@/app/(app)/requisitions/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Info } from "lucide-react";


const fulfillRequisitionItemClientSchema = z.object({
  requisitionItemId: z.string(),
  inventoryItemId: z.string(),
  itemName: z.string(),
  quantityRequested: z.coerce.number(), // Original requested
  quantityApproved: z.coerce.number(), // Quantity manager approved
  currentQuantityIssued: z.coerce.number(),
  inventoryItemCurrentStock: z.coerce.number(),
  quantityToIssueNow: z.coerce.number().int().min(0, "Cannot be negative."),
}).refine(data => data.quantityToIssueNow <= (data.quantityApproved - data.currentQuantityIssued), {
  message: "Cannot issue more than remaining approved quantity.",
  path: ["quantityToIssueNow"],
}).refine(data => data.quantityToIssueNow <= data.inventoryItemCurrentStock, {
  message: "Insufficient stock.",
  path: ["quantityToIssueNow"],
});

const fulfillRequisitionClientSchema = z.object({
  requisitionId: z.string(),
  items: z.array(fulfillRequisitionItemClientSchema).min(0), // Can be 0 if no items are eligible/entered
});


interface FulfillRequisitionDialogProps {
  requisition: Requisition;
  setOpen: (open: boolean) => void;
  onFulfillmentProcessed: () => void; // Callback to refresh parent page data
}

export function FulfillRequisitionDialog({ requisition, setOpen, onFulfillmentProcessed }: FulfillRequisitionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const defaultFormValues: FulfillRequisitionFormValues = {
    requisitionId: requisition.id,
    items: requisition.items
        ?.filter(item => item.isApproved && (item.quantityApproved ?? 0) > 0 && (item.quantityIssued || 0) < (item.quantityApproved ?? 0)) // Only items approved with qty > 0 and not fully issued
        .map(item => {
            const qtyApproved = item.quantityApproved ?? 0;
            const qtyIssued = item.quantityIssued || 0;
            const remainingNeededBasedOnApproval = qtyApproved - qtyIssued;
            return {
                requisitionItemId: item.id,
                inventoryItemId: item.inventoryItemId,
                itemName: item.inventoryItemName || "Unknown Item",
                quantityRequested: item.quantityRequested, // Keep for display if needed
                quantityApproved: qtyApproved,
                currentQuantityIssued: qtyIssued,
                inventoryItemCurrentStock: item.inventoryItemCurrentStock || 0,
                quantityToIssueNow: Math.max(0, Math.min(remainingNeededBasedOnApproval, item.inventoryItemCurrentStock || 0)),
            };
    }) || [],
  };

  const form = useForm<FulfillRequisitionFormValues>({
    resolver: zodResolver(fulfillRequisitionClientSchema),
    defaultValues: defaultFormValues,
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(values: FulfillRequisitionFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    const itemsToFulfill = values.items
        .filter(item => item.quantityToIssueNow > 0) 
        .map(item => ({
            requisitionItemId: item.requisitionItemId,
            inventoryItemId: item.inventoryItemId,
            quantityToIssueNow: item.quantityToIssueNow,
    }));

    if (itemsToFulfill.length === 0) {
        toast({
            title: "No Quantities Entered",
            description: "Please enter quantities to issue for at least one item, or cancel.",
            variant: "default"
        });
        setIsSubmitting(false);
        return;
    }

    try {
      await processRequisitionFulfillmentAction(values.requisitionId, itemsToFulfill);
      toast({
        title: "Success",
        description: "Requisition fulfillment processed.",
      });
      onFulfillmentProcessed(); 
      setOpen(false);
    } catch (error: any) {
      if (error.digest?.startsWith('NEXT_REDIRECT')) {
        throw error; 
      }
      console.error("Failed to process fulfillment:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not process fulfillment. Please try again.";
      setServerError(errorMessage); 
      toast({
        title: "Fulfillment Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      if (!(isSubmitting && (serverError === null && !((Error as any).digest?.startsWith('NEXT_REDIRECT'))))) {
         setIsSubmitting(false);
      }
    }
  }
  
  if (defaultFormValues.items.length === 0) {
    return (
       <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Fulfillment for Requisition: {requisition.id}</DialogTitle>
          <DialogDescription>
            All approved items in this requisition have already been fully issued or no items are currently approved for fulfillment.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    );
  }


  return (
    <DialogContent className="sm:max-w-4xl"> 
      <DialogHeader>
        <DialogTitle>Process Fulfillment for Requisition: {requisition.id}</DialogTitle>
        <DialogDescription>
          Specify the quantities issued for each approved item. Ensure stock levels are accurate.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ScrollArea className="max-h-[60vh] pr-4"> 
            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemData = form.getValues(`items.${index}`);
                const remainingToIssueBasedOnApproval = itemData.quantityApproved - itemData.currentQuantityIssued;
                return (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border rounded-md items-center">
                    <div className="md:col-span-2">
                      <FormLabel className="text-sm font-medium">{itemData.itemName}</FormLabel>
                      <p className="text-xs text-muted-foreground">ID: {itemData.inventoryItemId}</p>
                    </div>
                    
                    <div className="text-sm">
                        <FormLabel>Qty Approved</FormLabel>
                        <p>{itemData.quantityApproved}</p>
                    </div>
                     <div className="text-sm">
                        <FormLabel>Issued (Prev.)</FormLabel>
                        <p>{itemData.currentQuantityIssued}</p>
                    </div>
                    <div className="text-sm">
                        <FormLabel>Remaining</FormLabel>
                        <p>{remainingToIssueBasedOnApproval}</p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityToIssueNow`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>Issue Now (Stock: {itemData.inventoryItemCurrentStock})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...formField} 
                              placeholder="Qty" 
                              min="0"
                              max={Math.min(remainingToIssueBasedOnApproval, itemData.inventoryItemCurrentStock)}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                formField.onChange(isNaN(val) ? 0 : val);
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {serverError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p>{serverError}</p>
            </div>
          )}
           <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Enter the quantity you are issuing for each item.
                This cannot exceed the remaining approved quantity or available stock. Items with 0 "Issue Now" will be ignored.
              </p>
            </div>


          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Submit Fulfillment"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

