
"use client";

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequisitionForm } from '@/components/requisitions/requisition-form'; 
import { createRequisitionAction } from '../actions'; 
import type { RequisitionFormValues } from '../schema';
import { useToast } from "@/hooks/use-toast";

// Define an interface for the error object that Next.js throws for redirects
interface NextRedirectError extends Error {
  digest?: string;
}

export default function CreateRequisitionPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = async (values: RequisitionFormValues) => {
    startTransition(async () => {
      try {
        await createRequisitionAction(values);
        // If createRequisitionAction calls redirect(), Next.js should handle it,
        // and this try...catch should ideally not catch the redirect signal
        // if the re-throw logic below works correctly.
      } catch (error) {
        const typedError = error as NextRedirectError;

        // Check for the specific 'NEXT_REDIRECT' digest.
        // This is the canonical way Next.js signals a redirect internally.
        if (typedError.digest === 'NEXT_REDIRECT') {
          // Re-throw the error so Next.js's router can handle the client-side navigation.
          throw typedError;
        }
        
        // If it's not a NEXT_REDIRECT error, it's an actual application error from the server action.
        console.error("Application error during requisition creation:", error);
        
        let title = "Error Creating Requisition";
        let description = "Could not create requisition. Please try again.";

        if (error instanceof Error) {
           // Use the error message from the action if available
           description = error.message || description;
        }
        
        toast({
          title: title,
          description: description,
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
