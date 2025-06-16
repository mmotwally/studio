
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
        // If createRequisitionAction successfully calls redirect(), 
        // Next.js router should handle client-side navigation, and the promise 
        // from the action should not reject in a way that this catch block
        // is hit with a redirect signal when used with startTransition.
      } catch (error) {
        const errorObj = error as Error & { digest?: string }; // Cast for potential digest property

        // Log the caught error structure for debugging
        console.log("Client caught error:", { 
            message: errorObj.message, 
            digest: errorObj.digest, 
            name: errorObj.name,
            // stack: errorObj.stack // Full stack can be verbose
        });

        // Check for Next.js redirect signal (digest is the most reliable)
        if (errorObj.digest === 'NEXT_REDIRECT') {
          console.log("Re-throwing error based on digest: NEXT_REDIRECT");
          throw error; // Re-throw for Next.js router to handle
        }
        
        // Fallback: Check message if digest is not NEXT_REDIRECT (e.g., due to serialization)
        // This addresses the case where the toast was showing "NEXT_REDIRECT" as the message.
        if (errorObj.message === 'NEXT_REDIRECT') {
          console.warn("Re-throwing error based on message: NEXT_REDIRECT (digest was: " + errorObj.digest + ")");
          throw error; // Re-throw for Next.js router to handle
        }

        // If it's a non-redirect error, it's an actual application error.
        console.error("Application error during requisition creation (displaying toast):", error);
        toast({
          title: "Error Creating Requisition",
          description: errorObj.message || "Could not create requisition. Please try again.",
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
