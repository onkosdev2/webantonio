"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { getCurrentUser, requireUserManagementSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function resolveRole(value: string) {
  return value === UserRole.ADMIN ? UserRole.ADMIN : UserRole.EDITOR;
}

function redirectWithError(error: string) {
  redirect(`/panel/usuarios?error=${error}`);
}

export async function createUserAction(formData: FormData) {
  await requireUserManagementSession();

  const name = getText(formData, "name");
  const email = getText(formData, "email").toLowerCase();
  const password = getText(formData, "password");
  const role = resolveRole(getText(formData, "role"));
  const passwordError = validatePassword(password);

  if (!name || !email || passwordError) {
    redirectWithError("create");
  }

  try {
    await db.user.create({
      data: {
        name,
        email,
        role,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        active: true
      }
    });
  } catch {
    redirectWithError("duplicate");
  }

  revalidatePath("/panel/usuarios");
  redirect("/panel/usuarios?ok=created");
}

export async function setUserPasswordAction(userId: string, formData: FormData) {
  await requireUserManagementSession();

  const password = getText(formData, "password");
  const passwordError = validatePassword(password);

  if (passwordError) {
    redirectWithError("password");
  }

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      active: true
    }
  });

  revalidatePath("/panel/usuarios");
  redirect("/panel/usuarios?ok=password");
}

export async function resetUserPasswordAction(userId: string, formData: FormData) {
  await setUserPasswordAction(userId, formData);
}

export async function toggleUserActiveAction(userId: string) {
  const currentUser = await requireUserManagementSession();

  if (currentUser.id === userId) {
    redirectWithError("self");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { active: true }
  });

  if (!user) {
    redirectWithError("missing");
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: { active: !user.active }
  });

  revalidatePath("/panel/usuarios");
  redirect("/panel/usuarios?ok=status");
}

export async function ensureUserManagementAccess() {
  const user = await getCurrentUser();
  return user?.role === UserRole.ADMIN;
}
