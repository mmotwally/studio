
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { CategoryFormValues } from "./schema";
import type { CategoryDB } from "@/types";

export async function addCategoryAction(data: CategoryFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    const result = await db.run(
      `INSERT INTO categories (id, name, code) VALUES (?, ?, ?)`,
      id,
      data.name,
      data.code.toUpperCase()
    );

    if (!result.lastID) {
        throw new Error("Failed to insert category, no ID returned.");
    }

  } catch (error) {
    console.error("Failed to add category:", error);
    if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint failed: categories.name")) {
            throw new Error(`A category with the name "${data.name}" already exists.`);
        }
        if (error.message.includes("UNIQUE constraint failed: categories.code")) {
            throw new Error(`A category with the code "${data.code.toUpperCase()}" already exists.`);
        }
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add category.");
  }

  revalidatePath("/inventory"); 
  revalidatePath("/inventory/new");
  revalidatePath("/settings"); 
}

export async function getCategories(): Promise<CategoryDB[]> {
  const db = await openDb();
  const categories = await db.all<CategoryDB[]>('SELECT id, name, code FROM categories ORDER BY name ASC');
  return categories;
}

export async function getCategoryById(id: string): Promise<CategoryDB | null> {
  if (!id) return null;
  const db = await openDb();
  const category = await db.get<CategoryDB>('SELECT id, name, code FROM categories WHERE id = ?', id);
  return category || null;
}

    