
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStat, DashboardData } from '@/types';
import { Boxes, AlertTriangle, FileClock, Truck, Banknote, CircleDollarSign } from 'lucide-react';
import { getDashboardData } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function DashboardPage() {
  const data: DashboardData = await getDashboardData();

  if (data.error) {
    return (
      <>
        <PageHeader title="Dashboard" description="Overview of your cabinet console activities." />
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard Data</AlertTitle>
          <AlertDescription>
            Could not load dashboard statistics. Please try again later.
            <details className="mt-2">
              <summary>Error details</summary>
              <p className="text-xs">{data.error}</p>
            </details>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const stats: DashboardStat[] = [
    { title: 'Total Inventory Items', value: data.totalInventoryItems.toLocaleString(), icon: Boxes, description: 'All distinct items tracked', color: 'text-primary' },
    { title: 'Low Stock Items', value: data.lowStockItems.toLocaleString(), icon: AlertTriangle, description: 'Items needing reorder', color: 'text-destructive' },
    { title: 'Pending Requisitions', value: data.pendingRequisitions.toLocaleString(), icon: FileClock, description: 'Awaiting approval', color: 'text-amber-500' },
    { title: 'Open Purchase Orders', value: data.openPurchaseOrders.toLocaleString(), icon: Truck, description: 'Awaiting delivery/receipt', color: 'text-blue-500' },
    { title: 'Monthly Expenditure', value: `$${data.monthlyExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Banknote, description: 'Approx. current month spending on received POs', color: 'text-green-500' },
    { title: 'Total Inventory Value', value: `$${data.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CircleDollarSign, description: 'Estimated current value', color: 'text-indigo-500' },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your cabinet console activities." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color || 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="font-headline text-3xl font-bold">{stat.value}</div>
              {stat.description && (
                <p className="text-xs text-muted-foreground pt-1">{stat.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activity to display. (Placeholder)</p>
            {/* Placeholder for recent activity feed - to be implemented if requested */}
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <a href="/inventory/new" className="text-primary hover:underline">Add New Item</a>
            <a href="/requisitions/new" className="text-primary hover:underline">Create Requisition</a>
            <a href="/purchase-orders/new" className="text-primary hover:underline">Create Purchase Order</a>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
