
"use client";

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { InventoryItem } from '@/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, FolderPlus, ListTree, Warehouse, Users, Boxes, FileUp, FileDown, ListPlus, Activity } from 'lucide-react';
import { AddCategoryDialog } from '@/components/settings/add-category-dialog';
import { AddUnitDialog } from '@/components/settings/add-unit-dialog';
import { AddLocationDialog } from '@/components/settings/add-location-dialog';
import { AddSupplierDialog } from '@/components/settings/add-supplier-dialog';
import { AddSubCategoryDialog } from '@/components/settings/add-sub-category-dialog';
import { getInventoryItems, exportInventoryToExcelAction, deleteInventoryItemAction } from './actions';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { ImportExcelDialog } from '@/components/inventory/import-excel-dialog';
import { StockMovementDialog } from '@/components/inventory/stock-movement-dialog';


export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = React.useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = React.useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = React.useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = React.useState(false);
  const [isImportExcelDialogOpen, setIsImportExcelDialogOpen] = React.useState(false);
  const [isStockMovementDialogOpen, setIsStockMovementDialogOpen] = React.useState(false);

  const [itemToDelete, setItemToDelete] = React.useState<InventoryItem | null>(null);


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

  const handleExport = async () => {
    try {
      const itemsToExport = await exportInventoryToExcelAction();
      if (itemsToExport && itemsToExport.length > 0) {
        const exportData = itemsToExport.map(item => ({
            'Item ID': item.id,
            'Name': item.name,
            'Description': item.description,
            'Quantity': item.quantity,
            'UnitCost': item.unitCost,
            'MinStockLevel': item.minStockLevel,
            'MaxStockLevel': item.maxStockLevel,
            'CategoryCode': item.categoryCode,
            'SubCategoryCode': item.subCategoryCode,
            'LocationStore': item.locationName ? item.locationName.split(' - ')[0] : "",
            'LocationRack': item.locationName && item.locationName.includes(' - ') && item.locationName.split(' - ').length > 1 ? item.locationName.split(' - ')[1] : "",
            'LocationShelf': item.locationName && item.locationName.includes(' - ') && item.locationName.split(' - ').length > 2 ? item.locationName.split(' - ')[2] : "",
            'SupplierName': item.supplierName,
            'UnitName': item.unitName,
            'ImageURL': item.imageUrl,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, "inventory_export.xlsx");
        
        toast({
          title: "Export Successful",
          description: "Inventory data has been exported to Excel.",
        });
      } else {
        toast({
          title: "Export Canceled",
          description: "No inventory items to export.",
          variant: "default",
        });
      }
    } catch (e) {
      console.error("Export failed:", e);
      toast({
        title: "Export Failed",
        description: (e instanceof Error ? e.message : String(e)) || "Could not export inventory.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      const result = await deleteInventoryItemAction(itemToDelete.id);
      if (result.success) {
        toast({
          title: "Item Deleted",
          description: `Item "${itemToDelete.name}" has been successfully deleted.`,
        });
        fetchItems(); // Refresh the list
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({
        title: "Deletion Failed",
        description: (error instanceof Error ? error.message : String(error)) || "Could not delete item.",
        variant: "destructive",
      });
    } finally {
      setItemToDelete(null); // Close dialog by resetting the item to delete
    }
  };


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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsStockMovementDialogOpen(true)}>
              <Activity className="mr-2 h-4 w-4" /> Stock Movement
            </Button>
            <Dialog open={isImportExcelDialogOpen} onOpenChange={setIsImportExcelDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="mr-2 h-4 w-4" /> Import from Excel
                </Button>
              </DialogTrigger>
              <ImportExcelDialog setOpen={setIsImportExcelDialogOpen} onImportCompleted={fetchItems} />
            </Dialog>

            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" /> Export to Excel
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ListPlus className="mr-2 h-4 w-4" /> Add Related Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsCategoryDialogOpen(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" /> Add Category
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsSubCategoryDialogOpen(true)}>
                  <ListTree className="mr-2 h-4 w-4" /> Add Sub-Category
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsUnitDialogOpen(true)}>
                  <Boxes className="mr-2 h-4 w-4" /> Add Unit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsLocationDialogOpen(true)}>
                  <Warehouse className="mr-2 h-4 w-4" /> Add Location
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsSupplierDialogOpen(true)}>
                  <Users className="mr-2 h-4 w-4" /> Add Supplier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead className="w-[100px]">Item ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sub-Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryItems.map((item) => (
              <TableRow key={item.id} className={item.lowStock ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                <TableCell>
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl.startsWith('/') ? item.imageUrl : `https://placehold.co/40x40.png?text=IMG`}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                      data-ai-hint="product item"
                      unoptimized={item.imageUrl.startsWith('http')}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No Img
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[100px]">{item.id}</TableCell>
                <TableCell>
                  {item.name}
                  {item.lowStock && <Badge variant="destructive" className="ml-2">Low Stock</Badge>}
                </TableCell>
                <TableCell>{item.categoryName || '-'}</TableCell>
                <TableCell>{item.subCategoryName || '-'}</TableCell>
                <TableCell>{item.locationName || '-'}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
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
                      <DropdownMenuItem asChild>
                        <Link href={`/inventory/${item.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={(e) => {
                          e.preventDefault(); 
                          setItemToDelete(item);
                        }}
                      >
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

      {/* Dialog definitions */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <AddCategoryDialog setOpen={setIsCategoryDialogOpen} onCategoryAdded={fetchItems} />
      </Dialog>
      <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
        <AddSubCategoryDialog setOpen={setIsSubCategoryDialogOpen} onSubCategoryAdded={fetchItems} />
      </Dialog>
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <AddUnitDialog setOpen={setIsUnitDialogOpen} onUnitAdded={fetchItems} />
      </Dialog>
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <AddLocationDialog setOpen={setIsLocationDialogOpen} onLocationAdded={fetchItems} />
      </Dialog>
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <AddSupplierDialog setOpen={setIsSupplierDialogOpen} onSupplierAdded={fetchItems} />
      </Dialog>
      <Dialog open={isStockMovementDialogOpen} onOpenChange={setIsStockMovementDialogOpen}>
        <StockMovementDialog 
            setOpen={setIsStockMovementDialogOpen} 
            inventoryItems={inventoryItems.map(item => ({value: item.id, label: `${item.name} (${item.id})`}))} 
        />
      </Dialog>


      {/* Delete confirmation dialog */}
      {itemToDelete && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the item
                <span className="font-semibold"> {itemToDelete.name} ({itemToDelete.id})</span> and remove its data from our servers.
                If the item has a locally uploaded image, it will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({variant: "destructive"})}>
                Delete Item
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

