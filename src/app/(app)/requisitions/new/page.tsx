
"use client";

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { RequisitionForm } from './components/requisition-form'; // We will create this component
// import { createRequisitionAction } from './actions'; // We will create this action
import type { RequisitionFormValues } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

export default function CreateRequisitionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // const handleSubmit = async (values: RequisitionFormValues) => {
  //   setIsSubmitting(true);
  //   try {
  //     // await createRequisitionAction(values);
  //     toast({
  //       title: "Requisition Created",
  //       description: "Your requisition has been submitted for approval.",
  //     });
  //     router.push('/requisitions');
  //   } catch (error) {
  //     console.error("Failed to create requisition:", error);
  //     toast({
  //       title: "Error",
  //       description: (error instanceof Error ? error.message : "Could not create requisition.") || "Could not create requisition.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

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
            Select items and specify quantities needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20">
            <p className="text-muted-foreground">Requisition form will be here. Under development.</p>
          </div>
          {/* 
            <RequisitionForm 
              onSubmit={handleSubmit} 
              isLoading={isSubmitting} 
            /> 
          */}
        </CardContent>
      </Card>
    </>
  );
}
