import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { ORGANIZATIONS_TABLE, USER_TABLE } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isPlanTier, type PlanTier } from "@/lib/plans";
import { isPlanAllowlisted } from "@/lib/plan-access";

export const runtime = "nodejs";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const roleParam = searchParams.get("role");
  const plan = searchParams.get("plan");
  const redirectUrl = new URL("/login", origin);

  if (plan) {
    redirectUrl.searchParams.set("plan", plan);
  }

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user) {
    if (error) {
      console.error("OAuth exchange failed", error.message);
      redirectUrl.searchParams.set("error", "oauth");
      redirectUrl.searchParams.set(
        "reason",
        error.message.slice(0, 120)
      );
    } else {
      redirectUrl.searchParams.set("error", "missing_user");
    }
    response.headers.set("location", redirectUrl.toString());
    return response;
  }

  if (process.env.NODE_ENV !== "production") {
    const cookieNames = response.cookies.getAll().map((cookie) => cookie.name);
    console.log("OAuth exchange ok", {
      hasUser: !!data.user,
      hasSession: !!data.session,
      cookies: cookieNames,
    });
  }

  const resolveRole = (value?: string | null) => {
    if (value === "comercio" || value === "ong" || value === "admin") {
      return value;
    }
    return null;
  };

  const resolvedRole =
    resolveRole(roleParam) ??
    resolveRole(typeof data.user.user_metadata?.role === "string"
      ? data.user.user_metadata.role
      : null) ??
    "comercio";

  const requestedPlan = isPlanTier(plan ?? "") ? (plan as PlanTier) : null;
  const allowlistedPlan =
    requestedPlan &&
    isPlanAllowlisted({
      id: data.user.id,
      email: data.user.email ?? null,
      plan_tier: requestedPlan,
      stripe_subscription_status: null,
    })
      ? requestedPlan
      : null;

  if (resolvedRole) {
    const userPayload = {
      id: data.user.id,
      email: data.user.email,
      role: resolvedRole,
      name: data.user.user_metadata?.name ?? null,
      ...(allowlistedPlan ? { plan_tier: allowlistedPlan } : null),
    };
    const orgPayload = resolvedRole === "comercio" || resolvedRole === "ong"
      ? {
          user_id: data.user.id,
          role: resolvedRole,
          name: data.user.user_metadata?.name ?? null,
          contact_email: data.user.email,
        }
      : null;

    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminSupabase()
      : null;

    if (adminSupabase) {
      const { error: userError } = await adminSupabase
        .from(USER_TABLE)
        .upsert(userPayload, { onConflict: "id" });
      let orgError: unknown = null;
      if (orgPayload) {
        const response = await adminSupabase
          .from(ORGANIZATIONS_TABLE)
          .upsert(orgPayload, { onConflict: "user_id" });
        orgError = response.error;
      }
      if (process.env.NODE_ENV !== "production" && (userError || orgError)) {
        console.log("OAuth admin upsert failed", {
          userError: userError?.message,
          orgError: (orgError as { message?: string } | null)?.message,
        });
      }
    } else {
      await supabase.from(USER_TABLE).upsert(userPayload, {
        onConflict: "id",
      });
      if (orgPayload) {
        await supabase.from(ORGANIZATIONS_TABLE).upsert(orgPayload, {
          onConflict: "user_id",
        });
      }
    }
  }

  return response;
}
