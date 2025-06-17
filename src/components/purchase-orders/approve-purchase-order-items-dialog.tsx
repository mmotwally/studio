
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import type { PurchaseOrder, ApprovePOFormValues, ApprovePOItemFormValues } from "@/types";
import { approvePurchaseOrderItemsAction } from "@/app/(app)/purchase-orders/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Info } from "lucide-react";

// Client-side validation schema for the approval dialog form
const approvePOItemClientSchema = z.object({
  poItemId: z.string(),
  inventoryItemId: z.string(),
  itemName: z.string(),
  quantityOrdered: z.coerce.number(),
  quantityApproved: z.coerce.number().int().min(0, "Cannot be negative."),
}).refine(data => data.quantityApproved <= data.quantityOrdered, {
  message: "Approved quantity cannot exceed ordered quantity.",
  path: ["quantityApproved"],
});

const approvePOClientSchema = z.object({
  purchaseOrderId: z.string(),
  items: z.array(approvePOItemClientSchema).min(1, "At least one item decision must be made."),
});


interface ApprovePurchaseOrderItemsDialogProps {
  purchaseOrder: PurchaseOrder;
  setOpen: (open: boolean) => void;
  onApprovalProcessed: () => void; 
}

export function ApprovePurchaseOrderItemsDialog({ purchaseOrder, setOpen, onApprovalProcessed }: ApprovePurchaseOrderItemsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const defaultFormValues: ApprovePOFormValues = {
    purchaseOrderId: purchaseOrder.id,
    items: purchaseOrder.items?.map(item => ({
        poItemId: item.id,
        inventoryItemId: item.inventoryItemId,
        itemName: item.inventoryItemName || "Unknown Item",
        quantityOrdered: item.quantityOrdered,
        quantityApproved: item.quantityApproved === null || item.quantityApproved === undefined ? item.quantityOrdered : item.quantityApproved,
    })) || [],
  };

  const form = useForm<ApprovePOFormValues>({
    resolver: zodResolver(approvePOClientSchema),
    defaultValues: defaultFormValues,
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(values: ApprovePOFormValues) {
    if (purchaseOrder.status !== 'PENDING_APPROVAL') {
      toast({
        title: "Action Not Allowed",
        description: `This PO is currently in "${purchaseOrder.status.replace(/_/g, ' ').toLowerCase()}" status and items cannot be approved. Please refresh.`,
        variant: "destructive",
      });
      onApprovalProcessed(); 
      setOpen(false); 
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const itemsToSubmit = values.items.map(item => ({
        poItemId: item.poItemId,
        quantityApproved: item.quantityApproved,
    }));

    try {
      await approvePurchaseOrderItemsAction(values.purchaseOrderId, itemsToSubmit);
      // Redirect is handled by server action
      // No explicit success toast here, it's handled by the detail page after redirect
    } catch (error: any) {
      if (error.digest?.startsWith('NEXT_REDIRECT')) {
        setOpen(false); 
        setIsSubmitting(false);
        throw error; 
      }
      
      console.error("Failed to process PO item approvals:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not process approvals. Please try again.";
      setServerError(errorMessage); 
      toast({
        title: "Approval Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }
  
  if (defaultFormValues.items.length === 0) {
    return (
       <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Item Approvals for PO: {purchaseOrder.id}</DialogTitle>
          <DialogDescription>
            There are no items in this purchase order to approve.
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
    <DialogContent className="sm:max-w-3xl"> 
      <DialogHeader>
        <DialogTitle>Manage Item Approvals for PO: {purchaseOrder.id}</DialogTitle>
        <DialogDescription>
          Specify the quantity you are approving for each item. Set to 0 to effectively reject an item line.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ScrollArea className="max-h-[60vh] pr-4"> 
            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemData = form.getValues(`items.${index}`);
                return (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-md items-center">
                    <div className="md:col-span-1">
                      <FormLabel className="text-sm font-medium">{itemData.itemName}</FormLabel>
                      <p className="text-xs text-muted-foreground">ID: {itemData.inventoryItemId}</p>
                    </div>
                    
                    <div className="text-sm">
                        <FormLabel>Qty Ordered</FormLabel>
                        <p>{itemData.quantityOrdered}</p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityApproved`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>Qty to Approve*</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...formField} 
                              placeholder="Qty" 
                              min="0"
                              max={itemData.quantityOrdered}
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
                Enter the quantity to approve for each item. This cannot exceed the quantity ordered. 
                Setting quantity to 0 means the item line is not approved for purchase.
              </p>
            </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Submit Approved Quantities"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

