
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit, CheckCircle, XCircle, Settings2, PackageSearch, CalendarDays, FileTextIcon, UserCircle } from 'lucide-react';
import { getRequisitionById } from '../actions';
import type { Requisition, RequisitionStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface RequisitionDetailPageProps {
  params: {
    requisitionId: string;
  };
}

function getStatusBadgeVariant(status: RequisitionStatus) {
  switch (status) {
    case 'PENDING_APPROVAL': return 'default';
    case 'APPROVED': return 'secondary';
    case 'REJECTED': return 'destructive';
    case 'FULFILLED': return 'outline'; 
    case 'PARTIALLY_FULFILLED': return 'default'; 
    case 'CANCELLED': return 'outline';
    default: return 'default';
  }
}

function getStatusColorClass(status: RequisitionStatus): string {
  switch (status) {
    case 'PENDING_APPROVAL': return 'bg-yellow-500 hover:bg-yellow-500/90';
    case 'APPROVED': return 'bg-green-500 hover:bg-green-500/90';
    case 'REJECTED': return 'bg-red-500 hover:bg-red-500/90';
    case 'FULFILLED': return 'bg-blue-500 hover:bg-blue-500/90';
    case 'PARTIALLY_FULFILLED': return 'bg-purple-500 hover:bg-purple-500/90';
    case 'CANCELLED': return 'bg-gray-500 hover:bg-gray-500/90';
    default: return 'bg-gray-400 hover:bg-gray-400/90';
  }
}

export default async function RequisitionDetailPage({ params }: RequisitionDetailPageProps) {
  const { requisitionId } = params;
  const requisition = await getRequisitionById(requisitionId);

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

  return (
    <>
      <PageHeader
        title={`Requisition: ${requisition.id}`}
        description="View details and manage the workflow for this requisition."
        actions={
          <Button variant="outline" asChild>
            <Link href="/requisitions"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Requisitions</Link>
          </Button>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Requisition Items</CardTitle>
              <CardDescription>List of items requested in this requisition.</CardDescription>
            </CardHeader>
            <CardContent>
              {requisition.items && requisition.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty Requested</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisition.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.inventoryItemName || 'N/A'}</TableCell>
                        <TableCell className="text-right">{item.quantityRequested}</TableCell>
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
              {/* Placeholder buttons for workflow actions */}
              {requisition.status === 'PENDING_APPROVAL' && (
                <>
                  <Button variant="default"><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button>
                  <Button variant="destructive"><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
                </>
              )}
              {requisition.status === 'APPROVED' && (
                <Button variant="default"><PackageSearch className="mr-2 h-4 w-4" /> Process Fulfillment</Button>
              )}
              {/* Add more conditional buttons based on status */}
              <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Requisition</Button>
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> More Actions</Button>
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
                  className={`capitalize text-white ${getStatusColorClass(requisition.status)}`}
                >
                  {requisition.status.replace(/_/g, ' ').toLowerCase()}
                </Badge>
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
    </>
  );
}
