
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
      // Toast and redirect are handled by the action on success
    } catch (error) {
      console.error("Failed to create requisition:", error);
      toast({
        title: "Error Creating Requisition",
        description: (error instanceof Error ? error.message : "Could not create requisition.") || "Could not create requisition.",
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
