
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
import type { Requisition, ApproveRequisitionFormValues, ApproveRequisitionItemFormValues } from "@/types";
import { approveRequisitionItemsAction } from "@/app/(app)/requisitions/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Info } from "lucide-react";

// Client-side validation schema for the approval dialog form
const approveRequisitionItemClientSchema = z.object({
  requisitionItemId: z.string(),
  inventoryItemId: z.string(),
  itemName: z.string(),
  quantityRequested: z.coerce.number(),
  quantityToApprove: z.coerce.number().int().min(0, "Cannot be negative."),
}).refine(data => data.quantityToApprove <= data.quantityRequested, {
  message: "Approved quantity cannot exceed requested quantity.",
  path: ["quantityToApprove"],
});

const approveRequisitionClientSchema = z.object({
  requisitionId: z.string(),
  items: z.array(approveRequisitionItemClientSchema).min(1, "At least one item decision must be made."),
});


interface ApproveRequisitionItemsDialogProps {
  requisition: Requisition;
  setOpen: (open: boolean) => void;
  onApprovalProcessed: () => void; 
}

export function ApproveRequisitionItemsDialog({ requisition, setOpen, onApprovalProcessed }: ApproveRequisitionItemsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const defaultFormValues: ApproveRequisitionFormValues = {
    requisitionId: requisition.id,
    items: requisition.items?.map(item => ({
        requisitionItemId: item.id,
        inventoryItemId: item.inventoryItemId,
        itemName: item.inventoryItemName || "Unknown Item",
        quantityRequested: item.quantityRequested,
        quantityToApprove: item.quantityApproved === null || item.quantityApproved === undefined ? item.quantityRequested : item.quantityApproved,
    })) || [],
  };

  const form = useForm<ApproveRequisitionFormValues>({
    resolver: zodResolver(approveRequisitionClientSchema),
    defaultValues: defaultFormValues,
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(values: ApproveRequisitionFormValues) {
    // Client-side pre-check based on the requisition data the dialog has
    if (requisition.status !== 'PENDING_APPROVAL') {
      toast({
        title: "Action Not Allowed",
        description: `This requisition is currently in "${requisition.status.replace(/_/g, ' ').toLowerCase()}" status and items cannot be approved. Please refresh the page or close this dialog.`,
        variant: "destructive",
      });
      setIsSubmitting(false); // Ensure button is re-enabled
      onApprovalProcessed(); // Refresh parent page data as it's stale
      setOpen(false); // Close the dialog
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    let caughtError: any = null;

    const itemsToSubmit = values.items.map(item => ({
        requisitionItemId: item.requisitionItemId,
        quantityToApprove: item.quantityToApprove,
    }));

    try {
      await approveRequisitionItemsAction(values.requisitionId, itemsToSubmit);
      // If action redirects, this part is usually not reached.
    } catch (error: any) {
      caughtError = error;
      if (error.digest?.startsWith('NEXT_REDIRECT')) {
        // Re-throw the redirect error so Next.js can handle it
        throw error; 
      }
      // Handle actual application errors (not redirects)
      console.error("Failed to process item approvals:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not process approvals. Please try again.";
      setServerError(errorMessage); 
      toast({
        title: "Approval Error",
        description: errorMessage,
        variant: "destructive",
      });

      // If the specific error about status not being PENDING_APPROVAL occurs,
      // refresh parent data and close the dialog.
      if (errorMessage.includes("Cannot approve items for a requisition that is not in 'PENDING_APPROVAL' status")) {
        onApprovalProcessed(); // Refresh parent page data
        setOpen(false); // Close the dialog
      }

    } finally {
      // Only set isSubmitting to false if no redirect was thrown and caught.
      // If a redirect is thrown, the component will unmount, so no need to update state.
      if (!(caughtError && caughtError.digest?.startsWith('NEXT_REDIRECT'))) {
        setIsSubmitting(false);
      }
    }
  }
  
  if (defaultFormValues.items.length === 0) {
    return (
       <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Item Approvals for: {requisition.id}</DialogTitle>
          <DialogDescription>
            There are no items in this requisition to approve.
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
        <DialogTitle>Manage Item Approvals for: {requisition.id}</DialogTitle>
        <DialogDescription>
          Specify the quantity you are approving for each item. Set to 0 to reject an item.
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
                        <FormLabel>Qty Requested</FormLabel>
                        <p>{itemData.quantityRequested}</p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityToApprove`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>Qty to Approve*</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...formField} 
                              placeholder="Qty" 
                              min="0"
                              max={itemData.quantityRequested}
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

          {serverError && !serverError.includes("Cannot approve items for a requisition that is not in 'PENDING_APPROVAL' status") && (
            // Only show generic server error if it's not the specific status one handled by toast + auto-close
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p>{serverError}</p>
            </div>
          )}
           <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Enter the quantity to approve for each item. This cannot exceed the quantity requested. 
                Setting quantity to 0 means the item is not approved.
              </p>
            </div>


          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Submit Approval Decisions"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

