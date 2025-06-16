
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

  const handleSubmit = async (values: RequisitionFormValues) => {
    startTransition(async () => {
      try {
        await createRequisitionAction(values);
        // If createRequisitionAction calls redirect(), this part should not be reached.
      } catch (error) {
        console.error("Client-side error during requisition creation:", error);

        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
          // This is the special error Next.js throws for redirects.
          // It MUST be re-thrown for Next.js to handle the redirect.
          throw error;
        }
        
        // Handle other, actual errors
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
