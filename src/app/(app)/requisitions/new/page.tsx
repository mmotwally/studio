
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
    startTransition(async () => { // Make the transition callback async
      try {
        await createRequisitionAction(values); // Await the server action
        // If createRequisitionAction successfully redirects, execution effectively stops here
        // for this try block, and Next.js handles the navigation.
        // No client-side success toast is needed as the redirect implies success.
      } catch (error) {
        const errorObj = error as Error & { digest?: string };

        // Log the raw error object for detailed inspection
        console.log("Client caught error object in handleSubmit's catch:", errorObj);

        if (errorObj.digest?.startsWith('NEXT_REDIRECT')) {
          // This is a redirect signal from the server action.
          // Re-throw it so Next.js can handle the client-side navigation.
          console.log(`Identified NEXT_REDIRECT (Digest: ${errorObj.digest}). Re-throwing to Next.js router.`);
          throw error; // Crucial: re-throw to let Next.js process the redirect
        } else {
          // This is a genuine application error from the server action (not a redirect).
          // Display an error toast to the user.
          console.error("Application error during requisition creation (displaying toast):", errorObj.message);
          toast({
            title: "Error Creating Requisition",
            description: errorObj.message || "Could not create requisition. Please try again.",
            variant: "destructive",
          });
        }
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
