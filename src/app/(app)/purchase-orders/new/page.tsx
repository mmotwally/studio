
"use client"; 

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form';
import { createPurchaseOrderAction } from '../actions';
import type { PurchaseOrderFormValues } from '../schema';
import { useToast } from "@/hooks/use-toast";

export default function CreatePurchaseOrderPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = async (values: PurchaseOrderFormValues) => {
    startTransition(async () => {
      try {
        await createPurchaseOrderAction(values);
        // Redirect and success toast should be handled by the server action or pattern
      } catch (error: any) {
        console.error("Client-side error during PO creation:", error);
        if (error.digest?.startsWith('NEXT_REDIRECT')) {
            // This is the specific error thrown by redirect().
            // Re-throw it so Next.js can handle the client-side navigation.
            throw error; 
        }
        toast({
          title: "Error Creating Purchase Order",
          description: (error instanceof Error ? error.message : String(error)) || "Could not create PO.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      <PageHeader
        title="Create New Purchase Order"
        description="Fill in the details to create a new purchase order."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
          <CardDescription>
            Select a supplier, items, quantities, and costs. PO ID will be auto-generated upon creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseOrderForm onSubmit={handleSubmit} isLoading={isPending} />
        </CardContent>
      </Card>
    </>
  );
}
