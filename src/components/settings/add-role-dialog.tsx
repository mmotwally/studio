
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { type RoleFormValues, roleSchema } from "@/app/(app)/settings/roles/schema";
import { addRoleAction } from "@/app/(app)/settings/roles/actions";
import { getPermissions } from "@/app/(app)/settings/permissions/actions";
import type { Permission } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface AddRoleDialogProps {
  setOpen: (open: boolean) => void;
  onRoleAdded?: () => void;
}

export function AddRoleDialog({ setOpen, onRoleAdded }: AddRoleDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(true);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionIds: [],
    },
  });

  React.useEffect(() => {
    async function loadPermissions() {
      setIsLoadingPermissions(true);
      try {
        const fetchedPermissions = await getPermissions();
        setPermissions(fetchedPermissions);
      } catch (error) {
        console.error("Failed to fetch permissions for dialog:", error);
        toast({
          title: "Error",
          description: "Could not load permissions list.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPermissions(false);
      }
    }
    loadPermissions();
  }, [toast]);

  const groupedPermissions = React.useMemo(() => {
    if (isLoadingPermissions) return {};
    return permissions.reduce((acc, permission) => {
      const group = permission.group || "General";
      (acc[group] = acc[group] || []).push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions, isLoadingPermissions]);

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
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Add New Role</DialogTitle>
        <DialogDescription>
          Define a new role and assign its permissions.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ScrollArea className="max-h-[65vh] pr-5">
            <div className="space-y-6 pr-1">
              <FormField control={form.control} name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name*</FormLabel>
                    <FormControl><Input placeholder="e.g., Inventory Manager" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
              />
              <FormField control={form.control} name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the responsibilities of this role." {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
              />
              <Separator />
              <FormField control={form.control} name="permissionIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base font-medium">Permissions</FormLabel>
                      <FormDescription>Select the permissions this role will have.</FormDescription>
                    </div>
                    {isLoadingPermissions ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-1/2" />)}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {Object.entries(groupedPermissions).map(([group, perms]) => (
                          <div key={group}>
                            <h4 className="font-medium text-sm text-foreground mb-3 border-b pb-1">{group}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                              {perms.map((item) => (
                                <FormField key={item.id} control={form.control} name="permissionIds"
                                  render={({ field }) => {
                                    return (
                                      <FormItem key={item.id} className="flex flex-row items-start space-x-2 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(field.value?.filter((value) => value !== item.id));
                                            }}
                                          />
                                        </FormControl>
                                        <div className="space-y-0 leading-none">
                                          <FormLabel className="font-normal text-sm">{item.name}</FormLabel>
                                          {item.description && <FormDescription className="text-xs">{item.description}</FormDescription>}
                                        </div>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>)}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting || isLoadingPermissions}>{isSubmitting ? "Saving..." : "Save Role"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
