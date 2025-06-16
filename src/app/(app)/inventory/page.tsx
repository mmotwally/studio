
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { InventoryItem } from '@/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { openDb } from '@/lib/database';

async function getInventoryItems(): Promise<InventoryItem[]> {
  const db = await openDb();
  // The 'lowStock' column in the DB is INTEGER (0 or 1).
  // The 'totalValue' is not stored in DB, it's derived.
  const rawItems = await db.all('SELECT id, name, category, quantity, unitCost, location, supplier, lastUpdated, lowStock FROM inventory ORDER BY name ASC');
  await db.close();

  return rawItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalValue: item.quantity * item.unitCost,
    location: item.location,
    supplier: item.supplier,
    lastUpdated: item.lastUpdated, // Store as ISO string, display as is for now
    lowStock: Boolean(item.lowStock), // Convert 0/1 to false/true
  }));
}

export default async function InventoryPage() {
  const inventoryItems = await getInventoryItems();

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Manage your stock items and supplies."
        actions={
          <Button asChild>
            <Link href="/inventory/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Link>
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
            {inventoryItems.map((item) => (
              <TableRow key={item.id} className={item.lowStock ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>
                  {item.name}
                  {item.lowStock && <Badge variant="destructive" className="ml-2">Low Stock</Badge>}
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                <TableCell className="text-right">${item.totalValue.toFixed(2)}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.supplier}</TableCell>
                <TableCell>{new Date(item.lastUpdated).toLocaleDateString()}</TableCell>
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
      {inventoryItems.length === 0 && (
        <div className="mt-4 text-center text-muted-foreground">
          No inventory items found. Add new items to get started.
        </div>
      )}
    </>
  );
}
