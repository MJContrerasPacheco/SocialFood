"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { USER_TABLE } from "@/lib/constants";
import { ensureUserProfile } from "@/lib/auth";
import { isPlanTier } from "@/lib/plans";
import { isPlanAllowlisted } from "@/lib/plan-access";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupSchema = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["comercio", "ong"]),
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function signIn(_: AuthState, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const selectedPlan = String(formData.get("plan") || "");

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies AuthState;
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("confirm")) {
      return {
        error: "Confirma tu email para continuar",
      } satisfies AuthState;
    }
    return { error: "Credenciales invalidas" } satisfies AuthState;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No se pudo iniciar sesion" } satisfies AuthState;
  }

  let { data: profile } = await supabase
    .from(USER_TABLE)
    .select("role, plan_tier, stripe_subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.role) {
    const ensuredProfile = await ensureUserProfile({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    if (ensuredProfile) {
      profile = ensuredProfile;
    }
  }

  if (!profile || !profile.role) {
    const fallbackRole = user.user_metadata?.role;
    const fallbackName = user.user_metadata?.name ?? null;

    if (fallbackRole === "comercio" || fallbackRole === "ong") {
      await supabase.from(USER_TABLE).upsert(
        {
          id: user.id,
          email: user.email,
          role: fallbackRole,
          name: fallbackName,
        },
        { onConflict: "id" }
      );

      const { data: refreshedProfile } = await supabase
        .from(USER_TABLE)
        .select("role, plan_tier, stripe_subscription_status")
        .eq("id", user.id)
        .single();

      profile = refreshedProfile ?? null;
    }
  }

  if (!profile || !profile.role) {
    return {
      error:
        "Perfil no creado. Ejecuta el SQL de trigger en Supabase o agrega SUPABASE_SERVICE_ROLE_KEY.",
    } satisfies AuthState;
  }

  if (
    profile.role === "comercio" &&
    isPlanTier(selectedPlan) &&
    isPlanAllowlisted({
      id: user.id,
      email: user.email,
      plan_tier: profile.plan_tier ?? null,
      stripe_subscription_status: profile.stripe_subscription_status ?? null,
    })
  ) {
    await supabase
      .from(USER_TABLE)
      .update({ plan_tier: selectedPlan })
      .eq("id", user.id);

    redirect("/comercio");
  }

  if (profile.role === "comercio") {
    if (isPlanTier(selectedPlan) && selectedPlan !== "free") {
      redirect(`/comercio/planes?plan=${selectedPlan}`);
    }
  }

  redirect(`/${profile.role}`);
}

export async function signUp(_: AuthState, formData: FormData) {
  const parsed = signupSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies AuthState;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/login?confirmed=1`,
      data: {
        name: parsed.data.nombre,
        role: parsed.data.role,
      },
    },
  });

  if (error) {
    return { error: "No se pudo registrar" } satisfies AuthState;
  }

  const userId = data.user?.id;
  if (!userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "No se pudo crear el usuario" } satisfies AuthState;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && userId) {
    const adminSupabase = createAdminSupabase();
    const { error: profileError } = await adminSupabase
      .from(USER_TABLE)
      .upsert(
        {
          id: userId,
          email: parsed.data.email,
          name: parsed.data.nombre,
          role: parsed.data.role,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      return { error: profileError.message } satisfies AuthState;
    }
  }

  redirect("/pending");
}
