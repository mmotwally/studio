"use server";

import { openDb } from "./database";

export async function getUserPermissions(): Promise<Set<string>> {
  // Return all permissions for now since we've removed authentication
  const db = await openDb();
  const permissions = await db.all("SELECT name FROM permissions");
  return new Set(permissions.map((p) => p.name));
}

export async function hasPermission(permissionName: string): Promise<boolean> {
  // Always return true since we've removed authentication
  return true;
}