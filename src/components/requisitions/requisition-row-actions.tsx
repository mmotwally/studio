
"use client";

import * as React from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation"; // For re-fetching data after action
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Edit, Trash2, FileX2, Eye } from "lucide-react";
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

  const canEdit = requisition.status === 'PENDING_APPROVAL';
  const canCancel = requisition.status === 'PENDING_APPROVAL' || requisition.status === 'APPROVED';
  const canDelete = ['PENDING_APPROVAL', 'REJECTED', 'CANCELLED'].includes(requisition.status);

  const handleCancelRequisition = async () => {
    startTransition(async () => {
      try {
        await updateRequisitionStatusAction(requisition.id, 'CANCELLED');
        toast({
          title: "Requisition Cancelled",
          description: `Requisition ${requisition.id} has been cancelled.`,
        });
        // router.refresh(); // Re-fetches data for the current route
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
          // router.refresh(); 
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu for {requisition.id}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem asChild>
            <Link href={`/requisitions/${requisition.id}`}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Link>
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/requisitions/${requisition.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit Requisition
              </Link>
            </DropdownMenuItem>
          )}

          {canCancel && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsCancelAlertOpen(true); }} className="cursor-pointer">
              <FileX2 className="mr-2 h-4 w-4" /> Cancel Requisition
            </DropdownMenuItem>
          )}
          
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setIsDeleteAlertOpen(true); }}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Requisition
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Requisition?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel requisition <span className="font-semibold">{requisition.id}</span>? 
              This action cannot be undone easily.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequisition}
              disabled={isPending}
              className={buttonVariants({ variant: "outline" })} // Use a less destructive variant for cancel
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
              This action cannot be undone.
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
