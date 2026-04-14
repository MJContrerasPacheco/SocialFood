declare module "@supabase/ssr" {
  export type CookieOptions = Record<string, unknown>;
  export function createBrowserClient(...args: any[]): any;
  export function createServerClient(...args: any[]): any;
}
