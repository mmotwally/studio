
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { SubCategoryFormValues } from "./schema";
import type { SubCategoryDB } from "@/types";

export async function addSubCategoryAction(data: SubCategoryFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    const result = await db.run(
      `INSERT INTO sub_categories (id, name, categoryId, code) VALUES (?, ?, ?, ?)`,
      id,
      data.name,
      data.categoryId,
      data.code.toUpperCase()
    );

    if (!result.lastID) {
        throw new Error("Failed to insert sub-category, no ID returned.");
    }

  } catch (error) {
    console.error("Failed to add sub-category:", error);
    if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint failed: sub_categories.name, sub_categories.categoryId")) {
            throw new Error(`A sub-category with the name "${data.name}" already exists under the selected parent category.`);
        }
        if (error.message.includes("UNIQUE constraint failed: sub_categories.categoryId, sub_categories.code")) {
            throw new Error(`A sub-category with the code "${data.code.toUpperCase()}" already exists under the selected parent category.`);
        }
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add sub-category.");
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/new");
}

export async function getSubCategories(categoryId?: string): Promise<SubCategoryDB[]> {
  const db = await openDb();
  let query = `
    SELECT sc.id, sc.name, sc.categoryId, sc.code, c.name as categoryName 
    FROM sub_categories sc
    JOIN categories c ON sc.categoryId = c.id
  `;
  const params = [];
  if (categoryId) {
    query += " WHERE sc.categoryId = ?";
    params.push(categoryId);
  }
  query += " ORDER BY sc.name ASC";
  
  const subCategories = await db.all<SubCategoryDB[]>(query, ...params);
  return subCategories;
}

export async function getSubCategoryById(id: string): Promise<SubCategoryDB | null> {
  if (!id) return null;
  const db = await openDb();
  const subCategory = await db.get<SubCategoryDB>(
    `SELECT sc.id, sc.name, sc.categoryId, sc.code, c.name as categoryName 
     FROM sub_categories sc
     JOIN categories c ON sc.categoryId = c.id
     WHERE sc.id = ?`, id);
  return subCategory || null;
}

    