
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequisitionForm } from '@/components/requisitions/requisition-form';
import { getRequisitionById, updateRequisitionAction } from '../actions';
import type { RequisitionFormValues, RequisitionItemFormValues } from '../schema';
import type { Requisition } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button'; // For error state
import { ArrowLeft } from 'lucide-react';

export default function EditRequisitionPage() {
  const router = useRouter();
  const params = useParams();
  const requisitionId = params.requisitionId as string;
  const { toast } = useToast();

  const [requisition, setRequisition] = React.useState<Requisition | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();


  React.useEffect(() => {
    if (requisitionId) {
      setIsLoadingData(true);
      getRequisitionById(requisitionId)
        .then(fetchedRequisition => {
          if (fetchedRequisition) {
            if (fetchedRequisition.status !== 'PENDING_APPROVAL') {
                setError("This requisition cannot be edited as it's no longer pending approval.");
                toast({ title: "Cannot Edit", description: "Only requisitions pending approval can be edited.", variant: "destructive" });
            } else {
                setRequisition(fetchedRequisition);
            }
          } else {
            setError("Requisition not found.");
            toast({ title: "Error", description: "Requisition not found.", variant: "destructive" });
          }
        })
        .catch(err => {
          console.error("Failed to fetch requisition:", err);
          setError("Failed to load requisition data.");
          toast({ title: "Error", description: "Could not load requisition data.", variant: "destructive" });
        })
        .finally(() => setIsLoadingData(false));
    }
  }, [requisitionId, toast]);

  const handleSubmit = (values: RequisitionFormValues) => {
    if (!requisition) return;

    startTransition(async () => {
      setIsSubmitting(true);
      try {
        await updateRequisitionAction(requisition.id, values);
        // Redirect is handled by the action
      } catch (err: any) {
         if (err.digest?.startsWith('NEXT_REDIRECT')) {
          throw err; // Re-throw for Next.js to handle client-side navigation
        }
        console.error("Client-side error during requisition update:", err);
        toast({
          title: "Error Updating Requisition",
          description: (err instanceof Error ? err.message : String(err)) || "Could not update requisition. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false); // Only set if not a redirect error
      } 
      // setIsSubmitting(false) will be handled by redirect or finally block if it fails before redirect
    });
  };


  if (isLoadingData) {
    return (
      <>
        <PageHeader title="Edit Requisition" description="Loading requisition details..." />
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Error" description={error} />
        <Button onClick={() => router.push(`/requisitions/${requisitionId}`)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Requisition Details
        </Button>
      </>
    );
  }
  
  if (!requisition) {
     return (
      <>
        <PageHeader title="Edit Requisition" description="Requisition not found." />
         <Button onClick={() => router.push('/requisitions')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Requisitions List
        </Button>
      </>
    );
  }

  const defaultFormValues: RequisitionFormValues = {
    dateNeeded: requisition.dateNeeded ? new Date(requisition.dateNeeded) : null,
    notes: requisition.notes || "",
    items: requisition.items?.map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantityRequested: item.quantityRequested,
      notes: item.notes || "",
    })) || [{ inventoryItemId: "", quantityRequested: 1, notes: "" }],
  };

  return (
    <>
      <PageHeader
        title={`Edit Requisition: ${requisition.id}`}
        description="Modify the details of this requisition."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Requisition Details</CardTitle>
          <CardDescription>
            Update item quantities or notes. To add or remove items, you might need to cancel and create a new requisition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequisitionForm
            onSubmit={handleSubmit}
            isLoading={isPending || isSubmitting}
            defaultValues={defaultFormValues}
            isEditMode={true}
          />
        </CardContent>
      </Card>
    </>
  );
}
