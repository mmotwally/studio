
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form';
import { getPurchaseOrderById, updatePurchaseOrderAction } from '../../actions';
import type { PurchaseOrderFormValues } from '../../schema';
import type { PurchaseOrder } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditPurchaseOrderPage() {
  const router = useRouter();
  const paramsPromise = useParams();
  const params = React.use(paramsPromise);
  const poId = params.poId as string;
  const { toast } = useToast();

  const [purchaseOrder, setPurchaseOrder] = React.useState<PurchaseOrder | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (poId) {
      setIsLoadingData(true);
      getPurchaseOrderById(poId)
        .then(fetchedPO => {
          if (fetchedPO) {
            if (fetchedPO.status !== 'DRAFT' && fetchedPO.status !== 'PENDING_APPROVAL') {
              setError(`This PO cannot be edited. Status is ${fetchedPO.status.replace(/_/g, ' ').toLowerCase()}.`);
              toast({ title: "Edit Not Allowed", description: `PO status is ${fetchedPO.status.replace(/_/g, ' ').toLowerCase()}.`, variant: "destructive" });
            }
            setPurchaseOrder(fetchedPO);
          } else {
            setError("Purchase Order not found.");
            toast({ title: "Error", description: "Purchase Order not found.", variant: "destructive" });
          }
        })
        .catch(err => {
          console.error("Failed to fetch PO:", err);
          setError("Failed to load PO data.");
          toast({ title: "Error", description: "Could not load PO data.", variant: "destructive" });
        })
        .finally(() => setIsLoadingData(false));
    }
  }, [poId, toast]);

  const handleSubmit = (values: PurchaseOrderFormValues) => {
    if (!purchaseOrder) return;
    if (purchaseOrder.status !== 'DRAFT' && purchaseOrder.status !== 'PENDING_APPROVAL') {
        toast({ title: "Cannot Update", description: "This PO can no longer be edited.", variant: "destructive" });
        return;
    }

    startTransition(async () => {
      setIsSubmitting(true);
      try {
        await updatePurchaseOrderAction(purchaseOrder.id, values);
        // Server action should handle redirect and success toast
      } catch (err: any) {
        if (err.digest?.startsWith('NEXT_REDIRECT')) {
          throw err; 
        }
        console.error("Client-side error during PO update:", err);
        toast({
          title: "Error Updating Purchase Order",
          description: (err instanceof Error ? err.message : String(err)) || "Could not update PO. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false); // Only reset if not a redirect
      }
      // No need to setIsSubmitting(false) here for success, as redirect handles it.
    });
  };

  const defaultFormValues: Partial<PurchaseOrderFormValues> | undefined = React.useMemo(() => {
    if (!purchaseOrder) return undefined;
    return {
      supplierId: purchaseOrder.supplierId,
      orderDate: purchaseOrder.orderDate ? new Date(purchaseOrder.orderDate) : new Date(),
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate) : null,
      notes: purchaseOrder.notes || "",
      shippingAddress: purchaseOrder.shippingAddress || "",
      billingAddress: purchaseOrder.billingAddress || "",
      items: purchaseOrder.items?.map(item => ({
        inventoryItemId: item.inventoryItemId,
        description: item.description || "",
        quantityOrdered: item.quantityOrdered,
        unitCost: item.unitCost,
        // quantityApproved is not part of the form values for edit, it's handled by a separate process.
      })) || [{ inventoryItemId: "", quantityOrdered: 1, unitCost: 0, description: "" }],
    };
  }, [purchaseOrder]);

  if (isLoadingData) {
    return (
      <>
        <PageHeader title="Edit Purchase Order" description="Loading PO details..." />
        <Card className="shadow-lg">
          <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
          <CardContent><div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div></CardContent>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Error" description={error} />
        <Button onClick={() => router.push(`/purchase-orders/${poId}`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO Details
        </Button>
      </>
    );
  }

  if (!purchaseOrder || !defaultFormValues) {
    return (
      <>
        <PageHeader title="Edit Purchase Order" description="PO not found or data incomplete." />
        <Button onClick={() => router.push('/purchase-orders')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO List
        </Button>
      </>
    );
  }
  
  const isFormDisabled = purchaseOrder.status !== 'DRAFT' && purchaseOrder.status !== 'PENDING_APPROVAL';

  return (
    <>
      <PageHeader
        title={`Edit Purchase Order: ${purchaseOrder.id}`}
        description={isFormDisabled ? `This PO cannot be edited. Status: ${purchaseOrder.status.replace(/_/g, ' ').toLowerCase()}` : "Modify the details of this purchase order."}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>PO Details</CardTitle>
          <CardDescription>
            Update supplier, items, quantities, and costs.
            Current Status: <span className="font-semibold">{purchaseOrder.status.replace(/_/g, ' ').toLowerCase()}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseOrderForm
            onSubmit={handleSubmit}
            isLoading={isPending || isSubmitting}
            defaultValues={defaultFormValues}
            isEditMode={true}
            // Pass a disabled prop to the form if needed, or handle disabling within the form itself
          />
        </CardContent>
      </Card>
    </>
  );
}
