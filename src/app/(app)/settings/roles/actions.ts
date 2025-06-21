"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { RoleFormValues } from "./schema";
import type { Role } from "@/types";

export async function addRoleAction(data: RoleFormValues): Promise<{ success: boolean; message: string }> {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    await db.run(
      `INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`,
      id,
      data.name,
      data.description
    );
  } catch (error) {
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
