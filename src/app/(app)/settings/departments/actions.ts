
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { DepartmentFormValues, Department, SelectItem } from "@/types";

export async function addDepartmentAction(data: DepartmentFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    const result = await db.run(
      `INSERT INTO departments (id, name, code) VALUES (?, ?, ?)`,
      id,
      data.name,
      data.code.toUpperCase()
    );

    if (!result.lastID) {
        throw new Error("Failed to insert department, no ID returned.");
    }

  } catch (error) {
    console.error("Failed to add department:", error);
    if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint failed: departments.name")) {
            throw new Error(`A department with the name "${data.name}" already exists.`);
        }
        if (error.message.includes("UNIQUE constraint failed: departments.code")) {
            throw new Error(`A department with the code "${data.code.toUpperCase()}" already exists.`);
        }
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add department.");
  }

  revalidatePath("/settings"); // Or a specific departments settings page if it exists
  revalidatePath("/requisitions/new"); // To refresh department dropdown
}

export async function getDepartments(): Promise<Department[]> {
  const db = await openDb();
  const departments = await db.all<Department[]>('SELECT id, name, code FROM departments ORDER BY name ASC');
  return departments;
}

export async function getDepartmentsForSelect(): Promise<SelectItem[]> {
  const departments = await getDepartments();
  return departments.map(dept => ({
    value: dept.id,
    label: `${dept.name} (${dept.code})`
  }));
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  if (!id) return null;
  const db = await openDb();
  const department = await db.get<Department>('SELECT id, name, code FROM departments WHERE id = ?', id);
  return department || null;
}
