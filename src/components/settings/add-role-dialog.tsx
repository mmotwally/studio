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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { type RoleFormValues, roleSchema } from "@/app/(app)/settings/roles/schema";
import { addRoleAction } from "@/app/(app)/settings/roles/actions";

interface AddRoleDialogProps {
  setOpen: (open: boolean) => void;
  onRoleAdded?: () => void;
}

export function AddRoleDialog({ setOpen, onRoleAdded }: AddRoleDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(values: RoleFormValues) {
    setIsSubmitting(true);
    try {
      const result = await addRoleAction(values);
      if (result.success) {
        toast({
          title: "Success",
          description: "Role added successfully.",
        });
        if (onRoleAdded) {
          onRoleAdded();
        }
        setOpen(false);
        form.reset();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Failed to add role:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Could not add role."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Role</DialogTitle>
        <DialogDescription>
          Enter the name and description for the new user role.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Inventory Manager" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the permissions and responsibilities of this role."
                    {...field}
                    value={field.value ?? ""}
                  />
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
              {isSubmitting ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
