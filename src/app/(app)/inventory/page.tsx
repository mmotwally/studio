
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
import { AddCategoryDialog } from '@/components/settings/add-category-dialog';
import { AddUnitDialog } from '@/components/settings/add-unit-dialog';
import { AddLocationDialog } from '@/components/settings/add-location-dialog';
import { AddSupplierDialog } from '@/components/settings/add-supplier-dialog';
import { getInventoryItems } from './actions';

// Import other dialogs as they are created
// import { AddSubCategoryDialog } from '@/components/settings/add-sub-category-dialog';


export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = React.useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = React.useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = React.useState(false);
  // const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = React.useState(false);


  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getInventoryItems();
      setInventoryItems(items);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch inventory items:", e);
      let errorMessage = "Error loading inventory data.";
      if (e instanceof Error && e.message) {
         errorMessage += ` ${e.message}`;
      }
      setError(errorMessage);
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

            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Boxes className="mr-2 h-4 w-4" /> Add Unit
                </Button>
              </DialogTrigger>
              <AddUnitDialog setOpen={setIsUnitDialogOpen} onUnitAdded={fetchItems} />
            </Dialog>

             <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Warehouse className="mr-2 h-4 w-4" /> Add Location
                </Button>
              </DialogTrigger>
              <AddLocationDialog setOpen={setIsLocationDialogOpen} onLocationAdded={fetchItems} />
            </Dialog>

             <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
              </DialogTrigger>
              <AddSupplierDialog setOpen={setIsSupplierDialogOpen} onSupplierAdded={fetchItems} />
            </Dialog>

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
    