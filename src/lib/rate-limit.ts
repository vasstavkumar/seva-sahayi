import "server-only";
import { and, eq, gt, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, loginAttempts } from "@/db/schema";

export const LOGIN_WINDOW_MINUTES = 15;
export const MAX_FAILURES_PER_USERNAME = 5;
export const MAX_FAILURES_PER_IP = 20;
export const MAX_AI_CALLS_PER_HOUR = 60;

// per-account + per-IP lockout. In postgres so it works across lambdas.
export async function loginLocked(username: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const failures = (where: ReturnType<typeof eq>) =>
    db.$count(loginAttempts, and(where, eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  const [byUser, byIp] = await Promise.all([
    failures(eq(loginAttempts.username, username)),
    failures(eq(loginAttempts.ip, ip)),
  ]);
  return byUser >= MAX_FAILURES_PER_USERNAME || byIp >= MAX_FAILURES_PER_IP;
}

export async function recordLogin(username: string, ip: string, success: boolean) {
  await db.insert(loginAttempts).values({ username: username.slice(0, 100), ip, success });
}

export async function aiQuotaExceeded(userId: number): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000);
  const n = await db.$count(
    events,
    and(
      like(events.kind, "ai_%"),
      gt(events.createdAt, since),
      sql`(${events.details} ->> 'requestedBy')::int = ${userId}`,
    ),
  );
  return n >= MAX_AI_CALLS_PER_HOUR;
}
