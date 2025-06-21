"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Search, FileDown, FileUp, History, Package, Filter, Loader2 } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { deleteInventoryItemAction, exportInventoryToExcelAction } from './actions';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ImportExcelDialog } from '@/components/inventory/import-excel-dialog';
import { StockMovementDialog } from '@/components/inventory/stock-movement-dialog';
import { getInventoryItemsForSelect } from '@/app/(app)/requisitions/actions';
import type { SelectItem } from '@/types';

interface InventoryClientProps {
  initialItems: InventoryItem[];
}

export function InventoryClient({ initialItems }: InventoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [items, setItems] = React.useState<InventoryItem[]>(initialItems);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isStockMovementDialogOpen, setIsStockMovementDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [inventoryItemsForSelect, setInventoryItemsForSelect] = React.useState<SelectItem[]>([]);
  const [isLoadingSelectItems, setIsLoadingSelectItems] = React.useState(false);

  // Filter items based on search term
  const filteredItems = React.useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(item => 
      item.id.toLowerCase().includes(lowerSearchTerm) ||
      item.name.toLowerCase().includes(lowerSearchTerm) ||
      (item.description && item.description.toLowerCase().includes(lowerSearchTerm)) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(lowerSearchTerm)) ||
      (item.subCategoryName && item.subCategoryName.toLowerCase().includes(lowerSearchTerm)) ||
      (item.locationName && item.locationName.toLowerCase().includes(lowerSearchTerm)) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(lowerSearchTerm))
    );
  }, [items, searchTerm]);

  React.useEffect(() => {
    // Check for success message in URL
    const successMessage = searchParams.get('success');
    if (successMessage) {
      toast({
        title: "Success",
        description: decodeURIComponent(successMessage),
      });
      
      // Remove the success parameter from the URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete('success');
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    }
  }, [searchParams, pathname, router, toast]);

  const handleDeleteItem = async (itemId: string) => {
    if (confirm(`Are you sure you want to delete item ${itemId}? This action cannot be undone.`)) {
      setIsDeleting(itemId);
      try {
        const result = await deleteInventoryItemAction(itemId);
        if (result.success) {
          setItems(prevItems => prevItems.filter(item => item.id !== itemId));
          toast({
            title: "Item Deleted",
            description: result.message,
          });
        } else {
          toast({
            title: "Deletion Failed",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to delete item:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while deleting the item.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleExportToExcel = async () => {
    setIsExporting(true);
    try {
      const data = await exportInventoryToExcelAction();
      
      // Convert data to Excel format
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Inventory_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Exported ${data.length} inventory items to Excel.`,
      });
    } catch (error) {
      console.error("Failed to export inventory:", error);
      toast({
        title: "Export Failed",
        description: "Could not export inventory data to Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportComplete = () => {
    // Refresh the page to show updated inventory
    router.refresh();
  };

  const handleOpenStockMovementDialog = async () => {
    setIsLoadingSelectItems(true);
    try {
      const items = await getInventoryItemsForSelect();
      setInventoryItemsForSelect(items);
      setIsStockMovementDialogOpen(true);
    } catch (error) {
      console.error("Failed to load inventory items for select:", error);
      toast({
        title: "Error",
        description: "Could not load inventory items for stock movement report.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSelectItems(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Manage your inventory items, track stock levels, and monitor usage."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/inventory/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Link>
            </Button>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="mr-2 h-4 w-4" /> Import
                </Button>
              </DialogTrigger>
              <ImportExcelDialog setOpen={setIsImportDialogOpen} onImportCompleted={handleImportComplete} />
            </Dialog>
            <Button variant="outline" onClick={handleExportToExcel} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            <Dialog open={isStockMovementDialogOpen} onOpenChange={setIsStockMovementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleOpenStockMovementDialog} disabled={isLoadingSelectItems}>
                  {isLoadingSelectItems ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                  {isLoadingSelectItems ? "Loading..." : "Stock Movement"}
                </Button>
              </DialogTrigger>
              <StockMovementDialog setOpen={setIsStockMovementDialogOpen} inventoryItems={inventoryItemsForSelect} />
            </Dialog>
          </div>
        }
      />
      
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search inventory by ID, name, category, or location..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" title="Filter" disabled>
          <Filter className="h-4 w-4" />
          <span className="sr-only">Filter</span>
        </Button>
      </div>
      
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border bg-muted/20 rounded-lg shadow-sm">
          <Package size={48} className="text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground mb-2">
            {items.length === 0 ? "No inventory items found." : "No items match your search."}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {items.length === 0 ? "Get started by adding your first inventory item." : "Try adjusting your search term."}
          </p>
          {items.length === 0 && (
            <Button asChild>
              <Link href="/inventory/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Item ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.categoryName || 'N/A'}{item.subCategoryName ? ` / ${item.subCategoryName}` : ''}</TableCell>
                  <TableCell className="text-right">{item.quantity} {item.unitName || ''}</TableCell>
                  <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.totalValue.toFixed(2)}</TableCell>
                  <TableCell>{item.locationName || 'N/A'}</TableCell>
                  <TableCell>
                    {item.lowStock ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge variant="outline">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/inventory/${item.id}/edit`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                            <path d="m15 5 4 4"></path>
                          </svg>
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDeleting === item.id}
                      >
                        {isDeleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        )}
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
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