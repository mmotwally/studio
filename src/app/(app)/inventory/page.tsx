
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { InventoryItem } from '@/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

const sampleInventory: InventoryItem[] = [
  { id: 'ITM001', name: 'Blue Widget', category: 'Widgets', quantity: 150, unitCost: 10.50, totalValue: 1575, location: 'Warehouse A', supplier: 'Supplier X', lastUpdated: '2023-10-26', lowStock: false },
  { id: 'ITM002', name: 'Red Gadget', category: 'Gadgets', quantity: 25, unitCost: 25.00, totalValue: 625, location: 'Shelf B-2', supplier: 'Supplier Y', lastUpdated: '2023-10-25', lowStock: true },
  { id: 'ITM003', name: 'Green Gizmo', category: 'Gizmos', quantity: 300, unitCost: 5.75, totalValue: 1725, location: 'Warehouse B', supplier: 'Supplier Z', lastUpdated: '2023-10-27' },
  { id: 'ITM004', name: 'Yellow Thingamajig', category: 'Thingamajigs', quantity: 75, unitCost: 12.00, totalValue: 900, location: 'Bin C-5', supplier: 'Supplier X', lastUpdated: '2023-10-20', lowStock: false },
];

export default function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Manage your stock items and supplies."
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
          </Button>
        }
      />
      <div className="overflow-hidden rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleInventory.map((item) => (
              <TableRow key={item.id} className={item.lowStock ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.name} {item.lowStock && <Badge variant="destructive" className="ml-2">Low Stock</Badge>}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                <TableCell className="text-right">${item.totalValue.toFixed(2)}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.supplier}</TableCell>
                <TableCell>{item.lastUpdated}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {sampleInventory.length === 0 && (
        <div className="mt-4 text-center text-muted-foreground">
          No inventory items found. Add new items to get started.
        </div>
      )}
    </>
  );
}
