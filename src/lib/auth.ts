"use server";

import { cookies } from "next/headers";
import { openDb } from "./database";
import crypto from "crypto";
import { encrypt } from "./session";
import { redirect } from "next/navigation";

export async function login(prevState: any, formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const db = await openDb();
  const user = await db.get("SELECT * FROM users WHERE email = ?", email);

  if (!user) {
    return { error: "Invalid email or password." };
  }

  const hashedPassword = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');

  if (hashedPassword !== user.hashedPassword) {
    return { error: "Invalid email or password." };
  }

  // Create the session
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const session = await encrypt({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }, expires });

  // Save the session in a cookie
  (await cookies()).set("session", session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

  return { success: true };
}

export async function logout() {
  // Destroy the session
  cookies().set('session', '', { expires: new Date(0) });
  // Redirect to the login page
  redirect('/login');
}