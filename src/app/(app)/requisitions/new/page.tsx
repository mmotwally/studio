
"use client";

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequisitionForm } from '@/components/requisitions/requisition-form'; 
import { createRequisitionAction } from '../actions'; 
import type { RequisitionFormValues } from '../schema';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

export default function CreateRequisitionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (values: RequisitionFormValues) => {
    setIsSubmitting(true);
    try {
      await createRequisitionAction(values);
      // Toast and redirect are handled by the action on success.
      // If createRequisitionAction is successful and calls redirect(),
      // this try block will effectively be exited by the redirect,
      // and the catch block below should not be hit.
    } catch (error) {
      console.error("Failed to create requisition:", error);
      let description = "Could not create requisition. Please try again.";
      if (error instanceof Error) {
        // Check if the error message is "NEXT_REDIRECT"
        // This can happen if the server action itself throws an error,
        // but Next.js still processes the redirect call at the end of the action.
        if (error.message.toUpperCase() === 'NEXT_REDIRECT') {
          description = "An unexpected error occurred. Please check if the requisition was created or try again.";
        } else {
          description = error.message;
        }
      }
      toast({
        title: "Error Creating Requisition",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            isLoading={isSubmitting} 
          /> 
        </CardContent>
      </Card>
    </>
  );
}
