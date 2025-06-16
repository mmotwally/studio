
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStat } from '@/types';
import { Boxes, AlertTriangle, FileClock, Truck, Banknote, CircleDollarSign } from 'lucide-react';

const stats: DashboardStat[] = [
  { title: 'Total Inventory Items', value: '1,250', icon: Boxes, description: '+20.1% from last month', color: 'text-primary' },
  { title: 'Low Stock Items', value: '32', icon: AlertTriangle, description: 'Needs urgent reorder', color: 'text-destructive' },
  { title: 'Pending Requisitions', value: '15', icon: FileClock, description: 'Awaiting approval', color: 'text-amber-500' },
  { title: 'Open Purchase Orders', value: '8', icon: Truck, description: 'Awaiting delivery', color: 'text-blue-500' },
  { title: 'Monthly Expenditure', value: '$12,345', icon: Banknote, description: 'Current month spending', color: 'text-green-500' },
  { title: 'Total Inventory Value', value: '$250,800', icon: CircleDollarSign, description: 'Estimated current value', color: 'text-indigo-500' },
];

export default function DashboardPage() {
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
            <p className="text-muted-foreground">No recent activity to display.</p>
            {/* Placeholder for recent activity feed */}
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
