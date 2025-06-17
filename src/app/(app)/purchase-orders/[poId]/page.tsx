
"use client";
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; 
import { ArrowLeft, Edit, MoreVertical, Printer, FileX2, ShoppingCart, Truck, UserCircle, CalendarDays, FileTextIcon, Sigma, Banknote, Tag, CheckCircle, Send } from 'lucide-react';
import { getPurchaseOrderById, updatePurchaseOrderStatusAction } from '../actions'; 
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button'; // Import buttonVariants
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


interface PurchaseOrderDetailPageProps {
  params: Promise<{ 
    poId: string;
  }>;
}

function getStatusBadgeVariant(status: PurchaseOrderStatus) {
  switch (status) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 'default'; 
    case 'APPROVED':
    case 'ORDERED':
      return 'secondary'; 
    case 'PARTIALLY_RECEIVED':
      return 'default'; 
    case 'RECEIVED':
      return 'outline'; 
    case 'CANCELLED':
      return 'destructive'; 
    default:
      return 'default';
  }
}

function getStatusColorClass(status: PurchaseOrderStatus): string {
  switch (status) {
    case 'DRAFT': return 'bg-gray-400 hover:bg-gray-400/90';
    case 'PENDING_APPROVAL': return 'bg-yellow-500 hover:bg-yellow-500/90';
    case 'APPROVED': return 'bg-blue-500 hover:bg-blue-500/90';
    case 'ORDERED': return 'bg-sky-500 hover:bg-sky-500/90';
    case 'PARTIALLY_RECEIVED': return 'bg-purple-500 hover:bg-purple-500/90';
    case 'RECEIVED': return 'bg-green-600 hover:bg-green-600/90';
    case 'CANCELLED': return 'bg-red-500 hover:bg-red-500/90';
    default: return 'bg-gray-400 hover:bg-gray-400/90';
  }
}

