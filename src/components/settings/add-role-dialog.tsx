"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { addRoleAction } from "@/app/(app)/settings/roles/actions";
import type { Permission } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

interface AddRoleDialogProps {
  setOpen: (open: boolean) => void;
  permissions: Permission[];
}

const initialState = {
  success: false,
  message: "",
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Role"}
        </Button>
    );
}

export function AddRoleDialog({ setOpen, permissions }: AddRoleDialogProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(addRoleAction, initialState);

  const groupedPermissions = React.useMemo(() => {
    return permissions.reduce((acc, permission) => {
      const group = permission.group || "General";
      (acc[group] = acc[group] || []).push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Success",
          description: state.message,
        });
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: state.message,
          variant: "destructive",
        });
      }
    }
  }, [state, setOpen, toast]);

  return (
    <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Add New Role</DialogTitle>
        <DialogDescription>
          Define a new role and assign its permissions.
        </DialogDescription>
      </DialogHeader>
      <form action={formAction} className="flex-grow overflow-hidden flex flex-col">
        <ScrollArea className="flex-grow pr-4">
           <div className="space-y-6">
              <div>
                <Label htmlFor="name">Role Name*</Label>
                <Input id="name" name="name" placeholder="e.g., Inventory Manager" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Describe the responsibilities of this role." />
              </div>
              <Separator />
              <div>
                <h3 className="text-base font-medium">Permissions</h3>
                <p className="text-sm text-muted-foreground">Select the permissions this role will have.</p>
              </div>
              {permissions.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupedPermissions).sort(([groupA], [groupB]) => groupA.localeCompare(groupB)).map(([group, perms]) => (
                    <div key={group}>
                      <h4 className="font-medium text-sm text-foreground mb-3 border-b pb-1">{group}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        {perms.map((item) => (
                          <div key={item.id} className="flex items-start space-x-2">
                            <Checkbox id={`perm-${item.id}`} name="permissionIds" value={item.id} />
                            <div className="grid gap-1.5 leading-none">
                              <label htmlFor={`perm-${item.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {item.name}
                              </label>
                              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t shrink-0">
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <SubmitButton />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
