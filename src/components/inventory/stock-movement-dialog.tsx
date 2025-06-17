
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SelectItem as SelectItemType, StockMovementReport, StockMovement } from "@/types";
import { getStockMovementDetailsAction } from "@/app/(app)/inventory/actions"; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Printer, Download } from "lucide-react";

interface StockMovementDialogProps {
  setOpen: (open: boolean) => void;
  inventoryItems: SelectItemType[]; 
}

export function StockMovementDialog({ setOpen, inventoryItems }: StockMovementDialogProps) {
  const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
  });
  const [reportData, setReportData] = React.useState<StockMovementReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!selectedItemId || !dateRange?.from || !dateRange?.to) {
      toast({
          title: "Missing Information",
          description: "Please select an item and a valid date range.",
          variant: "default" 
      });
      return;
    }
    setIsLoadingReport(true);
    setError(null);
    setReportData(null);

    try {
      const fromDateString = format(dateRange.from, "yyyy-MM-dd");
      const toDateString = format(dateRange.to, "yyyy-MM-dd");
      const data = await getStockMovementDetailsAction(selectedItemId, fromDateString, toDateString);
      setReportData(data); 
      if (data.movements.length === 0 && data.openingStock === 0 && data.closingStock === 0 && data.totalIn === 0 && data.totalOut === 0) {
        toast({
            title: "No Activity Found",
            description: "No stock movements or activity recorded for the selected item in this period.",
            variant: "default"
        });
      }
    } catch (err) {
      console.error("Error fetching stock movement report:", err);
      const errorMessage = (err as Error).message || "Failed to load report data.";
      setError(errorMessage);
      toast({
        title: "Error Fetching Report",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handlePrint = () => {
    // This direct call might be blocked by sandbox restrictions in some environments (like IDX).
    // User might need to use browser's print functionality (Ctrl/Cmd+P).
    window.print();
  };

  return (
    <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col print:max-h-none print:shadow-none print:border-none">
      <DialogHeader className="print:hidden">
        <DialogTitle>Stock Movement Report</DialogTitle>
        <DialogDescription>
          Select an item and a period to view its stock movement details.
          To save as PDF, use your browser's print dialog options.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="item-select">Inventory Item*</Label>
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
            <Label>Date Range*</Label>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
           <Button onClick={handleGenerateReport} disabled={isLoadingReport || !selectedItemId || !dateRange?.from || !dateRange?.to} className="w-full md:w-auto self-end">
              {isLoadingReport ? "Generating..." : "Generate Report"}
           </Button>
        </div>
      </div>

        {isLoadingReport && (
            <div className="space-y-2 mt-4 print:hidden">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </div>
        )}
        {error && <p className="text-destructive text-center py-4 print:hidden">{error}</p>}

        {reportData && !isLoadingReport && !error && (
          <div className="mt-2 flex-grow overflow-hidden" id="stock-movement-report-content">
            <h3 className="text-xl font-semibold mb-1">
              Report for: {reportData.inventoryItemName} ({reportData.inventoryItemId})
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Period: {reportData.periodFrom} to {reportData.periodTo}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 border rounded-md bg-muted/30 print:grid-cols-4 print:border-black print:bg-white">
                <div><span className="font-medium">Opening Stock:</span> {reportData.openingStock}</div>
                <div><span className="font-medium">Total In (+):</span> {reportData.totalIn}</div>
                <div><span className="font-medium">Total Out (-):</span> {reportData.totalOut}</div>
                <div><span className="font-medium">Closing Stock:</span> {reportData.closingStock}</div>
            </div>
            
            <ScrollArea className="h-[calc(90vh-450px)] md:h-[calc(90vh-400px)] border rounded-md print:h-auto print:overflow-visible print:border-none">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 print:static print:bg-transparent">
                  <TableRow>
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Qty Changed</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.movements.length > 0 ? (
                    reportData.movements.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>{mov.movementDate}</TableCell>
                        <TableCell>{mov.movementType.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{mov.referenceId || '-'}</TableCell>
                        <TableCell className={`text-right ${mov.quantityChanged > 0 ? 'text-green-600 print:text-black' : 'text-red-600 print:text-black'}`}>
                          {mov.quantityChanged > 0 ? `+${mov.quantityChanged}` : mov.quantityChanged}
                        </TableCell>
                        <TableCell className="text-right">{mov.balanceAfterMovement}</TableCell>
                        <TableCell className="truncate max-w-xs print:max-w-none print:whitespace-normal">{mov.notes || '-'}</TableCell>
                        <TableCell>{mov.userName || mov.userId || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No stock movements recorded for this item in the selected period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
        {!reportData && !isLoadingReport && !error && (
            <div className="text-center py-8 text-muted-foreground print:hidden">
                Select an item and date range, then click "Generate Report".
            </div>
        )}
      <DialogFooter className="mt-auto pt-4 print:hidden">
        <div className="flex-grow"></div> {/* Pushes buttons to the right */}
        {reportData && !isLoadingReport && !error && (
          <>
            <Button type="button" onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print Report
            </Button>
            <Button type="button" onClick={handlePrint} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </>
        )}
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Close
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
