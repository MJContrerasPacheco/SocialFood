import {
  DONACIONES_TABLE,
  ORGANIZATIONS_PUBLIC_TABLE,
  ORGANIZATIONS_TABLE,
  REQUESTS_TABLE,
} from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { requestDonation } from "./actions";
import OngDashboard from "./OngDashboard";

export default async function OngPage() {
  const { user, profile } = await requireApprovedRole("ong");
  const supabase = await createServerSupabase();

  const { data: donaciones } = await supabase
    .from(DONACIONES_TABLE)
    .select("id, title, kg, status, created_at, user_id")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  const { data: orgsPublic } = await supabase
    .from(ORGANIZATIONS_PUBLIC_TABLE)
    .select("user_id, name, city, region, lat, lng, role")
    .eq("role", "comercio");

  const { data: ongOrganization } = await supabase
    .from(ORGANIZATIONS_TABLE)
    .select(
      "name, contact_email, telefono, whatsapp, address, city, region, postal_code, lat, lng"
    )
    .eq("user_id", user.id)
    .single();

  const { data: requests } = await supabase
    .from(REQUESTS_TABLE)
    .select("donation_id, created_at")
    .eq("ong_user_id", user.id)
    .order("created_at", { ascending: false });

  const requestedDonationIds = requests?.map((item) => item.donation_id) ?? [];
  const initialSelectedDonationId = requests?.[0]?.donation_id ?? null;

  const { data: requestedDonations } = requestedDonationIds.length
    ? await supabase
        .from(DONACIONES_TABLE)
        .select("id, title, kg, status, created_at, user_id")
        .in("id", requestedDonationIds)
    : { data: [] };

  const requestedCommerceIds =
    requestedDonations?.map((donation) => donation.user_id).filter(Boolean) ?? [];

  const { data: requestedOrgs } = requestedCommerceIds.length
    ? await supabase
        .from(ORGANIZATIONS_TABLE)
        .select(
          "user_id, name, contact_email, telefono, whatsapp, address, city, region, lat, lng, postal_code"
        )
        .in("user_id", requestedCommerceIds)
    : { data: [] };

  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Panel ONG
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Bienvenido {profile.name || "ONG"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Explora donaciones disponibles y solicita reservas.
        </p>
      </section>

      <OngDashboard
        ongOrganization={ongOrganization ?? null}
        donations={donaciones ?? []}
        orgsPublic={orgsPublic ?? []}
        requestedDonations={requestedDonations ?? []}
        requestedOrgs={requestedOrgs ?? []}
        requestDonation={requestDonation}
        initialSelectedDonationId={initialSelectedDonationId}
      />
    </div>
  );
}
