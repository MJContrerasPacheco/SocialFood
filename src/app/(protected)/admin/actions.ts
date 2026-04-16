"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { USER_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";

export type AdminState = {
  error?: string;
  success?: string;
};

const getActionTranslations = async () =>
  getTranslations(getLocaleFromCookies(await cookies()));

const getFirstError = (error: z.ZodError, fallback: string) =>
  error.issues[0]?.message ?? fallback;

export async function createUser(_: AdminState, formData: FormData) {
  const t = await getActionTranslations();
  await requireApprovedRole("admin");

  const createUserSchema = z.object({
    name: z
      .string()
      .trim()
      .min(2, t.admin.errors.nameTooShort)
      .max(120),
    email: z.string().trim().email(t.admin.errors.emailInvalid),
    password: z.string().min(8, t.admin.errors.passwordMin),
    role: z.enum(["comercio", "ong", "admin"], {
      required_error: t.admin.errors.roleRequired,
    }),
  });

  const parsed = createUserSchema.safeParse({
    name: String(formData.get("nombre") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: getFirstError(parsed.error, t.admin.errors.invalidData),
    } satisfies AdminState;
  }

  const adminSupabase = createAdminSupabase();
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      name: parsed.data.name,
      role: parsed.data.role,
    },
  });

  if (error) {
    return { error: t.admin.errors.createUserFailed } satisfies AdminState;
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: t.admin.errors.createUserFailed } satisfies AdminState;
  }

  const { error: profileError } = await adminSupabase.from(USER_TABLE).insert({
    id: userId,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
  });

  if (profileError) {
    return { error: t.admin.errors.createProfileFailed } satisfies AdminState;
  }

  revalidatePath("/admin");
  return { success: t.admin.errors.userCreated } satisfies AdminState;
}

export async function updateUserRole(formData: FormData) {
  const t = await getActionTranslations();
  const { user: currentUser } = await requireApprovedRole("admin");

  const updateRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(["comercio", "ong", "admin"], {
      required_error: t.admin.errors.roleRequired,
    }),
  });

  const parsed = updateRoleSchema.safeParse({
    userId: String(formData.get("userId") || ""),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return;
  }

  const { userId, role } = parsed.data;
  if (currentUser.id === userId) {
    return;
  }
  const adminSupabase = createAdminSupabase();

  await adminSupabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });

  await adminSupabase
    .from(USER_TABLE)
    .update({ role })
    .eq("id", userId);

  if (role === "comercio" || role === "ong") {
    const { data: targetUser } = await adminSupabase
      .from(USER_TABLE)
      .select("id, email, name")
      .eq("id", userId)
      .single();

    await adminSupabase.from("organizations").upsert(
      {
        user_id: userId,
        role,
        name: targetUser?.name ?? null,
        contact_email: targetUser?.email ?? null,
      },
      { onConflict: "user_id" }
    );
  }

  if (currentUser.id === userId) {
    revalidatePath("/admin");
    return;
  }

  revalidatePath("/admin");
}

export async function deleteUser(formData: FormData) {
  const { user: currentUser } = await requireApprovedRole("admin");

  const deleteUserSchema = z.object({
    userId: z.string().uuid(),
  });

  const parsed = deleteUserSchema.safeParse({
    userId: String(formData.get("userId") || ""),
  });

  if (!parsed.success) {
    return;
  }

  const { userId } = parsed.data;
  if (currentUser.id === userId) {
    return;
  }

  const adminSupabase = createAdminSupabase();
  await adminSupabase.auth.admin.deleteUser(userId);
  await adminSupabase.from(USER_TABLE).delete().eq("id", userId);

  revalidatePath("/admin");
}
