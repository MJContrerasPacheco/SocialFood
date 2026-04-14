"use client";

import { useEffect, useMemo, useState } from "react";
import OngProfileForm from "./OngProfileForm";
import OngMap from "./OngMap";
import { haversineKm } from "@/lib/geo";
import { formatDonationStatus } from "@/lib/donations";

type DonationItem = {
  id: string;
  title: string | null;
  kg: number | null;
  status: string | null;
  created_at: string | null;
  user_id: string | null;
};

type OrgPublic = {
  user_id: string;
  name: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  role?: string | null;
};

type OrgFull = {
  user_id: string;
  name: string | null;
  contact_email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  postal_code?: string | null;
};

type OngDashboardProps = {
  ongOrganization: OrgFull | null;
  donations: DonationItem[];
  orgsPublic: OrgPublic[];
  requestedDonations: DonationItem[];
  requestedOrgs: OrgFull[];
  requestDonation: (formData: FormData) => Promise<void>;
  initialSelectedDonationId?: string | null;
};

export default function OngDashboard({
  ongOrganization,
  donations,
  orgsPublic,
  requestedDonations,
  requestedOrgs,
  requestDonation,
  initialSelectedDonationId = null,
}: OngDashboardProps) {
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(
    initialSelectedDonationId ??
      requestedDonations[0]?.id ??
      donations[0]?.id ??
      null
  );

  const orgPublicMap = useMemo(() => {
    return new Map(orgsPublic.map((org) => [org.user_id, org]));
  }, [orgsPublic]);

  const requestedOrgMap = useMemo(() => {
    return new Map(requestedOrgs.map((org) => [org.user_id, org]));
  }, [requestedOrgs]);

  const requestedDonationMap = useMemo(() => {
    return new Map(requestedDonations.map((donation) => [donation.id, donation]));
  }, [requestedDonations]);

  const ongLat = ongOrganization?.lat ?? null;
  const ongLng = ongOrganization?.lng ?? null;
  const ongRegion = ongOrganization?.region?.toLowerCase() ?? null;

  const donationList = useMemo(() => {
    return donations
      .map((donation) => {
        const org = donation.user_id ? orgPublicMap.get(donation.user_id) : null;
        const distanceKm =
          org &&
          ongLat !== null &&
          ongLng !== null &&
          org.lat !== null &&
          org.lng !== null
            ? haversineKm(ongLat, ongLng, org.lat, org.lng)
            : null;
        return { donation, org, distanceKm };
      })
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }

        if (a.distanceKm !== null) {
          return -1;
        }

        if (b.distanceKm !== null) {
          return 1;
        }

        if (ongRegion) {
          const aMatch = a.org?.region?.toLowerCase() === ongRegion ? 0 : 1;
          const bMatch = b.org?.region?.toLowerCase() === ongRegion ? 0 : 1;
          return aMatch - bMatch;
        }

        return 0;
      });
  }, [donations, ongLat, ongLng, ongRegion, orgPublicMap]);

  const requestedDonationIds = useMemo(() => {
    return new Set(requestedDonations.map((donation) => donation.id));
  }, [requestedDonations]);

  const selectedAvailableItem = donationList.find(
    (item) => item.donation.id === selectedDonationId
  );
  const selectedRequestedDonation = selectedDonationId
    ? requestedDonationMap.get(selectedDonationId) ?? null
    : null;
  const selectedDonation =
    selectedAvailableItem?.donation ?? selectedRequestedDonation ?? null;
  const selectedOrgPublic =
    selectedAvailableItem?.org ??
    (selectedDonation?.user_id ? orgPublicMap.get(selectedDonation.user_id) : null);
  const selectedContactOrg = selectedDonation?.user_id
    ? requestedOrgMap.get(selectedDonation.user_id) ?? null
    : null;
  const isSelectedRequested = selectedDonationId
    ? requestedDonationIds.has(selectedDonationId)
    : false;

  useEffect(() => {
    const fallbackId =
      initialSelectedDonationId ??
      requestedDonations[0]?.id ??
      donationList[0]?.donation.id ??
      null;

    if (!selectedDonationId) {
      if (fallbackId) {
        setSelectedDonationId(fallbackId);
      }
      return;
    }

    const existsInAvailable = donationList.some(
      (item) => item.donation.id === selectedDonationId
    );
    const existsInRequested = requestedDonationIds.has(selectedDonationId);

    if (!existsInAvailable && !existsInRequested && fallbackId) {
      setSelectedDonationId(fallbackId);
    }
  }, [
    donationList,
    initialSelectedDonationId,
    requestedDonations,
    requestedDonationIds,
    selectedDonationId,
  ]);

  useEffect(() => {
    if (
      initialSelectedDonationId &&
      initialSelectedDonationId !== selectedDonationId
    ) {
      setSelectedDonationId(initialSelectedDonationId);
    }
  }, [initialSelectedDonationId, selectedDonationId]);

  const mapMarkers = useMemo(() => {
    return orgsPublic
      .filter((org) => org.lat !== null && org.lng !== null)
      .map((org) => ({
        id: org.user_id,
        title: org.name || "Comercio",
        lat: org.lat as number,
        lng: org.lng as number,
      }));
  }, [orgsPublic]);

  const selectedMarkerId =
    selectedOrgPublic?.user_id ?? selectedDonation?.user_id ?? null;

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <OngProfileForm initialValues={ongOrganization ?? undefined} />
        <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <OngMap
            centerLat={ongLat}
            centerLng={ongLng}
            markers={mapMarkers}
            selectedMarkerId={selectedMarkerId}
          />
          {ongLat === null || ongLng === null ? (
            <p className="mt-3 text-xs text-slate-500">
              Completa tu ubicacion para ordenar por cercania.
            </p>
          ) : null}
        </div>
      </div>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Donaciones disponibles
          </h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {donations.length} opciones
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {donationList.length > 0 ? (
            donationList.map(({ donation, org, distanceKm }) => {
              const isSelected = donation.id === selectedDonationId;
              return (
                <div
                  key={donation.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDonationId(donation.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      setSelectedDonationId(donation.id);
                    }
                  }}
                  className={`grid gap-3 rounded-2xl border p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr_auto] ${
                    isSelected
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {donation.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Publicado: {donation.created_at?.slice(0, 10)}
                    </p>
                    {org?.city && (
                      <p className="text-xs text-slate-500">
                        {org.city} {org.region ? `· ${org.region}` : ""}
                      </p>
                    )}
                    {distanceKm !== null && (
                      <p className="text-xs text-emerald-600">
                        A {distanceKm.toFixed(1)} km de tu ONG
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Estado: {formatDonationStatus(donation.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Cantidad</p>
                    <p className="font-semibold">{donation.kg} kg</p>
                  </div>
                  <form
                    action={requestDonation}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input type="hidden" name="donacionId" value={donation.id} />
                    <button
                      type="submit"
                      onClick={() => setSelectedDonationId(donation.id)}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                    >
                      Solicitar
                    </button>
                  </form>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">
              No hay donaciones disponibles en este momento.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">
          Detalle de la donacion
        </h2>
        {selectedDonation ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900">
                {selectedDonation.title}
              </p>
              <p className="text-xs text-slate-500">
                {selectedDonation.kg} kg · {formatDonationStatus(selectedDonation.status)}
              </p>
              {selectedOrgPublic?.city && (
                <p className="text-xs text-slate-500">
                  {selectedOrgPublic.city} {selectedOrgPublic.region ? `· ${selectedOrgPublic.region}` : ""}
                </p>
              )}
            </div>
            <div>
              {isSelectedRequested ? (
                <>
                  <p className="text-xs uppercase text-slate-400">
                    Contacto comercio
                  </p>
                  {selectedContactOrg ? (
                    <>
                      <p className="text-sm text-slate-700">
                        {selectedContactOrg.name || ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedContactOrg.contact_email || ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedContactOrg.telefono || selectedContactOrg.whatsapp || ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedContactOrg.address || ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      El comercio aun no cargo sus datos de contacto.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  Solicita la donacion para ver el contacto del comercio.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Selecciona una donacion para ver detalles.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Mis solicitudes
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {requestedDonations.length} registros
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {requestedDonations.length > 0 ? (
            requestedDonations.map((donation) => {
              const org = donation.user_id
                ? requestedOrgMap.get(donation.user_id)
                : null;
              const isSelected = donation.id === selectedDonationId;
              return (
                <div
                  key={donation.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDonationId(donation.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      setSelectedDonationId(donation.id);
                    }
                  }}
                  className={`grid gap-3 rounded-2xl border p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr] ${
                    isSelected
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {donation.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {donation.kg} kg · {formatDonationStatus(donation.status)}
                    </p>
                    {org?.address && (
                      <p className="text-xs text-slate-500">{org.address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      Contacto comercio
                    </p>
                    {org ? (
                      <>
                        <p className="text-sm text-slate-700">{org.name || ""}</p>
                        <p className="text-xs text-slate-500">
                          {org.contact_email || ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          {org.telefono || org.whatsapp || ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Sin datos de contacto cargados.
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">
              Aun no has solicitado donaciones.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
