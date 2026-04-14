import "server-only";

import { redirect } from "next/navigation";
import { USER_TABLE, type UserRole } from "@/lib/constants";
import { createServerSupabase } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole | null;
};

export async function getUserContext() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null } as const;
  }

  const { data: profile } = await supabase
    .from(USER_TABLE)
    .select("id, email, name, role")
    .eq("id", user.id)
    .single();

  return { user, profile: (profile as UserProfile) ?? null } as const;
}

export async function requireApprovedRole(role?: UserRole) {
  const { user, profile } = await getUserContext();

  if (!user) {
    redirect("/login");
  }

  if (!profile || !profile.role) {
    redirect("/login?error=profile");
  }

  if (role && profile.role !== role) {
    redirect(`/${profile.role}`);
  }

  return { user, profile } as const;
}
