import type { SupabaseClient } from "@supabase/supabase-js";

declare module "@supabase/ssr" {
  export type CookieOptions = Record<string, unknown>;
  export function createBrowserClient(...args: unknown[]): SupabaseClient;
  export function createServerClient(...args: unknown[]): SupabaseClient;
}
