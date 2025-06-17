
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
import type { PurchaseOrder } from "@/types";
import { deletePurchaseOrderAction, updatePurchaseOrderStatusAction } from "@/app/(app)/purchase-orders/actions";

interface PurchaseOrderRowActionsProps {
  po: PurchaseOrder;
}

export function PurchaseOrderRowActions({ po }: PurchaseOrderRowActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [alertAction, setAlertAction] = React.useState<"cancel" | "delete" | null>(null);
  const [alertContent, setAlertContent] = React.useState<{ title: string; description: string }>({ title: "", description: "" });
  const [isPending, startTransition] = React.useTransition();

  const canEdit = po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL';
  const canCancel = !['RECEIVED', 'CANCELLED'].includes(po.status);
  const canDelete = po.status === 'DRAFT' || po.status === 'CANCELLED';

  const handleMainAction = async () => {
    if (!alertAction) return;

    startTransition(async () => {
      try {
        if (alertAction === "delete") {
          const result = await deletePurchaseOrderAction(po.id);
          if (result.success) {
            toast({ title: "PO Deleted", description: result.message });
          } else {
            throw new Error(result.message);
          }
        } else if (alertAction === "cancel") {
          const result = await updatePurchaseOrderStatusAction(po.id, 'CANCELLED');
           if (result.success) {
            toast({ title: "PO Cancelled", description: result.message });
          } else {
            throw new Error(result.message);
          }
        }
        // Revalidation is handled by server actions
      } catch (error) {
        console.error(`Failed to ${alertAction} PO:`, error);
        toast({
          title: "Error",
          description: (error instanceof Error ? error.message : `Could not ${alertAction} PO.`) || `Could not ${alertAction} PO.`,
          variant: "destructive",
        });
      } finally {
        setIsAlertOpen(false);
        setAlertAction(null);
      }
    });
  };

  const openConfirmationDialog = (actionType: "cancel" | "delete") => {
    setAlertAction(actionType);
    if (actionType === "delete") {
      setAlertContent({
        title: "Delete Purchase Order?",
        description: `Are you sure you want to permanently delete PO ${po.id} and all its items? This action cannot be undone.`
      });
    } else if (actionType === "cancel") {
      setAlertContent({
        title: "Cancel Purchase Order?",
        description: `Are you sure you want to cancel PO ${po.id}? This may have implications if it's already been processed by the supplier.`
      });
    }
    setIsAlertOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link href={`/purchase-orders/${po.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View Details">
            <Eye className="h-4 w-4" />
            <span className="sr-only">View Details for {po.id}</span>
          </Button>
        </Link>

        {canEdit && (
          <Link href={`/purchase-orders/${po.id}/edit`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit PO">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit {po.id}</span>
            </Button>
          </Link>
        )}

        {canCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Cancel PO"
            onClick={() => openConfirmationDialog("cancel")}
            disabled={isPending || po.status === 'CANCELLED'}
          >
            <FileX2 className="h-4 w-4 text-orange-600" />
            <span className="sr-only">Cancel {po.id}</span>
          </Button>
        )}
        
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete PO"
            onClick={() => openConfirmationDialog("delete")}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete {po.id}</span>
          </Button>
        )}
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={() => setIsAlertOpen(false)}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMainAction}
              disabled={isPending}
              className={buttonVariants({ variant: alertAction === "delete" ? "destructive" : "outline" })}
            >
              {isPending ? "Processing..." : `Confirm ${alertAction === "delete" ? "Delete" : "Cancel"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
