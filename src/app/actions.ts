"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clientIp, createSession, destroySession } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/i18n/server";
import { loginLocked, recordLogin } from "@/lib/rate-limit";

// compare against a dummy hash for unknown users so timing doesn't leak usernames
const DUMMY_HASH = "$2b$12$b7PwVSX1yMG4RkDNNSRbMum2LMhCyQ0lQQhPnqgo5N2vlazwmHpr6";

type LoginState = { error?: "invalid" | "locked" } | undefined;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const username = String(form.get("username") ?? "").trim().toLowerCase().slice(0, 100);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const ip = await clientIp();

  if (!username || !password) return { error: "invalid" };
  if (await loginLocked(username, ip)) {
    await recordLogin(username, ip, false);
    return { error: "locked" };
  }

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  await recordLogin(username, ip, Boolean(user && valid));
  if (!user || !valid) return { error: "invalid" };

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setLanguage(lang: "te" | "en") {
  (await cookies()).set(LANG_COOKIE, lang === "en" ? "en" : "te", {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
