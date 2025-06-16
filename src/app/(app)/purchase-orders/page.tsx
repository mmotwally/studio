
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function PurchaseOrdersPage() {
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Create, track, and manage purchase orders with suppliers."
         actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Purchase Order
          </Button>
        }
      />
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Purchase Order Management</CardTitle>
          <CardDescription>
            This section will enable users to generate purchase orders, send them to suppliers,
            track their fulfillment status, and manage related documentation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20">
            <p className="text-muted-foreground">Purchase Order features are under development.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
