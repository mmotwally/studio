
"use client"; 

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/date-range-picker';
import type { ReportFilter, ReportDefinition, ReportTypeKey, GeneratedReportData, InventoryStockListItem, LowStockItem, RequisitionSummaryItem, PurchaseOrderSummaryItem } from '@/types';
import { Download, FileText, BarChartHorizontalBig, Loader2 } from 'lucide-react';
import { getInventoryStockListReport, getLowStockReport, getRequisitionSummaryReport, getPurchaseOrderSummaryReport } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const reportDefinitions: ReportDefinition[] = [
  { 
    value: 'inventory_stock_list', 
    label: 'Inventory Stock List',
    description: 'Comprehensive list of all inventory items, their quantities, costs, and values.',
    columns: [
      { key: 'id', header: 'Item ID' },
      { key: 'name', header: 'Name' },
      { key: 'categoryName', header: 'Category' },
      { key: 'quantity', header: 'Qty', type: 'number' },
      { key: 'unitName', header: 'Unit' },
      { key: 'averageCost', header: 'Avg. Cost', type: 'currency' },
      { key: 'totalValue', header: 'Total Value', type: 'currency' },
      { key: 'locationName', header: 'Location' },
      { key: 'lowStock', header: 'Low Stock?', type: 'badge' },
    ]
  },
  { 
    value: 'low_stock_items', 
    label: 'Low Stock Items',
    description: 'Items that are at or below their minimum stock level.',
    columns: [
      { key: 'id', header: 'Item ID' },
      { key: 'name', header: 'Name' },
      { key: 'quantity', header: 'Current Qty', type: 'number' },
      { key: 'minStockLevel', header: 'Min. Stock', type: 'number' },
      { key: 'diffQtyNeeded', header: 'Qty Needed', type: 'number' },
      { key: 'unitName', header: 'Unit' },
      { key: 'supplierName', header: 'Supplier' },
    ]
  },
  { 
    value: 'requisition_summary', 
    label: 'Requisition Summary',
    description: 'Summary of requisitions within the selected date range.',
     columns: [
      { key: 'id', header: 'Req. ID' },
      { key: 'dateCreated', header: 'Date Created', type: 'datetime' },
      { key: 'departmentName', header: 'Department' },
      { key: 'status', header: 'Status', type: 'badge'},
      { key: 'itemCount', header: 'Items', type: 'number' },
      { key: 'dateNeeded', header: 'Date Needed', type: 'date'},
    ]
  },
  { 
    value: 'purchase_order_summary', 
    label: 'Purchase Order Summary',
    description: 'Summary of purchase orders within the selected date range.',
    columns: [
      { key: 'id', header: 'PO ID' },
      { key: 'orderDate', header: 'Order Date', type: 'date' },
      { key: 'supplierName', header: 'Supplier' },
      { key: 'status', header: 'Status', type: 'badge' },
      { key: 'itemCount', header: 'Items', type: 'number' },
      { key: 'totalAmount', header: 'Total Amount', type: 'currency' },
      { key: 'expectedDeliveryDate', header: 'Expected Delivery', type: 'date'},
    ]
  },
];

