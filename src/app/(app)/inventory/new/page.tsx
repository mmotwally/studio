
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const inventoryItemSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  category: z.string().optional(),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a non-negative integer." }),
  unitCost: z.coerce.number().min(0, { message: "Unit cost must be a non-negative number." }),
  location: z.string().optional(),
  supplier: z.string().optional(),
  lowStock: z.boolean().default(false).optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

async function addInventoryItemAction(data: InventoryItemFormValues) {
  "use server";
  try {
    const db = await openDb();
    const id = crypto.randomUUID();
    const lastUpdated = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory (id, name, category, quantity, unitCost, location, supplier, lastUpdated, lowStock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.category || null,
      data.quantity,
      data.unitCost,
      data.location || null,
      data.supplier || null,
      lastUpdated,
      data.lowStock ? 1 : 0
    );
  } catch (error) {
    console.error("Failed to add inventory item:", error);
    // Re-throw a more specific error or a generic one for the client
    throw new Error("Database operation failed. Could not add item.");
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}


export default function AddInventoryItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: 0,
      unitCost: 0,
      location: "",
      supplier: "",
      lowStock: false,
    },
  });

  async function onSubmit(values: InventoryItemFormValues) {
    setIsSubmitting(true);
    try {
      await addInventoryItemAction(values);
      toast({
        title: "Success",
        description: "Inventory item added successfully.",
      });
      // Redirect is handled by the server action
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Could not add item. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Add New Inventory Item"
        description="Fill in the details to add a new item to your inventory."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Office Chair" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Furniture" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity*</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost ($)*</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 150.99" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Warehouse A, Shelf 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Office Supplies Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Mark as low stock
                        </FormLabel>
                        <FormDescription>
                          Check this if the item quantity is considered low.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.push('/inventory')} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding Item..." : "Add Item"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
