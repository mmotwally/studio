"use server";

import { openDb } from "@/lib/database";
import crypto from "crypto";
import type { User } from "@/types";
import { hasPermission } from "@/lib/permissions";

export async function getUsers(): Promise<User[]> {
  const canViewUsers = await hasPermission("Create Roles"); // Reuse a high-level settings permission
  if (!canViewUsers) {
    return [];
  }
  const db = await openDb();
  const users = await db.all("SELECT id, name, email, role, avatarUrl FROM users");
  return users;
}

export async function createUser(prevState: any, formData: FormData) {
  console.log("--- Create User Server Action Invoked ---");
  const canCreateUsers = await hasPermission("Create Roles"); // Reuse a high-level settings permission
  if (!canCreateUsers) {
    return { error: "You do not have permission to create users." };
  }
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString();

  if (!name || !email || !password || !role) {
    return { error: "All fields are required." };
  }

  const db = await openDb();

  const existingUser = await db.get("SELECT id FROM users WHERE email = ?", email);
  if (existingUser) {
    return { error: "A user with this email already exists." };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  const id = crypto.randomUUID();
  const avatarUrl = `https://placehold.co/40x40.png?text=${name.charAt(0).toUpperCase()}`;

  try {
    await db.run(
      'INSERT INTO users (id, name, email, hashedPassword, salt, role, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, name, email, hashedPassword, salt, role, avatarUrl
    );
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { error: "Database error: Could not create user." };
  }
}