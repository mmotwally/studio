
"use client";

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequisitionForm } from '@/components/requisitions/requisition-form';
import { createRequisitionAction } from '../actions';
import type { RequisitionFormValues } from '../schema';
import { useToast } from "@/hooks/use-toast";

export default function CreateRequisitionPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = (values: RequisitionFormValues) => {
    startTransition(() => {
      createRequisitionAction(values)
        .catch((error) => {
          const errorObj = error as Error & { digest?: string };

          // Log the caught error structure for debugging
          console.log("Client caught error in .catch():", {
              message: errorObj.message,
              digest: errorObj.digest,
              name: errorObj.name,
          });

          if (errorObj.digest?.startsWith('NEXT_REDIRECT')) {
            // This error should ideally be handled by Next.js before it's caught here.
            // If it IS caught here, re-throwing it is the correct pattern.
            // This allows Next.js to complete the client-side navigation.
            console.log("Re-throwing NEXT_REDIRECT error from .catch().");
            throw error;
          }

          // If it's a non-redirect error, it's an actual application error.
          console.error("Application error during requisition creation (displaying toast):", error);
          toast({
            title: "Error Creating Requisition",
            description: errorObj.message || "Could not create requisition. Please try again.",
            variant: "destructive",
          });
        });
      // No .then() is typically needed if the action's success is a redirect.
      // The redirect itself handles the "success" navigation.
    });
  };

  return (
    <>
      <PageHeader
        title="Create New Requisition"
        description="Fill in the details to request items from inventory."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Requisition Details</CardTitle>
          <CardDescription>
            Select items and specify quantities needed. Item ID will be auto-generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequisitionForm
            onSubmit={handleSubmit}
            isLoading={isPending}
          />
        </CardContent>
      </Card>
    </>
  );
}
