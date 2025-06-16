
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
          // This block should ideally not be reached if createRequisitionAction
          // successfully calls redirect(), as Next.js should handle the navigation.
          // However, if the action completes without a redirect (e.g., returns data),
          // you might want a success toast here.
          // For this specific 'create' action that redirects, we don't expect a success toast here.
          console.log("Requisition action promise resolved without redirect being caught on client.");
        })
        .catch((error) => {
          // This catch block will handle any errors from createRequisitionAction
          // that are *not* the Next.js redirect signal, or if the redirect signal
          // is unexpectedly caught here.
          console.error("Error during requisition creation:", error);
          toast({
            title: "Error Creating Requisition",
            description: (error instanceof Error ? error.message : String(error)) || "Could not create requisition. Please try again.",
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
