"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { RoleFormValues } from "./schema";
import crypto from "crypto";
import type { Role } from "@/types";

export async function addRoleAction(prevState: any, formData: FormData): Promise<{ success: boolean; message: string }> {
  console.log("--- Add Role Server Action Invoked ---");
  const db = await openDb();
  
  const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      permissionIds: formData.getAll('permissionIds') as string[],
  };

  // Basic validation
  if (!data.name) {
      return { success: false, message: "Role name is required." };
  }

  await db.run('BEGIN TRANSACTION');
  try {
    const id = crypto.randomUUID();

    await db.run(
      `INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`,
      id,
      data.name,
      data.description
    );

    if (data.permissionIds && data.permissionIds.length > 0) {
      const stmt = await db.prepare('INSERT INTO role_permissions (roleId, permissionId) VALUES (?, ?)');
      for (const permissionId of data.permissionIds) {
          await stmt.run(id, permissionId);
      }
      await stmt.finalize();
    }

    await db.run('COMMIT');

  } catch (error) {
    if (db) {
      await db.run('ROLLBACK').catch(rbError => console.error("Rollback failed:", rbError));
    }
    console.error("Failed to add role:", error);
    if (error instanceof Error) {
      if (error.message.includes("UNIQUE constraint failed: roles.name")) {
        return { success: false, message: `A role with the name "${data.name}" already exists.` };
      }
      return { success: false, message: `Database operation failed: ${error.message}` };
    }
    return { success: false, message: "Database operation failed. Could not add role." };
  }

  revalidatePath("/settings");
  return { success: true, message: "Role added successfully." };
}


export async function getRoles(): Promise<Role[]> {
  const db = await openDb();
  // The 'users' table stores role as a string name, not an ID. So we need to count users by role name.
  const roles = await db.all<any[]>(`
    SELECT 
      r.id, 
      r.name, 
      r.description,
      (SELECT COUNT(*) FROM users u WHERE u.role = r.name) as userCount
    FROM roles r 
    ORDER BY r.name ASC
  `);
  return roles;
}

export async function deleteRoleAction(roleId: string): Promise<{ success: boolean; message: string }> {
    const db = await openDb();
    try {
        // Optional: Check if any users are assigned to this role first
        const roleInUse = await db.get("SELECT 1 FROM users u JOIN roles r ON u.role = r.name WHERE r.id = ?", roleId);
        if (roleInUse) {
            return { success: false, message: "Cannot delete role. It is currently assigned to one or more users." };
        }

        await db.run('DELETE FROM roles WHERE id = ?', roleId);
        revalidatePath("/settings");
        return { success: true, message: "Role deleted successfully." };
    } catch (error) {
        console.error("Failed to delete role:", error);
        return { success: false, message: "Database error: Could not delete role." };
    }
}
