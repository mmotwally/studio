
"use client";
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Edit, CheckCircle, XCircle, Settings2, PackageSearch, CalendarDays, FileTextIcon, UserCircle, Info, MoreVertical, Printer, FileX2, PackageCheck, PackageMinus, Briefcase, FileArchive, FileDigit, ShieldCheck } from 'lucide-react';
import { getRequisitionById, updateRequisitionStatusAction } from '../actions';
import type { Requisition, RequisitionStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { FulfillRequisitionDialog } from '@/components/requisitions/fulfill-requisition-dialog';
import { ApproveRequisitionItemsDialog } from '@/components/requisitions/approve-requisition-items-dialog';


interface RequisitionDetailPageProps {
  params: Promise<{ 
    requisitionId: string;
  }>;
}

function getStatusBadgeVariant(status: RequisitionStatus) {
  switch (status) {
    case 'PENDING_APPROVAL': return 'default'; 
    case 'APPROVED': return 'secondary'; 
    case 'REJECTED': return 'destructive'; 
    case 'FULFILLED': return 'default'; 
    case 'PARTIALLY_FULFILLED': return 'default'; 
    case 'CANCELLED': return 'outline'; 
    default: return 'default';
  }
}

function getStatusColorClass(status: RequisitionStatus): string {
  switch (status) {
    case 'PENDING_APPROVAL': return 'bg-yellow-500 hover:bg-yellow-500/90 text-yellow-foreground';
    case 'APPROVED': return 'bg-green-500 hover:bg-green-500/90 text-green-foreground';
    case 'REJECTED': return 'bg-red-500 hover:bg-red-500/90 text-red-foreground';
    case 'FULFILLED': return 'bg-blue-600 hover:bg-blue-600/90 text-blue-foreground';
    case 'PARTIALLY_FULFILLED': return 'bg-purple-500 hover:bg-purple-500/90 text-purple-foreground';
    case 'CANCELLED': return 'bg-gray-500 hover:bg-gray-500/90 text-gray-foreground';
    default: return 'bg-gray-400 hover:bg-gray-400/90 text-gray-foreground';
  }
}

export default function RequisitionDetailClientPage({ params: paramsPromise }: RequisitionDetailPageProps) {
  const params = React.use(paramsPromise); 
  const { requisitionId } = params;
  const [requisition, setRequisition] = React.useState<Requisition | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [isFulfillmentDialogOpen, setIsFulfillmentDialogOpen] = React.useState(false);
  const [isApproveItemsDialogOpen, setIsApproveItemsDialogOpen] = React.useState(false);

  const fetchRequisition = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRequisitionById(requisitionId);
      if (data) {
        setRequisition(data);
      } else {
        setError("Requisition not found.");
      }
    } catch (err) {
      console.error("Failed to fetch requisition:", err);
      setError((err as Error).message || "Failed to load requisition data.");
    } finally {
      setIsLoading(false);
    }
  }, [requisitionId]);

  React.useEffect(() => {
    if (requisitionId) { 
        fetchRequisition();
    }
  }, [requisitionId, fetchRequisition]);

  const handleStatusUpdate = async (newStatus: RequisitionStatus) => {
    if (!requisition) return;
    try {
      await updateRequisitionStatusAction(requisition.id, newStatus);
      toast({ title: "Status Updated", description: `Requisition status changed to ${newStatus.replace(/_/g, ' ').toLowerCase()}.` });
      fetchRequisition(); 
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <PageHeader title="Loading Requisition..." description="Please wait." />;
  }

  if (error) {
    return (
      <>
        <PageHeader title="Error" description={error} />
        <Button variant="outline" asChild>
          <Link href="/requisitions"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Requisitions</Link>
        </Button>
      </>
    );
  }

  if (!requisition) {
    return (
      <>
        <PageHeader title="Error" description="Requisition not found." />
        <Button variant="outline" asChild>
          <Link href="/requisitions"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Requisitions</Link>
        </Button>
      </>
    );
  }

  const canEdit = requisition.status === 'PENDING_APPROVAL' || 
                  requisition.status === 'APPROVED' || 
                  requisition.status === 'REJECTED' ||
                  requisition.status === 'PARTIALLY_FULFILLED' || 
                  requisition.status === 'FULFILLED';
                  
  const canCancel = requisition.status === 'PENDING_APPROVAL' || 
                    requisition.status === 'APPROVED' || 
                    requisition.status === 'PARTIALLY_FULFILLED' || 
                    requisition.status === 'FULFILLED';

  const canFulfill = (requisition.status === 'APPROVED' || requisition.status === 'PARTIALLY_FULFILLED') && 
                     requisition.items && requisition.items.some(item => item.isApproved && (item.quantityIssued || 0) < (item.quantityApproved ?? 0));
  
  const canManageApprovals = requisition.status === 'PENDING_APPROVAL';


  return (
    <>
      <PageHeader
        title={`Requisition: ${requisition.id}`}
        description="View details and manage the workflow for this requisition."
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/requisitions/${requisition.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Requisition
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
                {canCancel && (
                   <DropdownMenuItem onSelect={() => handleStatusUpdate('CANCELLED')} className="cursor-pointer">
                    <FileX2 className="mr-2 h-4 w-4" /> Cancel Requisition
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled>
                  <Printer className="mr-2 h-4 w-4" /> Print Requisition
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" asChild>
              <Link href="/requisitions"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Requisitions</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Requisition Items</CardTitle>
              <CardDescription>List of items requested in this requisition. Check approval status and quantities.</CardDescription>
            </CardHeader>
            <CardContent>
              {requisition.items && requisition.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty Requested</TableHead>
                      <TableHead className="text-right">Qty Approved</TableHead>
                      <TableHead className="text-right">Qty Issued</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisition.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.inventoryItemName || 'N/A'}</TableCell>
                        <TableCell className="text-right">{item.quantityRequested}</TableCell>
                        <TableCell className="text-right">{item.quantityApproved ?? '-'}</TableCell>
                        <TableCell className="text-right">{item.quantityIssued || 0}</TableCell>
                        <TableCell>
                          {item.quantityApproved === null || item.quantityApproved === undefined ? <Badge variant="outline">Pending</Badge> :
                           (item.quantityApproved > 0 ? <Badge className="bg-green-100 text-green-700">Approved</Badge> : <Badge variant="destructive">Rejected</Badge>)}
                        </TableCell>
                        <TableCell>{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No items found in this requisition.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Workflow Actions</CardTitle>
              <CardDescription>Manage the status and progression of this requisition.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {requisition.status === 'PENDING_APPROVAL' && (
                <>
                  <Button onClick={() => setIsApproveItemsDialogOpen(true)} variant="default">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Manage Item Approvals
                  </Button>
                  <Button onClick={() => handleStatusUpdate('REJECTED')} variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" /> Reject Entire Requisition
                  </Button>
                </>
              )}
              {requisition.status === 'APPROVED' && (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Approved</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>This requisition is approved and ready for fulfillment based on approved quantities.</span>
                        {canFulfill && (
                          <Button variant="default" size="sm" onClick={() => setIsFulfillmentDialogOpen(true)}>
                              <PackageSearch className="mr-2 h-4 w-4" /> Process Fulfillment
                          </Button>
                        )}
                    </AlertDescription>
                </Alert>
              )}
              {requisition.status === 'REJECTED' && (
                 <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Rejected</AlertTitle>
                    <AlertDescription>This requisition has been rejected.</AlertDescription>
                </Alert>
              )}
              {requisition.status === 'PARTIALLY_FULFILLED' && (
                 <Alert className="border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-700/20 dark:text-purple-300 dark:border-purple-600">
                    <PackageMinus className="h-4 w-4" />
                    <AlertTitle>Partially Fulfilled</AlertTitle>
                     <AlertDescription className="flex items-center justify-between">
                        <span>This requisition has been partially fulfilled.</span>
                         {canFulfill && (
                          <Button variant="default" size="sm" onClick={() => setIsFulfillmentDialogOpen(true)} className="bg-purple-500 hover:bg-purple-600 text-white">
                              <PackageSearch className="mr-2 h-4 w-4" /> Continue Fulfillment
                          </Button>
                        )}
                    </AlertDescription>
                </Alert>
              )}
               {requisition.status === 'FULFILLED' && (
                 <Alert className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-700/20 dark:text-blue-300 dark:border-blue-600">
                    <PackageCheck className="h-4 w-4" />
                    <AlertTitle>Fulfilled</AlertTitle>
                    <AlertDescription>This requisition has been completely fulfilled.</AlertDescription>
                </Alert>
              )}
              {requisition.status === 'CANCELLED' && (
                 <Alert variant="default" className="border-gray-500 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                    <FileX2 className="h-4 w-4" />
                    <AlertTitle>Cancelled</AlertTitle>
                    <AlertDescription>This requisition has been cancelled.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Requisition ID:</span>
                <span className="font-mono text-sm">{requisition.id}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge 
                  variant={getStatusBadgeVariant(requisition.status)} 
                  className={`capitalize ${getStatusColorClass(requisition.status)}`}
                >
                  {requisition.status.replace(/_/g, ' ').toLowerCase()}
                </Badge>
              </div>
              <Separator />
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground flex items-center"><Briefcase className="mr-1.5 h-4 w-4 text-muted-foreground" /> Department:</span>
                 <span className="text-sm">{requisition.departmentName || 'N/A'}</span>
               </div>
               <Separator />
                <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground flex items-center"><FileArchive className="mr-1.5 h-4 w-4 text-muted-foreground" /> Order #:</span>
                 <span className="text-sm">{requisition.orderNumber || 'N/A'}</span>
               </div>
               <Separator />
                <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground flex items-center"><FileDigit className="mr-1.5 h-4 w-4 text-muted-foreground" /> BOM #:</span>
                 <span className="text-sm">{requisition.bomNumber || 'N/A'}</span>
               </div>
               <Separator />
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground flex items-center"><UserCircle className="mr-1.5 h-4 w-4 text-muted-foreground" /> Requester:</span>
                 <span className="text-sm">{requisition.requesterName || 'System (N/A)'}</span>
               </div>
               <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" /> Date Created:</span>
                <span className="text-sm">{format(new Date(requisition.dateCreated), "PPp")}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" /> Date Needed:</span>
                <span className="text-sm">{requisition.dateNeeded ? format(new Date(requisition.dateNeeded), "PP") : 'N/A'}</span>
              </div>
              {requisition.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center mb-1"><FileTextIcon className="mr-1.5 h-4 w-4 text-muted-foreground" /> Notes:</span>
                    <p className="text-sm bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{requisition.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
             <CardFooter className="text-xs text-muted-foreground">
                Last updated: {format(new Date(requisition.lastUpdated), "PPp")}
            </CardFooter>
          </Card>
        </div>
      </div>
      {isFulfillmentDialogOpen && requisition && (
         <Dialog open={isFulfillmentDialogOpen} onOpenChange={setIsFulfillmentDialogOpen}>
            <FulfillRequisitionDialog
                requisition={requisition}
                setOpen={setIsFulfillmentDialogOpen}
                onFulfillmentProcessed={fetchRequisition} 
            />
         </Dialog>
      )}
      {isApproveItemsDialogOpen && requisition && (
          <Dialog open={isApproveItemsDialogOpen} onOpenChange={setIsApproveItemsDialogOpen}>
              <ApproveRequisitionItemsDialog
                  requisition={requisition}
                  setOpen={setIsApproveItemsDialogOpen}
                  onApprovalProcessed={fetchRequisition}
              />
          </Dialog>
      )}
    </>
  );
}

