
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiveStockForm } from '@/components/purchase-orders/receive-stock-form';
import { getPurchaseOrderById } from '../actions';
import type { PurchaseOrder } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ReceivePurchaseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const poId = params.poId as string;
  const { toast } = useToast();

  const [purchaseOrder, setPurchaseOrder] = React.useState<PurchaseOrder | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (poId) {
      setIsLoadingData(true);
      getPurchaseOrderById(poId)
        .then(fetchedPO => {
          if (fetchedPO) {
            if (fetchedPO.status !== 'ORDERED' && fetchedPO.status !== 'PARTIALLY_RECEIVED') {
              setError(`Cannot receive stock for this PO. Status is ${fetchedPO.status.replace(/_/g, ' ').toLowerCase()}.`);
              toast({ title: "Receiving Not Allowed", description: `PO status must be 'Ordered' or 'Partially Received'.`, variant: "destructive" });
            }
            setPurchaseOrder(fetchedPO);
          } else {
            setError("Purchase Order not found.");
            toast({ title: "Error", description: "Purchase Order not found.", variant: "destructive" });
          }
        })
        .catch(err => {
          console.error("Failed to fetch PO for receiving:", err);
          setError("Failed to load PO data for receiving.");
          toast({ title: "Error", description: "Could not load PO data.", variant: "destructive" });
        })
        .finally(() => setIsLoadingData(false));
    }
  }, [poId, toast]);


  if (isLoadingData) {
    return (
      <>
        <PageHeader title="Receive Stock" description="Loading PO details for receiving..." />
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
        <PageHeader title="Error Receiving Stock" description={error} />
        <Button onClick={() => router.push(`/purchase-orders/${poId}`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO Details
        </Button>
      </>
    );
  }

  if (!purchaseOrder) {
    return (
      <>
        <PageHeader title="Receive Stock" description="PO not found or data incomplete." />
        <Button onClick={() => router.push('/purchase-orders')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO List
        </Button>
      </>
    );
  }
  
  const isReceivingDisabled = purchaseOrder.status !== 'ORDERED' && purchaseOrder.status !== 'PARTIALLY_RECEIVED';

  return (
    <>
      <PageHeader
        title={`Receive Stock for PO: ${purchaseOrder.id}`}
        description={isReceivingDisabled ? `Stock cannot be received for this PO. Status: ${purchaseOrder.status.replace(/_/g, ' ').toLowerCase()}` : "Enter quantities received for each item."}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Receive Items</CardTitle>
          <CardDescription>
            Update the quantity received for each item. This will update inventory levels and costs.
            Current Status: <span className="font-semibold">{purchaseOrder.status.replace(/_/g, ' ').toLowerCase()}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isReceivingDisabled ? (
             <p className="text-destructive">This PO is not in a state where stock can be received.</p>
          ) : (
            <ReceiveStockForm purchaseOrder={purchaseOrder} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
