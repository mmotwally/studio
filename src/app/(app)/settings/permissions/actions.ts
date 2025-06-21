"use server";

import { openDb } from "@/lib/database";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/types";

export async function getPermissions(): Promise<Permission[]> {
  const canViewPermissions = await hasPermission("Create Roles"); // Or a more specific permission
  if (!canViewPermissions) {
    return [];
  }
  const db = await openDb();
  const permissions = await db.all<Permission[]>(`
    SELECT id, name, description, "group" 
    FROM permissions 
    ORDER BY "group", name
  `);
  return permissions;
}
