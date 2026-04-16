import "server-only";

import { redirect } from "next/navigation";
import { ORGANIZATIONS_TABLE, ROLE_VALUES, USER_TABLE, type UserRole } from "@/lib/constants";
import type { PlanTier } from "@/lib/plans";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole | null;
  plan_tier: PlanTier | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

const profileSelect =
  "id, email, name, role, plan_tier, stripe_customer_id, stripe_subscription_id, stripe_subscription_status";

const resolveUserRole = (value: unknown): UserRole | null => {
  if (typeof value !== "string") {
    return null;
  }
  return ROLE_VALUES.includes(value as UserRole) ? (value as UserRole) : null;
};

const buildUserPayload = (user: AuthUser) => {
  const metadata = user.user_metadata ?? {};
  const role = resolveUserRole(metadata.role) ?? "comercio";
  const name = typeof metadata.name === "string" ? metadata.name : null;

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    name,
  };
};

const buildOrganizationPayload = (payload: ReturnType<typeof buildUserPayload>) => ({
  user_id: payload.id,
  role: payload.role,
  name: payload.name,
  contact_email: payload.email,
});

export async function ensureUserProfile(user: AuthUser) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.log("ensureUserProfile skipped: missing service role key");
    }
    return null;
  }

  const adminSupabase = createAdminSupabase();
  const userPayload = buildUserPayload(user);
  const organizationPayload = buildOrganizationPayload(userPayload);

  const { error: userError } = await adminSupabase.from(USER_TABLE).upsert(userPayload, {
    onConflict: "id",
  });
  const { error: orgError } = await adminSupabase
    .from(ORGANIZATIONS_TABLE)
    .upsert(organizationPayload, {
    onConflict: "user_id",
  });

  if (process.env.NODE_ENV !== "production" && (userError || orgError)) {
    console.log("ensureUserProfile upsert failed", {
      userError: userError?.message,
      orgError: orgError?.message,
    });
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from(USER_TABLE)
    .select(profileSelect)
    .eq("id", user.id)
    .single();

  if (process.env.NODE_ENV !== "production" && profileError) {
    console.log("ensureUserProfile select failed", profileError.message);
  }

  return (profile as UserProfile) ?? null;
}

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
    .select(profileSelect)
    .eq("id", user.id)
    .single();

  if (!profile || !profile.role) {
    const ensuredProfile = await ensureUserProfile({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });
    return { user, profile: ensuredProfile } as const;
  }

  return { user, profile: profile as UserProfile } as const;
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
