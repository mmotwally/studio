
"use server";

import { openDb } from "@/lib/database";
import type { Permission } from "@/types";

export async function getPermissions(): Promise<Permission[]> {
  const db = await openDb();
  // The "group" column is quoted because it's a reserved keyword in SQL.
  const permissions = await db.all<Permission[]>('SELECT id, name, description, "group" FROM permissions ORDER BY "group", name ASC');
  return permissions;
}
