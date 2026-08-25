"use server";

import { redirect } from "next/navigation";
import { validatePassword, hashPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function changeInitialPasswordAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const password = getText(formData, "password");
  const confirmation = getText(formData, "confirmation");
  const passwordError = validatePassword(password);

  if (passwordError || password !== confirmation) {
    redirect("/crear-contrasena?error=invalid");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: false
    }
  });

  redirect("/panel");
}
