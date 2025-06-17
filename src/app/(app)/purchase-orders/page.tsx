
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
import { PlusCircle, ShoppingCart, FileText, PackageSearch } from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types';
import { getPurchaseOrders } from './actions';
import { format } from 'date-fns';
import { PurchaseOrderRowActions } from '@/components/purchase-orders/purchase-order-row-actions';

function getStatusBadgeVariant(status: PurchaseOrderStatus) {
  switch (status) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 'default'; // Yellowish/Orange
    case 'APPROVED':
    case 'ORDERED':
      return 'secondary'; // Blueish
    case 'PARTIALLY_RECEIVED':
      return 'default'; // Purplish
    case 'RECEIVED':
      return 'outline'; // Greenish
    case 'CANCELLED':
      return 'destructive'; // Reddish
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


export default async function PurchaseOrdersPage() {
  const purchaseOrders = await getPurchaseOrders();

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Create, track, and manage purchase orders with suppliers."
         actions={
          <Button asChild>
            <Link href="/purchase-orders/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Purchase Order
            </Link>
          </Button>
        }
      />
      
      {purchaseOrders.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border bg-muted/20 rounded-lg shadow-sm">
            <ShoppingCart size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">No purchase orders found.</p>
            <p className="text-sm text-muted-foreground mb-4">Get started by creating a new purchase order.</p>
            <Button asChild variant="outline">
                <Link href="/purchase-orders/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Purchase Order
                </Link>
            </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">PO ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs">{po.id}</TableCell>
                  <TableCell className="font-medium">{po.supplierName || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(po.orderDate), "PP")}</TableCell>
                  <TableCell>{po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), "PP") : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(po.status)} 
                      className={`capitalize text-white ${getStatusColorClass(po.status)}`}
                    >
                      {po.status.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{po.itemCount || 0}</TableCell>
                  <TableCell className="text-right">
                    ${(po.totalAmount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PurchaseOrderRowActions po={po} />
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
