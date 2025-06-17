
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, FileX2, MoreHorizontal, Trash2, CheckCircle, Send, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/types";
import { deletePurchaseOrderAction, updatePurchaseOrderStatusAction } from "@/app/(app)/purchase-orders/actions";

interface PurchaseOrderRowActionsProps {
  po: PurchaseOrder;
}

export function PurchaseOrderRowActions({ po }: PurchaseOrderRowActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [alertAction, setAlertAction] = React.useState<"cancel" | "delete" | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const canEdit = po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL';
  const canCancel = !['RECEIVED', 'CANCELLED'].includes(po.status);
  const canDelete = po.status === 'DRAFT' || po.status === 'CANCELLED';
  // Add more specific conditions for other actions later

  const handleAction = async () => {
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
        router.refresh(); // Re-fetch data on the current page
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

  const openAlertDialog = (actionType: "cancel" | "delete") => {
    setAlertAction(actionType);
    setIsAlertOpen(true);
  };
  
  const alertContent = {
    title: alertAction === "delete" ? "Delete Purchase Order?" : "Cancel Purchase Order?",
    description: alertAction === "delete" 
      ? `Are you sure you want to permanently delete PO ${po.id}? This action cannot be undone.`
      : `Are you sure you want to cancel PO ${po.id}? This may have implications if it's already been sent to the supplier.`
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/purchase-orders/${po.id}`}> {/* Detail page (to be created) */}
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Link>
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/purchase-orders/${po.id}/edit`}> {/* Edit page (to be created) */}
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
          )}
           {/* Placeholder for more actions based on status */}
          {po.status === 'PENDING_APPROVAL' && (
            <DropdownMenuItem disabled>
              <CheckCircle className="mr-2 h-4 w-4" /> Approve PO
            </DropdownMenuItem>
          )}
          {po.status === 'APPROVED' && (
            <DropdownMenuItem disabled>
              <Send className="mr-2 h-4 w-4" /> Mark as Ordered
            </DropdownMenuItem>
          )}
           {po.status === 'ORDERED' && (
            <DropdownMenuItem disabled>
              <Truck className="mr-2 h-4 w-4" /> Receive Stock
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          {canCancel && (
            <DropdownMenuItem onClick={() => openAlertDialog("cancel")} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50">
              <FileX2 className="mr-2 h-4 w-4" /> Cancel PO
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onClick={() => openAlertDialog("delete")} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" /> Delete PO
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
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
