"use server";

import { UserRole } from "@prisma/client";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth/session";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
};

declare global {
  var __loginAttempts__: Map<string, LoginAttempt> | undefined;
}

const loginAttempts = global.__loginAttempts__ ?? new Map<string, LoginAttempt>();

if (process.env.NODE_ENV !== "production") {
  global.__loginAttempts__ = loginAttempts;
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeNextPath(value: string): Route {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
      ? value
      : "/panel"
  ) as Route;
}

function getLoginAttempt(email: string) {
  const now = Date.now();
  const current = loginAttempts.get(email);

  if (!current || now - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    return { count: 0, firstAttemptAt: now };
  }

  return current;
}

function assertLoginAllowed(email: string) {
  const current = getLoginAttempt(email);

  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    redirect("/login?error=locked");
  }
}

function registerFailedLogin(email: string) {
  const current = getLoginAttempt(email);

  loginAttempts.set(email, {
    count: current.count + 1,
    firstAttemptAt: current.firstAttemptAt
  });
}

export async function loginAction(formData: FormData) {
  const email = getText(formData, "email").toLowerCase();
  const password = getText(formData, "password");
  const next = safeNextPath(getText(formData, "next"));
  assertLoginAllowed(email);
  const user = await db.user.findUnique({ where: { email } });

  if (!user?.active || !user.passwordHash) {
    registerFailedLogin(email);
    redirect("/login?error=invalid");
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    registerFailedLogin(email);
    redirect("/login?error=invalid");
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  await createSession(user.id);
  loginAttempts.delete(email);

  if (user.mustChangePassword) {
    redirect("/crear-contrasena");
  }

  redirect(next);
}

export async function setupFirstAdminAction(formData: FormData) {
  const usersCount = await db.user.count();

  if (usersCount > 0) {
    redirect("/login");
  }

  const name = getText(formData, "name");
  const email = getText(formData, "email").toLowerCase();
  const password = getText(formData, "password");
  const passwordError = validatePassword(password);

  if (!name || !email || passwordError) {
    redirect("/login?setup=1&error=setup");
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      role: UserRole.ADMIN,
      passwordHash: await hashPassword(password),
      mustChangePassword: false
    }
  });

  await createSession(user.id);
  redirect("/panel");
}
