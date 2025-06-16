
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { type CategoryFormValues, categorySchema } from "@/app/(app)/settings/categories/schema";
import { addCategoryAction } from "@/app/(app)/settings/categories/actions";

interface AddCategoryDialogProps {
  setOpen: (open: boolean) => void;
  onCategoryAdded?: () => void; // Optional callback after category is added
}

export function AddCategoryDialog({ setOpen, onCategoryAdded }: AddCategoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    setIsSubmitting(true);
    try {
      await addCategoryAction(values);
      toast({
        title: "Success",
        description: "Category added successfully.",
      });
      if (onCategoryAdded) {
        onCategoryAdded();
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to add category:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not add category.") || "Could not add category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogDescription>
          Enter the name for the new category.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Office Supplies" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Category"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
