export const USER_TABLE = "users";
export const DONACIONES_TABLE = "donations";
export const ORGANIZATIONS_TABLE = "organizations";
export const ORGANIZATIONS_PUBLIC_TABLE = "organizations_public";
export const REQUESTS_TABLE = "donation_requests";

export const ROLE_VALUES = ["comercio", "ong", "admin"] as const;
export type UserRole = (typeof ROLE_VALUES)[number];
