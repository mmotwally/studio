
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, FileText, Briefcase, FileArchive, PackageSearch } from 'lucide-react';
import type { Requisition, RequisitionStatus } from '@/types';
import { getRequisitions } from './actions';
import { format } from 'date-fns';
import { RequisitionRowActions } from '@/components/requisitions/requisition-row-actions';


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

export default async function RequisitionsPage() {
  const requisitions = await getRequisitions();

  return (
    <>
      <PageHeader
        title="Requisitions"
        description="Manage item requests and approval workflows."
        actions={
          <Button asChild>
            <Link href="/requisitions/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Requisition
            </Link>
          </Button>
        }
      />
      
      {requisitions.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border bg-muted/20 rounded-lg shadow-sm">
            <PackageSearch size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">No requisitions found.</p>
            <p className="text-sm text-muted-foreground mb-4">Get started by creating a new requisition.</p>
            <Button asChild variant="outline">
                <Link href="/requisitions/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Requisition
                </Link>
            </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Requisition ID</TableHead>
                <TableHead className="w-[120px]">Department</TableHead>
                <TableHead className="w-[120px]">Order #</TableHead>
                <TableHead className="w-[120px]">BOM #</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Date Needed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.id}</TableCell>
                  <TableCell>
                    {req.departmentName ? (
                        <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> 
                            <span className="truncate max-w-[100px]">{req.departmentName}</span>
                        </div>
                    ): '-'}
                  </TableCell>
                  <TableCell>{req.orderNumber || '-'}</TableCell>
                  <TableCell>{req.bomNumber || '-'}</TableCell>
                  <TableCell>{format(new Date(req.dateCreated), "PP")}</TableCell>
                  <TableCell>{req.dateNeeded ? format(new Date(req.dateNeeded), "PP") : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(req.status)} 
                      className={`capitalize text-white ${getStatusColorClass(req.status)}`}
                    >
                      {req.status.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{req.totalItems || 0}</TableCell>
                  <TableCell className="text-right">
                    <RequisitionRowActions requisition={req} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
