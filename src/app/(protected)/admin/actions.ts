"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { USER_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type AdminState = {
  error?: string;
  success?: string;
};

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["comercio", "ong", "admin"]),
});

export async function createUser(_: AdminState, formData: FormData) {
  await requireApprovedRole("admin");

  const parsed = createUserSchema.safeParse({
    name: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies AdminState;
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
    return { error: "No se pudo crear el usuario" } satisfies AdminState;
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: "No se pudo crear el usuario" } satisfies AdminState;
  }

  const { error: profileError } = await adminSupabase.from(USER_TABLE).insert({
    id: userId,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
  });

  if (profileError) {
    return { error: "No se pudo crear el perfil" } satisfies AdminState;
  }

  revalidatePath("/admin");
  return { success: "Usuario creado" } satisfies AdminState;
}