export default function ReportsPage() {
  const [filters, setFilters] = React.useState<ReportFilter>({});
  const [reportData, setReportData] = React.useState<GeneratedReportData>(null);
  const [currentReportDefinition, setCurrentReportDefinition] = React.useState<ReportDefinition | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!filters.reportType) {
      toast({ title: "Select Report Type", description: "Please select a report type to generate.", variant: "default" });
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportData(null);
    const definition = reportDefinitions.find(def => def.value === filters.reportType);
    setCurrentReportDefinition(definition || null);

    try {
      let data: GeneratedReportData = null;
      switch (filters.reportType) {
        case 'inventory_stock_list':
          data = await getInventoryStockListReport(filters);
          break;
        case 'low_stock_items':
          data = await getLowStockReport(filters);
          break;
        case 'requisition_summary':
          data = await getRequisitionSummaryReport(filters);
          break;
        case 'purchase_order_summary':
          data = await getPurchaseOrderSummaryReport(filters);
          break;
        default:
          toast({ title: "Invalid Report Type", description: "The selected report type is not recognized.", variant: "destructive" });
          setIsLoading(false);
          return;
      }
      setReportData(data);
      if (!data || (Array.isArray(data) && data.length === 0)) {
        toast({ title: "No Data", description: "No data found for the selected criteria.", variant: "default" });
      }
    } catch (e) {
      console.error("Error generating report:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({ title: "Report Generation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCellData = (item: any, column: ReportDefinition['columns'][0]): React.ReactNode => {
    const value = item[column.key];
    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'currency':
        return `$${Number(value).toFixed(2)}`;
      case 'date':
        return format(parseISO(value as string), 'PP');
      case 'datetime':
        return format(parseISO(value as string), 'PPp');
      case 'badge':
        if (column.key === 'lowStock') {
            return value ? <Badge variant="destructive">Yes</Badge> : <Badge variant="outline">No</Badge>;
        }
        // For status badges (assuming value is a string like RequisitionStatus or PurchaseOrderStatus)
        return <Badge variant="secondary" className="capitalize">{String(value).replace(/_/g, ' ').toLowerCase()}</Badge>;
      case 'number':
        return Number(value).toLocaleString();
      default:
        return String(value);
    }
  };


  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and export various reports for your operations."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Select criteria to generate your report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-foreground mb-1">Report Type*</label>
              <Select
                onValueChange={(value) => setFilters(prev => ({ ...prev, reportType: value as ReportTypeKey }))}
                value={filters.reportType}
              >
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Select a report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportDefinitions.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {filters.reportType && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {reportDefinitions.find(def => def.value === filters.reportType)?.description}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date Range (Optional)</label>
              <DateRangePicker
                date={filters.dateRange}
                onDateChange={(dateRange) => setFilters(prev => ({ ...prev, dateRange }))}
              />
               <p className="mt-1 text-xs text-muted-foreground">
                 Applies to reports like Requisition or PO Summary. Ignored by others like Stock List.
               </p>
            </div>
            {/* Add more filters here as needed e.g. Status, Category dropdowns */}
            <Button onClick={handleGenerateReport} className="w-full" disabled={isLoading || !filters.reportType}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChartHorizontalBig className="mr-2 h-4 w-4" />}
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{currentReportDefinition ? currentReportDefinition.label : "Generated Report"}</CardTitle>
              <CardDescription>
                {currentReportDefinition ? currentReportDefinition.description : "Preview your report below."}
              </CardDescription>
            </div>
            {reportData && Array.isArray(reportData) && reportData.length > 0 && (
               <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled> {/* CSV Export Placeholder */}
                  <FileText className="mr-2 h-4 w-4" /> Export as CSV
                </Button>
                <Button variant="outline" size="sm" disabled> {/* PDF Download Placeholder */}
                  <Download className="mr-2 h-4 w-4" /> Export as PDF
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-md border-2 border-dashed border-destructive bg-destructive/10 p-4">
                <p className="text-destructive-foreground text-center">Error generating report: {error}</p>
              </div>
            ) : reportData && Array.isArray(reportData) && reportData.length > 0 && currentReportDefinition ? (
              <ScrollArea className="h-[calc(100vh-300px)]"> {/* Adjust height as needed */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentReportDefinition.columns.map(col => (
                        <TableHead key={col.key} className={col.type === 'number' || col.type === 'currency' ? 'text-right' : ''}>{col.header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((item, index) => (
                      <TableRow key={(item as any).id || index}>
                        {currentReportDefinition.columns.map(col => (
                          <TableCell key={col.key} className={col.type === 'number' || col.type === 'currency' ? 'text-right' : ''}>
                            {formatCellData(item, col)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20">
                <p className="text-muted-foreground text-center">
                  {reportData && Array.isArray(reportData) && reportData.length === 0 
                    ? "No data found for the selected criteria." 
                    : "Select filters and generate a report to see results."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
