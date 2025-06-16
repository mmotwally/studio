
"use client";
import * as React from 'react';
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
import { PlusCircle, MoreHorizontal, Eye } from 'lucide-react';
import type { Requisition, RequisitionStatus } from '@/types';
// import { getRequisitions } from './actions'; // We'll create this action later
import { useToast } from "@/hooks/use-toast";

// Mock data for now - replace with API call
const mockRequisitions: Requisition[] = [
  // { 
  //   id: 'REQ-202301-001', dateCreated: new Date().toISOString(), status: 'PENDING_APPROVAL', totalItems: 3, 
  //   requesterName: 'Alice', lastUpdated: new Date().toISOString() 
  // },
  // { 
  //   id: 'REQ-202301-002', dateCreated: new Date(Date.now() - 86400000).toISOString(), status: 'APPROVED', totalItems: 1, 
  //   requesterName: 'Bob', lastUpdated: new Date(Date.now() - 86400000).toISOString()
  // },
];


export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = React.useState<Requisition[]>(mockRequisitions);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // TODO: Implement fetchRequisitions function using server action
  // React.useEffect(() => {
  //   async function fetchRequisitions() {
  //     setIsLoading(true);
  //     try {
  //       // const fetchedRequisitions = await getRequisitions();
  //       // setRequisitions(fetchedRequisitions);
  //       setError(null);
  //     } catch (e) {
  //       console.error("Failed to fetch requisitions:", e);
  //       setError("Could not load requisitions.");
  //       setRequisitions([]);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //   fetchRequisitions();
  // }, [toast]);


  React.useEffect(() => {
    // Simulate loading for now
    setTimeout(() => {
      setIsLoading(false);
      if (mockRequisitions.length === 0) {
        // setError("No requisitions found. Create one to get started.");
      }
    }, 500);
  }, []);


  const getStatusBadgeVariant = (status: RequisitionStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL': return 'default'; // bg-primary
      case 'APPROVED': return 'secondary'; // bg-secondary, consider a green-like custom variant
      case 'REJECTED': return 'destructive';
      case 'FULFILLED': return 'outline'; // Consider a blue-like custom variant
      case 'PARTIALLY_FULFILLED': return 'default'; // bg-primary with different text maybe
      case 'CANCELLED': return 'outline';
      default: return 'default';
    }
  };

  const getStatusColor = (status: RequisitionStatus): string => {
    switch (status) {
      case 'PENDING_APPROVAL': return 'bg-yellow-500';
      case 'APPROVED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      case 'FULFILLED': return 'bg-blue-500';
      case 'PARTIALLY_FULFILLED': return 'bg-purple-500';
      case 'CANCELLED': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Requisitions" description="Manage item requests and approval workflows." />
        <div className="mt-4 text-center">Loading requisitions...</div>
      </>
    );
  }

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
      {error && <div className="mb-4 text-center text-destructive">{error}</div>}
      
      {requisitions.length === 0 && !isLoading && !error ? (
         <div className="flex flex-col items-center justify-center h-64  border-2 border-dashed border-border bg-muted/20 rounded-lg">
            <p className="text-lg text-muted-foreground mb-2">No requisitions found.</p>
            <p className="text-sm text-muted-foreground mb-4">Get started by creating a new requisition.</p>
            <Button asChild>
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
                <TableHead className="w-[150px]">Requisition ID</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="text-right">Total Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.id}</TableCell>
                  <TableCell>{new Date(req.dateCreated).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(req.status)} className={`capitalize ${getStatusColor(req.status)} text-white`}>
                      {req.status.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{req.requesterName || 'N/A'}</TableCell>
                  <TableCell className="text-right">{req.totalItems || req.items?.length || 0}</TableCell>
                  <TableCell className="text-right">
                    {/* Placeholder for actions dropdown */}
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/requisitions/${req.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Link>
                    </Button>
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
