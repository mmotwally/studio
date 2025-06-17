
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequisitionForm } from '@/components/requisitions/requisition-form';
import { getRequisitionById, updateRequisitionAction } from '../../actions';
import type { RequisitionFormValues } from '../../schema';
import type { Requisition, RequisitionStatus } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, ArrowLeft } from 'lucide-react';

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
            setRequisition(fetchedRequisition);
            
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
      } catch (err: any) {
         if (err.digest?.startsWith('NEXT_REDIRECT')) {
          throw err; 
        }
        console.error("Client-side error during requisition update:", err);
        toast({
          title: "Error Updating Requisition",
          description: (err instanceof Error ? err.message : String(err)) || "Could not update requisition. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false); 
      } 
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

  const defaultFormValues: Partial<RequisitionFormValues> = {
    departmentId: requisition.departmentId || "",
    orderNumber: requisition.orderNumber || "",
    bomNumber: requisition.bomNumber || "",
    dateNeeded: requisition.dateNeeded ? new Date(requisition.dateNeeded) : undefined, // Ensure it's Date or undefined
    notes: requisition.notes || "",
    items: requisition.items?.map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantityRequested: item.quantityRequested,
      notes: item.notes || "",
    })) || [{ inventoryItemId: "", quantityRequested: 1, notes: "" }],
  };
  
  const showFulfilledWarning = requisition.status === 'FULFILLED' || requisition.status === 'PARTIALLY_FULFILLED';


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
            Update item quantities or notes. 
            {showFulfilledWarning && " Modifying a (partially) fulfilled requisition will return issued items to stock and reset its fulfillment status, requiring it to be processed again."}
            Current Status: <span className="font-semibold">{requisition.status.replace(/_/g, ' ').toLowerCase()}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showFulfilledWarning && (
             <Alert variant="default" className="mb-6 border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-700/20 dark:text-yellow-300 dark:border-yellow-600">
                <Info className="h-4 w-4" />
                <AlertTitle>Editing Fulfilled Requisition</AlertTitle>
                <AlertDescription>
                    Saving changes to this requisition will return any previously issued items to inventory. 
                    The requisition status will be updated to 'Approved' and will require re-fulfillment.
                </AlertDescription>
            </Alert>
          )}
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
    
