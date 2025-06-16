
"use client";

import * as React from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Eye, Edit, FileX2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Requisition } from "@/types";
import { updateRequisitionStatusAction, deleteRequisitionAction } from "@/app/(app)/requisitions/actions";

interface RequisitionRowActionsProps {
  requisition: Requisition;
}

export function RequisitionRowActions({ requisition }: RequisitionRowActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const canEdit = requisition.status === 'PENDING_APPROVAL' || 
                  requisition.status === 'APPROVED' || 
                  requisition.status === 'PARTIALLY_FULFILLED' ||
                  requisition.status === 'FULFILLED' || // Allow editing fulfilled to potentially adjust/correct
                  requisition.status === 'REJECTED'; // Allow editing rejected to resubmit

  const canCancel = requisition.status === 'PENDING_APPROVAL' || 
                    requisition.status === 'APPROVED' || 
                    requisition.status === 'PARTIALLY_FULFILLED' || 
                    requisition.status === 'FULFILLED';
                    
  // Allow deletion for most statuses, as stock will be returned.
  const canDelete = true; 

  const handleCancelRequisition = async () => {
    startTransition(async () => {
      try {
        await updateRequisitionStatusAction(requisition.id, 'CANCELLED');
        toast({
          title: "Requisition Cancelled",
          description: `Requisition ${requisition.id} has been cancelled. Issued stock (if any) returned.`,
        });
        // router.refresh(); // Handled by revalidatePath in action
      } catch (error) {
        console.error("Failed to cancel requisition:", error);
        toast({
          title: "Error",
          description: (error instanceof Error ? error.message : "Could not cancel requisition.") || "Could not cancel requisition.",
          variant: "destructive",
        });
      } finally {
        setIsCancelAlertOpen(false);
      }
    });
  };

  const handleDeleteRequisition = async () => {
    startTransition(async () => {
      try {
        const result = await deleteRequisitionAction(requisition.id);
        if (result.success) {
          toast({
            title: "Requisition Deleted",
            description: result.message,
          });
          // router.refresh(); // Handled by revalidatePath in action
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("Failed to delete requisition:", error);
        toast({
          title: "Error",
          description: (error instanceof Error ? error.message : "Could not delete requisition.") || "Could not delete requisition.",
          variant: "destructive",
        });
      } finally {
        setIsDeleteAlertOpen(false);
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link href={`/requisitions/${requisition.id}`} passHref legacyBehavior>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View Details">
            <Eye className="h-4 w-4" />
            <span className="sr-only">View Details for {requisition.id}</span>
          </Button>
        </Link>

        {canEdit && (
          <Link href={`/requisitions/${requisition.id}/edit`} passHref legacyBehavior>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Requisition">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit {requisition.id}</span>
            </Button>
          </Link>
        )}

        {canCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Cancel Requisition"
            onClick={(e) => { e.preventDefault(); setIsCancelAlertOpen(true); }}
            disabled={isPending || requisition.status === 'CANCELLED'}
          >
            <FileX2 className="h-4 w-4" />
            <span className="sr-only">Cancel {requisition.id}</span>
          </Button>
        )}
        
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete Requisition"
            onClick={(e) => { e.preventDefault(); setIsDeleteAlertOpen(true); }}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete {requisition.id}</span>
          </Button>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Requisition?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel requisition <span className="font-semibold">{requisition.id}</span>? 
              If this requisition was partially or fully fulfilled, the issued stock will be returned to inventory.
              This action cannot be undone easily.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequisition}
              disabled={isPending}
              className={buttonVariants({ variant: "outline" })}
            >
              {isPending ? "Cancelling..." : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requisition?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete requisition <span className="font-semibold">{requisition.id}</span> and all its items? 
              Any stock that was issued for this requisition will be returned to inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequisition}
              disabled={isPending}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isPending ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    