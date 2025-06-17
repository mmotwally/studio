
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStat, DashboardData, ActivityLogEntry, ActivityType } from '@/types';
import { 
    Boxes, AlertTriangle, FileClock, Truck, Banknote, CircleDollarSign, 
    PackagePlus, FilePlus2, ShoppingCart, History as HistoryIcon, MoveUp, MoveDown, Settings2, FileCheck2, FileX2, PackageCheck, Ban, Activity, Info
} from 'lucide-react';
import { getDashboardData } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

function getActivityIcon(type: ActivityType) {
    switch (type) {
        case 'INVENTORY_NEW': return <PackagePlus className="h-5 w-5 text-green-500" />;
        case 'REQUISITION_NEW': return <FilePlus2 className="h-5 w-5 text-blue-500" />;
        case 'PO_NEW': return <ShoppingCart className="h-5 w-5 text-purple-500" />;
        case 'STOCK_MOVEMENT_PO_RECEIPT': return <MoveDown className="h-5 w-5 text-teal-500" />;
        case 'STOCK_MOVEMENT_REQ_ISSUE': return <MoveUp className="h-5 w-5 text-orange-500" />;
        case 'STOCK_MOVEMENT_REQ_RETURN': return <HistoryIcon className="h-5 w-5 text-yellow-500" />;
        case 'STOCK_MOVEMENT_ADJUSTMENT': return <Settings2 className="h-5 w-5 text-gray-500" />;
        case 'STOCK_MOVEMENT_INITIAL': return <PackagePlus className="h-5 w-5 text-sky-500" />;
        // Add more cases for REQUISITION_STATUS_CHANGE, PO_STATUS_CHANGE if needed
        default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
}

function getActivityFallbackLetter(type: ActivityType): string {
    switch (type) {
        case 'INVENTORY_NEW': return 'I';
        case 'REQUISITION_NEW': return 'R';
        case 'PO_NEW': return 'P';
        case 'STOCK_MOVEMENT_PO_RECEIPT': 
        case 'STOCK_MOVEMENT_REQ_ISSUE':
        case 'STOCK_MOVEMENT_REQ_RETURN':
        case 'STOCK_MOVEMENT_ADJUSTMENT':
        case 'STOCK_MOVEMENT_INITIAL':
            return 'S';
        default: return 'A';
    }
}

export default async function DashboardPage() {
  const data: DashboardData = await getDashboardData();

  if (data.error && !data.recentActivities) { // Only show full error if everything failed
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
      {data.error && data.recentActivities && ( // Show a less intrusive error if only recent activities failed or partial data came through
         <Alert variant="default" className="mb-4 border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-700/20 dark:text-amber-300 dark:border-amber-600">
          <Info className="h-4 w-4" />
          <AlertTitle>Partial Data Error</AlertTitle>
          <AlertDescription>
            There was an issue loading some dashboard components. The displayed data might be incomplete. Error: {data.error}
          </AlertDescription>
        </Alert>
      )}
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
            {data.recentActivities && data.recentActivities.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <ul className="space-y-4">
                  {data.recentActivities.map((activity) => (
                    <li key={activity.id + activity.timestamp} className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8 border">
                        {/* Icon can be rendered here if available in activity object or mapped */}
                        {getActivityIcon(activity.type)}
                        <AvatarFallback className="text-xs">{getActivityFallbackLetter(activity.type)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-tight">
                            {activity.linkHref ? (
                                <Link href={activity.linkHref} className="hover:underline font-medium">{activity.description.split('.')[0]}.</Link>
                            ) : (
                                <span className="font-medium">{activity.description.split('.')[0]}.</span>
                            )}
                            {activity.description.includes('.') && activity.description.split('.').slice(1).join('.').trim() && (
                                <span className="text-muted-foreground"> {activity.description.split('.').slice(1).join('.').trim()}</span>
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(parseISO(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground">No recent activity to display.</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Button variant="link" asChild className="p-0 justify-start text-primary hover:underline h-auto">
                <Link href="/inventory/new">Add New Item</Link>
            </Button>
             <Button variant="link" asChild className="p-0 justify-start text-primary hover:underline h-auto">
                <Link href="/requisitions/new">Create Requisition</Link>
            </Button>
            <Button variant="link" asChild className="p-0 justify-start text-primary hover:underline h-auto">
                 <Link href="/purchase-orders/new">Create Purchase Order</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
