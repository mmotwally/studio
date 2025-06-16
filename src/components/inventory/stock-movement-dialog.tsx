
"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/date-range-picker";
import { Label } from "@/components/ui/label";
import type { SelectItem as SelectItemType, InventoryItem } from "@/types"; // Assuming SelectItemType is defined for value/label
// import { getStockMovementDetails } from "@/app/(app)/inventory/actions"; // Placeholder for future action

interface StockMovementDialogProps {
  setOpen: (open: boolean) => void;
  inventoryItems: SelectItemType[]; // Pass pre-fetched items to avoid re-fetching in dialog
}

interface StockMovementReport {
  itemName: string;
  itemId: string;
  period: string;
  // movements: Array<{ date: string; type: string; quantity: number; balance: number; notes?: string }>; // Example structure
  openingStock: number;
  totalIn: number;
  totalOut: number;
  closingStock: number;
  message?: string; // For placeholder or errors
}

export function StockMovementDialog({ setOpen, inventoryItems }: StockMovementDialogProps) {
  const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportData, setReportData] = React.useState<StockMovementReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = React.useState(false);

  const handleGenerateReport = async () => {
    if (!selectedItemId || !dateRange?.from || !dateRange?.to) {
      // Basic validation, can be improved with toasts or inline messages
      setReportData({
          itemName: "", itemId: "", period: "",
          openingStock:0, totalIn: 0, totalOut: 0, closingStock: 0,
          message: "Please select an item and a valid date range."
      });
      return;
    }
    setIsLoadingReport(true);
    setReportData(null); // Clear previous report

    // --- Placeholder for actual data fetching ---
    // In a real scenario, you would call a server action here:
    // try {
    //   const data = await getStockMovementDetails(selectedItemId, dateRange.from, dateRange.to);
    //   setReportData(data); 
    // } catch (error) {
    //   setReportData({ message: "Error fetching report: " + (error as Error).message });
    // } finally {
    //   setIsLoadingReport(false);
    // }

    // For now, using placeholder data:
    const selectedItem = inventoryItems.find(item => item.value === selectedItemId);
    setTimeout(() => {
      setReportData({
        itemName: selectedItem?.label || "N/A",
        itemId: selectedItemId,
        period: `${dateRange.from?.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString()}`,
        openingStock: 0, // Placeholder
        totalIn: 0,      // Placeholder
        totalOut: 0,     // Placeholder
        closingStock: 0, // Placeholder
        message: "Stock movement tracking is not yet fully implemented. This is a placeholder report.",
      });
      setIsLoadingReport(false);
    }, 1000); // Simulate network delay
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Stock Movement Report</DialogTitle>
        <DialogDescription>
          Select an item and a period to view its stock movement details.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="item-select">Inventory Item</Label>
            <Select onValueChange={setSelectedItemId} value={selectedItemId}>
              <SelectTrigger id="item-select">
                <SelectValue placeholder="Select an item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-items" disabled>No items available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Period</Label>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
        </div>
        
        <Button onClick={handleGenerateReport} disabled={isLoadingReport || !selectedItemId || !dateRange?.from || !dateRange?.to} className="w-full md:w-auto">
          {isLoadingReport ? "Generating..." : "Generate Report"}
        </Button>

        {reportData && (
          <div className="mt-6 p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-semibold mb-2">
              Report for: {reportData.itemName} ({reportData.itemId})
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Period: {reportData.period}</p>
            
            {reportData.message ? (
              <p className="text-center py-4">{reportData.message}</p>
            ) : (
              <div className="space-y-2">
                <p><strong>Opening Stock:</strong> {reportData.openingStock}</p>
                <p><strong>Total In:</strong> {reportData.totalIn}</p>
                <p><strong>Total Out:</strong> {reportData.totalOut}</p>
                <p><strong>Closing Stock:</strong> {reportData.closingStock}</p>
                {/* Future: Add table for detailed movements here */}
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Close
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
