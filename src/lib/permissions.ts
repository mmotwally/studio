"use server";

import { openDb } from "./database";
import { getSession } from "./session";

let userPermissionsCache: Set<string> | null = null;

export async function getUserPermissions(): Promise<Set<string>> {
  if (userPermissionsCache) {
    return userPermissionsCache;
  }

  const session = await getSession();
  if (!session?.user?.role) {
    return new Set();
  }

  const db = await openDb();
  const role = await db.get("SELECT id FROM roles WHERE name = ?", session.user.role);

  if (!role) {
    return new Set();
  }

  const permissions = await db.all(
    `SELECT p.name FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permissionId
     WHERE rp.roleId = ?`,
    role.id
  );

  userPermissionsCache = new Set(permissions.map((p) => p.name));
  return userPermissionsCache;
}

export async function hasPermission(permissionName: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions.has(permissionName);
}

// Call this function on logout to clear the cache
export function clearPermissionsCache() {
  userPermissionsCache = null;
}