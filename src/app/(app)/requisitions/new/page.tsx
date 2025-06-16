
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
  const router = useRouter(); // Import router if you want to use client-side redirect as fallback
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (values: RequisitionFormValues) => {
    setIsSubmitting(true);
    try {
      await createRequisitionAction(values);
      // If createRequisitionAction is successful and calls redirect(),
      // this try block will effectively be exited by the redirect,
      // and the catch block below should not be hit for a successful server-side redirect.
    } catch (error) {
      console.error("Failed to create requisition:", error);
      let title = "Error Creating Requisition";
      let description = "Could not create requisition. Please try again.";
      let variant: "destructive" | "default" = "destructive";

      if (error instanceof Error) {
        if (error.message.includes('NEXT_REDIRECT')) {
          // This suggests the server-side action likely finished its database operations
          // and the issue arose during the redirect process itself or how its signal was handled.
          title = "Requisition Submitted";
          description = "Requisition process initiated. If you are not redirected automatically, please check the requisitions list.";
          variant = "default"; // Use default variant for this potentially non-critical error
          // Optionally, trigger a client-side redirect as a fallback:
          // router.push('/requisitions'); 
        } else if (error.message.startsWith('Database operation failed:')) {
          description = error.message; // Show the specific database error
        } else {
          description = error.message; // Show other specific errors from the action
        }
      }
      
      toast({
        title: title,
        description: description,
        variant: variant,
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
