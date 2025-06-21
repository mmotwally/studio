"use server";

import { cookies } from "next/headers";
import { openDb } from "./database";
import crypto from "crypto";
import { encrypt } from "./session";

export async function login(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const db = await openDb();
  const user = await db.get("SELECT * FROM users WHERE email = ?", email);

  if (!user) {
    return { error: "Invalid credentials." };
  }

  const hashedPassword = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');

  if (hashedPassword !== user.hashedPassword) {
    return { error: "Invalid credentials." };
  }

  // Create the session
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const session = await encrypt({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }, expires });

  // Save the session in a cookie
  (await cookies()).set("session", session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

  return { success: true };
}