export default function PurchaseOrderDetailPage({ params: paramsPromise }: PurchaseOrderDetailPageProps) {
  const params = React.use(paramsPromise);
  const { poId } = params;
  const [purchaseOrder, setPurchaseOrder] = React.useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState(false);

   React.useEffect(() => {
    let toastShown = false;
    if (searchParams.get('updated') === 'true') {
      toast({ title: "Success", description: "Purchase Order updated successfully." });
      toastShown = true;
    } else if (searchParams.get('created') === 'true') {
      toast({ title: "Success", description: "Purchase Order created successfully." });
      toastShown = true;
    }

    if (toastShown) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('updated');
      newSearchParams.delete('created');
      router.replace(`/purchase-orders/${poId}?${newSearchParams.toString()}`, { scroll: false });
    }
  }, [searchParams, poId, router, toast]);


  const fetchPurchaseOrder = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPurchaseOrderById(poId);
      if (data) {
        setPurchaseOrder(data);
      } else {
        setError("Purchase Order not found.");
      }
    } catch (err) {
      console.error("Failed to fetch purchase order:", err);
      setError((err as Error).message || "Failed to load purchase order data.");
    } finally {
      setIsLoading(false);
    }
  }, [poId]);

  React.useEffect(() => {
    if (poId) { 
        fetchPurchaseOrder();
    }
  }, [poId, fetchPurchaseOrder]);

  const handleStatusUpdate = async (newStatus: PurchaseOrderStatus) => {
    if (!purchaseOrder) return;
    startTransition(async () => {
        try {
        await updatePurchaseOrderStatusAction(purchaseOrder.id, newStatus);
        toast({ title: "Status Updated", description: `PO status changed to ${newStatus.replace(/_/g, ' ').toLowerCase()}.` });
        fetchPurchaseOrder(); 
        } catch (err) {
        toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        }
    });
  };
  
  const handleConfirmCancel = () => {
    setIsCancelAlertOpen(false);
    handleStatusUpdate('CANCELLED');
  };


  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading Purchase Order..." description="Please wait." />
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
                <Card className="shadow-lg">
                    <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                    <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                </Card>
                 <Card className="shadow-lg">
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-16 w-full" /></CardContent>
                </Card>
            </div>
            <div className="md:col-span-1">
                <Card className="shadow-lg">
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent className="space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                    </CardContent>
                </Card>
            </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Error" description={error} />
        <Button variant="outline" asChild>
          <Link href="/purchase-orders"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders</Link>
        </Button>
      </>
    );
  }

  if (!purchaseOrder) {
    return (
      <>
        <PageHeader title="Error" description="Purchase Order not found." />
        <Button variant="outline" asChild>
          <Link href="/purchase-orders"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders</Link>
        </Button>
      </>
    );
  }
  
  const canEdit = purchaseOrder.status === 'DRAFT' || purchaseOrder.status === 'PENDING_APPROVAL';
  const canCancel = !['RECEIVED', 'CANCELLED'].includes(purchaseOrder.status);

  return (
    <>
      <PageHeader
        title={`Purchase Order: ${purchaseOrder.id}`}
        description="View details and manage the workflow for this purchase order."
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/purchase-orders/${purchaseOrder.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit PO
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <Printer className="mr-2 h-4 w-4" /> Print PO
                </DropdownMenuItem>
                 {canCancel && (
                   <DropdownMenuItem onClick={() => setIsCancelAlertOpen(true)} className="text-orange-600 focus:text-orange-700 cursor-pointer">
                    <FileX2 className="mr-2 h-4 w-4" /> Cancel PO
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" asChild>
              <Link href="/purchase-orders"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Ordered Items</CardTitle>
              <CardDescription>List of items in this purchase order.</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty Ordered</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Qty Approved</TableHead>
                      <TableHead className="text-right">Qty Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.inventoryItemName || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{item.description || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantityOrdered}</TableCell>
                        <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${(item.quantityOrdered * item.unitCost).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.quantityApproved ?? '-'}</TableCell>
                        <TableCell className="text-right">{item.quantityReceived || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No items found in this purchase order.</p>
              )}
            </CardContent>
             {purchaseOrder.items && purchaseOrder.items.length > 0 && (
                <CardFooter className="justify-end font-semibold text-lg">
                    Total Order Value: ${(purchaseOrder.totalAmount || 0).toFixed(2)}
                </CardFooter>
            )}
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Workflow Actions</CardTitle>
                <CardDescription>Manage the status and progression of this PO.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                 {purchaseOrder.status === 'DRAFT' && (
                    <Button onClick={() => handleStatusUpdate('PENDING_APPROVAL')} disabled={isPending}>
                        <Send className="mr-2 h-4 w-4" /> Submit for Approval
                    </Button>
                 )}
                 {purchaseOrder.status === 'PENDING_APPROVAL' && (
                    <>
                        <Button onClick={() => handleStatusUpdate('APPROVED')} variant="default" disabled={isPending}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve PO
                        </Button>
                        <Button onClick={() => handleStatusUpdate('DRAFT')} variant="outline" disabled={isPending}>
                             Revert to Draft
                        </Button>
                    </>
                 )}
                  {purchaseOrder.status === 'APPROVED' && (
                    <Button onClick={() => handleStatusUpdate('ORDERED')} disabled={isPending}>
                        <Send className="mr-2 h-4 w-4" /> Mark as Ordered
                    </Button>
                 )}
                 {purchaseOrder.status === 'ORDERED' && ( // This will eventually open a "Receive Stock" dialog
                    <Button onClick={() => router.push(`/purchase-orders/${poId}/receive`)} disabled={isPending}> 
                        <Truck className="mr-2 h-4 w-4" /> Receive Stock
                    </Button>
                 )}
                 {purchaseOrder.status === 'RECEIVED' && (
                     <p className="text-green-600 font-semibold">This PO has been fully received.</p>
                 )}
                 {purchaseOrder.status === 'CANCELLED' && (
                     <p className="text-red-600 font-semibold">This PO has been cancelled.</p>
                 )}
            </CardContent>
          </Card>

        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>PO Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">PO ID:</span>
                <span className="font-mono text-sm">{purchaseOrder.id}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge 
                  variant={getStatusBadgeVariant(purchaseOrder.status)} 
                  className={`capitalize text-white ${getStatusColorClass(purchaseOrder.status)}`}
                >
                  {purchaseOrder.status.replace(/_/g, ' ').toLowerCase()}
                </Badge>
              </div>
              <Separator />
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground flex items-center"><Truck className="mr-1.5 h-4 w-4 text-muted-foreground" /> Supplier:</span>
                 <span className="text-sm">{purchaseOrder.supplierName || 'N/A'}</span>
               </div>
               <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" /> Order Date:</span>
                <span className="text-sm">{format(new Date(purchaseOrder.orderDate), "PP")}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" /> Expected Delivery:</span>
                <span className="text-sm">{purchaseOrder.expectedDeliveryDate ? format(new Date(purchaseOrder.expectedDeliveryDate), "PP") : 'N/A'}</span>
              </div>
               {purchaseOrder.createdByName && (
                <>
                <Separator />
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center"><UserCircle className="mr-1.5 h-4 w-4 text-muted-foreground" /> Created By:</span>
                    <span className="text-sm">{purchaseOrder.createdByName}</span>
                </div>
                </>
              )}
              {purchaseOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center mb-1"><FileTextIcon className="mr-1.5 h-4 w-4 text-muted-foreground" /> Notes:</span>
                    <p className="text-sm bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{purchaseOrder.notes}</p>
                  </div>
                </>
              )}
               {purchaseOrder.shippingAddress && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center mb-1"><Sigma className="mr-1.5 h-4 w-4 text-muted-foreground" /> Shipping Address:</span>
                    <p className="text-sm bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{purchaseOrder.shippingAddress}</p>
                  </div>
                </>
              )}
               {purchaseOrder.billingAddress && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center mb-1"><Banknote className="mr-1.5 h-4 w-4 text-muted-foreground" /> Billing Address:</span>
                    <p className="text-sm bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{purchaseOrder.billingAddress}</p>
                  </div>
                </>
              )}
            </CardContent>
             <CardFooter className="text-xs text-muted-foreground">
                Last updated: {format(new Date(purchaseOrder.lastUpdated), "PPp")}
            </CardFooter>
          </Card>
        </div>
      </div>
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel PO {purchaseOrder?.id}? This may have implications if it has already been processed by the supplier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={() => setIsCancelAlertOpen(false)}>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isPending}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isPending ? "Cancelling..." : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

