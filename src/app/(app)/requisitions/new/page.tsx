
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
        .then(() => {
          // This toast is unlikely to be shown if the action successfully redirects.
          // It's here as a fallback if the action completes but somehow doesn't trigger a redirect
          // (which would be an unusual case for a successful create-and-redirect pattern).
          toast({
            title: "Success (No Redirect)",
            description: "Requisition created, but redirect did not occur. Please check the requisitions list.",
          });
        })
        .catch((error) => {
          // Next.js redirect signals are typically not caught here if the server action is set up correctly.
          // This catch block is for genuine application errors from the server action.
          console.error("Client-side error during requisition creation:", error);
          toast({
            title: "Error Creating Requisition",
            description: (error instanceof Error && error.message !== 'NEXT_REDIRECT' && !error.message.startsWith('NEXT_REDIRECT')) 
                           ? error.message 
                           : "Could not create requisition. Please try again.",
            variant: "destructive",
          });
        });
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
