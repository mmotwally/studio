
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function RequisitionsPage() {
  return (
    <>
      <PageHeader
        title="Requisitions"
        description="Manage item requests and approval workflows."
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Requisition
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Requisition Management</CardTitle>
          <CardDescription>
            This section will allow users to create, view, and manage requisitions.
            The workflow will include submission, approval/rejection, and tracking statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20">
            <p className="text-muted-foreground">Requisition features are under development.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
