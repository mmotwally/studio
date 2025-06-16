
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
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { InventoryItem } from '@/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, FolderPlus, ListTree, Warehouse, Users, Boxes } from 'lucide-react';
import { openDb } from '@/lib/database';
import { AddCategoryDialog } from '@/components/settings/add-category-dialog';
// Import other dialogs as they are created
// import { AddSubCategoryDialog } from '@/components/settings/add-sub-category-dialog';
// import { AddLocationDialog } from '@/components/settings/add-location-dialog';
// import { AddSupplierDialog } from '@/components/settings/add-supplier-dialog';
// import { AddUnitDialog } from '@/components/settings/add-unit-dialog';


async function getInventoryItems(): Promise<InventoryItem[]> {
  const db = await openDb();
  const rawItems = await db.all(`
    SELECT 
      i.id, i.name, i.quantity, i.unitCost, i.lastUpdated, i.lowStock,
      c.name as categoryName,
      sc.name as subCategoryName,
      l.store || COALESCE(' - ' || l.rack, '') || COALESCE(' - ' || l.shelf, '') as locationName,
      s.name as supplierName,
      uom.name as unitName
    FROM inventory i
    LEFT JOIN categories c ON i.categoryId = c.id
    LEFT JOIN sub_categories sc ON i.subCategoryId = sc.id
    LEFT JOIN locations l ON i.locationId = l.id
    LEFT JOIN suppliers s ON i.supplierId = s.id
    LEFT JOIN units_of_measurement uom ON i.unitId = uom.id
    ORDER BY i.name ASC
  `);

  return rawItems.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalValue: item.quantity * item.unitCost,
    lastUpdated: item.lastUpdated,
    lowStock: Boolean(item.lowStock),
    categoryName: item.categoryName,
    subCategoryName: item.subCategoryName,
    locationName: item.locationName,
    supplierName: item.supplierName,
    unitName: item.unitName,
  }));
}

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  // Add states for other dialogs
  // const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = React.useState(false);
  // const [isLocationDialogOpen, setIsLocationDialogOpen] = React.useState(false);
  // const [isSupplierDialogOpen, setIsSupplierDialogOpen] = React.useState(false);
  // const [isUnitDialogOpen, setIsUnitDialogOpen] = React.useState(false);


  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getInventoryItems();
      setInventoryItems(items);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch inventory items:", e);
      setError("Error loading inventory data. Please ensure the database is initialized correctly. Run 'npm run db:init' if this is the first setup.");
      setInventoryItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Inventory"
          description="Manage your stock items and supplies."
        />
        <div className="mt-4 text-center">Loading inventory...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Inventory"
          description="Manage your stock items and supplies."
        />
        <div className="mt-4 text-center text-destructive">{error}</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Manage your stock items and supplies."
        actions={
          <div className="flex flex-wrap gap-2">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <AddCategoryDialog setOpen={setIsCategoryDialogOpen} onCategoryAdded={fetchItems} />
            </Dialog>

            <Button asChild variant="outline">
              <Link href="#"> {/* Placeholder: Link to Add Sub-Category Dialog */}
                <ListTree className="mr-2 h-4 w-4" /> Add Sub-Category
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="#"> {/* Placeholder: Link to Add Unit of Measurement Dialog */}
                <Boxes className="mr-2 h-4 w-4" /> Add Unit
              </Link>
            </Button>
             <Button asChild variant="outline">
              <Link href="#"> {/* Placeholder: Link to Add Location Dialog */}
                <Warehouse className="mr-2 h-4 w-4" /> Add Location
              </Link>
            </Button>
             <Button asChild variant="outline">
              <Link href="#"> {/* Placeholder: Link to Add Supplier Dialog */}
                <Users className="mr-2 h-4 w-4" /> Add Supplier
              </Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
              </Link>
            </Button>
          </div>
        }
      />
      <div className="overflow-hidden rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sub-Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryItems.map((item) => (
              <TableRow key={item.id} className={item.lowStock ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                <TableCell className="font-medium truncate max-w-[100px]">{item.id}</TableCell>
                <TableCell>
                  {item.name}
                  {item.lowStock && <Badge variant="destructive" className="ml-2">Low Stock</Badge>}
                </TableCell>
                <TableCell>{item.categoryName || '-'}</TableCell>
                <TableCell>{item.subCategoryName || '-'}</TableCell>
                <TableCell>{item.locationName || '-'}</TableCell>
                <TableCell>{item.supplierName || '-'}</TableCell>
                <TableCell>{item.unitName || '-'}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                <TableCell className="text-right">${item.totalValue.toFixed(2)}</TableCell>
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
          No inventory items found. Add new items to get started. If you have run 'npm run db:init' and this persists, check console for errors.
        </div>
      )}
    </>
  );
}
