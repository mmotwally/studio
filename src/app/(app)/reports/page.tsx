
"use client"; // Required for DateRangePicker and Select state

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/date-range-picker';
import type { ReportFilter } from '@/types';
import { Download, FileText, BarChartHorizontalBig } from 'lucide-react';

const reportTypes = [
  { value: 'inventory_summary', label: 'Inventory Summary' },
  { value: 'stock_levels', label: 'Stock Levels Report' },
  { value: 'expenditure_report', label: 'Expenditure Report' },
  { value: 'requisition_history', label: 'Requisition History' },
  { value: 'po_summary', label: 'Purchase Order Summary' },
];

export default function ReportsPage() {
  const [filters, setFilters] = React.useState<ReportFilter>({});
  const [generatedReport, setGeneratedReport] = React.useState<string | null>(null);

  const handleGenerateReport = () => {
    // Placeholder: In a real app, this would fetch and format report data
    setGeneratedReport(`Report generated for type: ${filters.reportType || 'N/A'} from ${filters.dateRange?.from?.toLocaleDateString() || 'N/A'} to ${filters.dateRange?.to?.toLocaleDateString() || 'N/A'}`);
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
              <label htmlFor="reportType" className="block text-sm font-medium text-foreground mb-1">Report Type</label>
              <Select
                onValueChange={(value) => setFilters(prev => ({ ...prev, reportType: value }))}
                value={filters.reportType}
              >
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Select a report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date Range</label>
              <DateRangePicker
                date={filters.dateRange}
                onDateChange={(dateRange) => setFilters(prev => ({ ...prev, dateRange }))}
              />
            </div>
            <Button onClick={handleGenerateReport} className="w-full">
              <BarChartHorizontalBig className="mr-2 h-4 w-4" /> Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Generated Report</CardTitle>
              <CardDescription>Preview your report below.</CardDescription>
            </div>
            {generatedReport && (
               <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" /> Export as CSV
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Export as PDF
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generatedReport ? (
              <div className="min-h-[200px] p-4 border rounded-md bg-muted/30">
                <pre className="text-sm whitespace-pre-wrap">{generatedReport}</pre>
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20">
                <p className="text-muted-foreground">Select filters and generate a report to see results.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
