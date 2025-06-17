
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import type { PurchaseOrder, ReceivePOFormValues } from "@/types"; // ReceivePOItemFormValues is implicitly used by ReceivePOFormValues
import { receivePurchaseOrderItemsAction } from "@/app/(app)/purchase-orders/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Info, PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";

const receivePOItemClientSchema = z.object({
  poItemId: z.string(),
  inventoryItemId: z.string(),
  itemName: z.string(),
  quantityOrdered: z.coerce.number(),
  quantityApproved: z.coerce.number().nullable(),
  quantityAlreadyReceived: z.coerce.number(),
  inventoryItemCurrentStock: z.coerce.number().optional().nullable(),
  unitCostAtReceipt: z.coerce.number(),
  quantityToReceiveNow: z.coerce.number().int().min(0, "Cannot be negative."),
}).refine(data => {
    const qtyApprovedOrOrdered = data.quantityApproved ?? data.quantityOrdered;
    return data.quantityToReceiveNow <= (qtyApprovedOrOrdered - data.quantityAlreadyReceived);
}, {
  message: "Cannot receive more than remaining approved/ordered quantity.",
  path: ["quantityToReceiveNow"],
});


const receivePOClientSchema = z.object({
  purchaseOrderId: z.string(),
  items: z.array(receivePOItemClientSchema).min(0),
});

interface ReceiveStockFormProps {
  purchaseOrder: PurchaseOrder;
}

export function ReceiveStockForm({ purchaseOrder }: ReceiveStockFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();


  const itemsEligibleForReceiving = purchaseOrder.items?.filter(item => {
    const qtyApprovedOrOrdered = item.quantityApproved ?? item.quantityOrdered;
    return qtyApprovedOrOrdered > (item.quantityReceived || 0);
  }) || [];

  const defaultFormValues: ReceivePOFormValues = {
    purchaseOrderId: purchaseOrder.id,
    items: itemsEligibleForReceiving.map(item => {
        const qtyApprovedOrOrdered = item.quantityApproved ?? item.quantityOrdered;
        const alreadyReceived = item.quantityReceived || 0;
        const maxReceivableNow = qtyApprovedOrOrdered - alreadyReceived;
        
        return {
            poItemId: item.id,
            inventoryItemId: item.inventoryItemId,
            itemName: item.inventoryItemName || "Unknown Item",
            quantityOrdered: item.quantityOrdered,
            quantityApproved: item.quantityApproved,
            quantityAlreadyReceived: alreadyReceived,
            inventoryItemCurrentStock: item.inventoryItemCurrentStock,
            unitCostAtReceipt: item.unitCost, // Cost from the PO item
            quantityToReceiveNow: 0, // Default to 0, user enters what they are receiving
        };
    }),
  };

  const form = useForm<ReceivePOFormValues>({
    resolver: zodResolver(receivePOClientSchema),
    defaultValues: defaultFormValues,
    mode: "onChange",
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleActualSubmit = (values: ReceivePOFormValues) => {
    startTransition(async () => {
        setServerError(null);

        const itemsToSubmit = values.items
            .filter(item => item.quantityToReceiveNow > 0)
            .map(item => ({
                poItemId: item.poItemId,
                inventoryItemId: item.inventoryItemId,
                quantityReceivedNow: item.quantityToReceiveNow,
                unitCostAtReceipt: item.unitCostAtReceipt,
        }));

        if (itemsToSubmit.length === 0) {
            toast({
                title: "No Quantities Entered",
                description: "Please enter quantities to receive for at least one item, or cancel.",
                variant: "default"
            });
            return; 
        }

        try {
          await receivePurchaseOrderItemsAction(values.purchaseOrderId, itemsToSubmit);
          // Redirect and success toast are handled by the server action
        } catch (error: any) {
            if (error.digest?.startsWith('NEXT_REDIRECT')) {
                throw error; 
            }
            console.error("Failed to process stock receipt:", error);
            const errorMessage = error instanceof Error ? error.message : "Could not process stock receipt. Please try again.";
            setServerError(errorMessage); 
            toast({
                title: "Receiving Error",
                description: errorMessage,
                variant: "destructive",
            });
        }
    });
  }
  
  if (itemsEligibleForReceiving.length === 0) {
    return (
      <div className="text-center py-8">
        <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">All items on this PO have been fully received.</p>
        <p className="text-sm text-muted-foreground">No further items are pending receipt for PO {purchaseOrder.id}.</p>
         <Button onClick={() => router.push(`/purchase-orders/${purchaseOrder.id}`)} variant="outline" className="mt-6">
            Back to PO Details
        </Button>
      </div>
    );
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleActualSubmit)} className="space-y-6">
        <ScrollArea className="max-h-[60vh] pr-4"> 
          <div className="space-y-4">
            {fields.map((field, index) => {
              const itemData = form.getValues(`items.${index}`);
              const qtyApprovedOrOrdered = itemData.quantityApproved ?? itemData.quantityOrdered;
              const maxReceivableNow = qtyApprovedOrOrdered - itemData.quantityAlreadyReceived;
              
              return (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-md items-end">
                  <div className="md:col-span-2">
                    <FormLabel className="text-sm font-medium">{itemData.itemName}</FormLabel>
                    <p className="text-xs text-muted-foreground">ID: {itemData.inventoryItemId}</p>
                     <p className="text-xs text-muted-foreground">Cost: ${itemData.unitCostAtReceipt.toFixed(2)}/unit</p>
                  </div>
                  
                  <div className="text-sm">
                      <FormLabel>Approved</FormLabel>
                      <p>{qtyApprovedOrOrdered}</p>
                  </div>
                   <div className="text-sm">
                      <FormLabel>Rcvd (Prev.)</FormLabel>
                      <p>{itemData.quantityAlreadyReceived}</p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantityToReceiveNow`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Receive Now (Max: {maxReceivableNow})</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...formField} 
                            placeholder="Qty" 
                            min="0"
                            max={maxReceivableNow}
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
              Enter the quantity you are receiving now for each item. This cannot exceed the remaining approved/ordered quantity.
              Inventory levels, last purchase price, and average cost will be updated upon submission.
            </p>
          </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.push(`/purchase-orders/${purchaseOrder.id}`)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Processing..." : "Submit Received Stock"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

