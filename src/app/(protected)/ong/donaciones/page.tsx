import Link from "next/link";
import {
  DONACIONES_TABLE,
  ORGANIZATIONS_PUBLIC_TABLE,
} from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDonationStatus } from "@/lib/donations";
import { haversineKm, hasValidCoordinates, normalizeCoordinate } from "@/lib/geo";
import OngMap from "../OngMap";
import { requestDonation } from "../actions";

type SearchParams = {
  sort?: string | string[];
};

type DonationItem = {
  id: string;
  title: string | null;
  kg: number | null;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
  category: string | null;
  storage: string | null;
  pickup_window: string | null;
};

type OrgPublic = {
  user_id: string;
  name: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

type DonationWithDistance = DonationItem & {
  distanceKm: number | null;
  org: OrgPublic | null;
};

export default async function OngDonacionesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const { user, profile } = await requireApprovedRole("ong");
  const supabase = await createServerSupabase();

  const resolvedParams = (await searchParams) ?? {};
  const sortValue = Array.isArray(resolvedParams.sort)
    ? resolvedParams.sort[0]
    : resolvedParams.sort ?? "distance_asc";

  const { data: donations } = await supabase
    .from(DONACIONES_TABLE)
    .select(
      "id, title, kg, status, created_at, user_id, category, storage, pickup_window"
    )
    .eq("status", "available")
    .order("created_at", { ascending: false });

  const { data: orgsPublic } = await supabase
    .from(ORGANIZATIONS_PUBLIC_TABLE)
    .select("user_id, name, city, region, lat, lng, role")
    .eq("role", "comercio");

  const { data: ongOrganization } = await supabase
    .from(ORGANIZATIONS_PUBLIC_TABLE)
    .select("lat, lng")
    .eq("user_id", user.id)
    .single();

  const ongLat = normalizeCoordinate(ongOrganization?.lat ?? null);
  const ongLng = normalizeCoordinate(ongOrganization?.lng ?? null);

  const orgMap = new Map(
    (orgsPublic ?? []).map((org) => [org.user_id, org])
  );

  const donationList: DonationWithDistance[] = (donations ?? []).map(
    (donation) => {
      const org = donation.user_id ? orgMap.get(donation.user_id) ?? null : null;
      const distanceKm =
        org &&
        hasValidCoordinates(ongLat, ongLng) &&
        hasValidCoordinates(org.lat, org.lng)
          ? haversineKm(ongLat as number, ongLng as number, org.lat as number, org.lng as number)
          : null;
      return { ...donation, distanceKm, org };
    }
  );

  const sorters: Record<
    string,
    (a: DonationWithDistance, b: DonationWithDistance) => number
  > = {
    distance_asc: (a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    },
    distance_desc: (a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return b.distanceKm - a.distanceKm;
    },
    created_desc: (a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    created_asc: (a, b) =>
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    kg_desc: (a, b) => (Number(b.kg ?? 0) || 0) - (Number(a.kg ?? 0) || 0),
  };

  const sortedDonations = [...donationList].sort(
    sorters[sortValue] ?? sorters.distance_asc
  );

  const markers = (orgsPublic ?? [])
    .filter((org) => hasValidCoordinates(org.lat, org.lng))
    .map((org) => ({
      id: org.user_id,
      title: org.name || "Comercio",
      lat: org.lat as number,
      lng: org.lng as number,
    }));

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Donaciones disponibles
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          Encuentra excedentes cercanos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Ordena por distancia o fecha para priorizar las recogidas.
        </p>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-1 sm:p-4">
        <OngMap
          centerLat={ongLat}
          centerLng={ongLng}
          markers={markers}
          selectedMarkerId={null}
        />
        {!hasValidCoordinates(ongLat, ongLng) ? (
          <p className="mt-3 text-xs text-slate-500">
            Completa tu ubicacion en configuracion para ordenar por cercania.
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <form
          method="get"
          className="grid gap-3 text-xs text-slate-600 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        >
          <label className="grid gap-2">
            Ordenar
            <select
              name="sort"
              defaultValue={sortValue}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            >
              <option value="distance_asc">Mas cercanas</option>
              <option value="distance_desc">Mas lejanas</option>
              <option value="created_desc">Mas recientes</option>
              <option value="created_asc">Mas antiguas</option>
              <option value="kg_desc">Mas kg</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-900 px-4 text-xs font-semibold text-white btn-glow-dark flex items-center justify-center leading-none sm:justify-self-end sm:w-auto"
          >
            Aplicar
          </button>
          <Link
            href="/ong/donaciones"
            className="h-10 w-full rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 btn-glow-soft flex items-center justify-center leading-none sm:justify-self-end sm:w-auto"
          >
            Limpiar
          </Link>
        </form>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Donaciones disponibles
          </h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 badge-animate">
            {sortedDonations.length} opciones
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:gap-4">
          {sortedDonations.length > 0 ? (
            sortedDonations.map((donation, index) => (
              <div
                key={donation.id}
                className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr_auto] card-animate animate-fade-up"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {donation.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    Estado: {formatDonationStatus(donation.status)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Comercio: {donation.org?.name || "No informado"}
                  </p>
                  {donation.org?.city && (
                    <p className="text-xs text-slate-500">
                      {donation.org.city} {donation.org.region ? `· ${donation.org.region}` : ""}
                    </p>
                  )}
                  {donation.distanceKm !== null && (
                    <p className="text-xs text-emerald-600">
                      A {donation.distanceKm.toFixed(1)} km
                    </p>
                  )}
                  {donation.pickup_window ? (
                    <p className="text-xs text-slate-500">
                      Recogida: {donation.pickup_window}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Cantidad</p>
                  <p className="font-semibold">{donation.kg ?? 0} kg</p>
                </div>
                <form action={requestDonation}>
                  <input type="hidden" name="donacionId" value={donation.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white btn-glow"
                  >
                    Solicitar
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No hay donaciones disponibles en este momento.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700 sm:p-5">
        <p>
          Hola {profile.name || "ONG"}, usa el mapa para detectar comercios
          cercanos y priorizar recogidas.
        </p>
      </section>
    </div>
  );
}
