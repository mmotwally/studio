
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
    startTransition(async () => {
      try {
        await createRequisitionAction(values);
        // If createRequisitionAction calls redirect(), an error is thrown,
        // and execution jumps to the catch block.
        // This part of the try block should not be reached on a successful redirect.
      } catch (error: any) {
        // Log the error for debugging, regardless of type
        console.error("Client-side error during requisition creation:", error);

        if (error.digest?.startsWith('NEXT_REDIRECT')) {
          // This is the specific error thrown by redirect().
          // Re-throw it so Next.js can handle the client-side navigation.
          console.log("Re-throwing NEXT_REDIRECT error (digest matched).");
          throw error;
        }
        
        // If it's any other error, it's a genuine application error.
        // Display a toast to the user.
        toast({
          title: "Error Creating Requisition",
          description: (error instanceof Error ? error.message : String(error)) || "Could not create requisition. Please try again.",
          variant: "destructive",
        });
      }
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
