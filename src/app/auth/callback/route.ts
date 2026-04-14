import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { ORGANIZATIONS_TABLE, USER_TABLE } from "@/lib/constants";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const role = searchParams.get("role");
  const redirectUrl = new URL("/login", origin);

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.redirect(redirectUrl);

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
    return response;
  }

  if (role === "comercio" || role === "ong") {
    await supabase.from(USER_TABLE).upsert(
      {
        id: data.user.id,
        email: data.user.email,
        role,
        name: data.user.user_metadata?.name ?? null,
      },
      { onConflict: "id" }
    );

    await supabase.from(ORGANIZATIONS_TABLE).upsert(
      {
        user_id: data.user.id,
        role,
        name: data.user.user_metadata?.name ?? null,
        contact_email: data.user.email,
      },
      { onConflict: "user_id" }
    );
  }

  return response;
}
