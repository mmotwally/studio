
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { type SubCategoryFormValues, subCategorySchema } from "@/app/(app)/settings/sub-categories/schema";
import { addSubCategoryAction } from "@/app/(app)/settings/sub-categories/actions";
import { getCategories } from "@/app/(app)/settings/categories/actions";
import type { CategoryDB } from "@/types";

interface AddSubCategoryDialogProps {
  setOpen: (open: boolean) => void;
  onSubCategoryAdded?: () => void;
}

export function AddSubCategoryDialog({ setOpen, onSubCategoryAdded }: AddSubCategoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryDB[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(true);

  React.useEffect(() => {
    async function fetchCategories() {
      setIsLoadingCategories(true);
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Failed to fetch categories for dialog:", error);
        toast({
          title: "Error",
          description: "Could not load categories for selection.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, [toast]);

  const form = useForm<SubCategoryFormValues>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: {
      name: "",
      categoryId: "",
    },
  });

  async function onSubmit(values: SubCategoryFormValues) {
    setIsSubmitting(true);
    try {
      await addSubCategoryAction(values);
      toast({
        title: "Success",
        description: "Sub-category added successfully.",
      });
      if (onSubCategoryAdded) {
        onSubCategoryAdded();
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to add sub-category:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not add sub-category.") || "Could not add sub-category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Sub-Category</DialogTitle>
        <DialogDescription>
          Enter the name for the new sub-category and select its parent category.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Category*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories || categories.length === 0}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a parent category"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.length === 0 && !isLoadingCategories ? (
                       <SelectItem value="no-category" disabled>No categories available. Add a category first.</SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub-Category Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Laptops, Executive Desks" {...field} />
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
            <Button type="submit" disabled={isSubmitting || isLoadingCategories || categories.length === 0}>
              {isSubmitting ? "Saving..." : "Save Sub-Category"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
