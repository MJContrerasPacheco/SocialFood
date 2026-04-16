"use client";

import { useMemo, useState } from "react";
import OngProfileForm from "./OngProfileForm";
import OngMap from "./OngMap";
import { haversineKm, hasValidCoordinates, normalizeCoordinate } from "@/lib/geo";
import { formatDonationStatus } from "@/lib/donations";
import { useI18n } from "@/components/I18nProvider";

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
  const { t } = useI18n();
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

  const ongLat = normalizeCoordinate(ongOrganization?.lat ?? null);
  const ongLng = normalizeCoordinate(ongOrganization?.lng ?? null);
  const ongCity = ongOrganization?.city?.toLowerCase() ?? null;
  const ongRegion = ongOrganization?.region?.toLowerCase() ?? null;
  const defaultScope: "city" | "region" | "all" = ongCity
    ? "city"
    : ongRegion
      ? "region"
      : "all";
  const [scopeMode, setScopeMode] = useState<"city" | "region" | "all">(
    defaultScope
  );
  const effectiveScope = useMemo(() => {
    if (scopeMode === "city" && ongCity) {
      return "city";
    }
    if (scopeMode === "region" && ongRegion) {
      return "region";
    }
    if (scopeMode === "all") {
      return "all";
    }
    if (ongCity) {
      return "city";
    }
    if (ongRegion) {
      return "region";
    }
    return "all";
  }, [ongCity, ongRegion, scopeMode]);
  const isRegionLimited = effectiveScope !== "all";
  const scopeOptions = [
    { value: "city", label: t.ong.dashboard.scopeOptions.city, enabled: Boolean(ongCity) },
    { value: "region", label: t.ong.dashboard.scopeOptions.region, enabled: Boolean(ongRegion) },
    { value: "all", label: t.ong.dashboard.scopeOptions.all, enabled: true },
  ] as const;
  const renderScopeControls = () => (
    <div className="flex flex-wrap items-center gap-2">
      {scopeOptions.map((option) => {
        const isActive = effectiveScope === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={!option.enabled}
            onClick={() => setScopeMode(option.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            } ${option.enabled ? "btn-glow-soft" : "opacity-50 cursor-not-allowed"}`}
          >
            {option.value === "city" && ongOrganization?.city
              ? `${t.ong.dashboard.scopeCityPrefix} ${ongOrganization.city}`
              : option.value === "region" && ongOrganization?.region
                ? `${t.ong.dashboard.scopeRegionPrefix} ${ongOrganization.region}`
                : option.label}
          </button>
        );
      })}
    </div>
  );

  const donationList = useMemo(() => {
    return donations
      .map((donation) => {
        const org = donation.user_id ? orgPublicMap.get(donation.user_id) : null;
        const distanceKm =
          org && hasValidCoordinates(ongLat, ongLng) && hasValidCoordinates(org.lat, org.lng)
            ? haversineKm(
                ongLat as number,
                ongLng as number,
                org.lat as number,
                org.lng as number
              )
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

  const visibleDonationList = useMemo(() => {
    if (!isRegionLimited) {
      return donationList;
    }
    return donationList.filter(
      (item) =>
        effectiveScope === "city"
          ? item.org?.city?.toLowerCase() === ongCity
          : item.org?.region?.toLowerCase() === ongRegion
    );
  }, [donationList, effectiveScope, isRegionLimited, ongCity, ongRegion]);

  const requestedDonationIds = useMemo(() => {
    return new Set(requestedDonations.map((donation) => donation.id));
  }, [requestedDonations]);

  const fallbackDonationId =
    initialSelectedDonationId ??
    requestedDonations[0]?.id ??
    visibleDonationList[0]?.donation.id ??
    null;

  const preferredDonationId = initialSelectedDonationId ?? selectedDonationId;
  const preferredDonationExists = preferredDonationId
    ? requestedDonationIds.has(preferredDonationId) ||
      visibleDonationList.some(
        (item) => item.donation.id === preferredDonationId
      )
    : false;
  const effectiveSelectedDonationId = preferredDonationExists
    ? preferredDonationId
    : fallbackDonationId;

  const selectedAvailableItem = visibleDonationList.find(
    (item) => item.donation.id === effectiveSelectedDonationId
  );
  const selectedRequestedDonation = effectiveSelectedDonationId
    ? requestedDonationMap.get(effectiveSelectedDonationId) ?? null
    : null;
  const selectedDonation =
    selectedAvailableItem?.donation ?? selectedRequestedDonation ?? null;
  const selectedOrgPublic =
    selectedAvailableItem?.org ??
    (selectedDonation?.user_id ? orgPublicMap.get(selectedDonation.user_id) : null);
  const selectedContactOrg = selectedDonation?.user_id
    ? requestedOrgMap.get(selectedDonation.user_id) ?? null
    : null;
  const isSelectedRequested = effectiveSelectedDonationId
    ? requestedDonationIds.has(effectiveSelectedDonationId)
    : false;

  const scopedOrgs = useMemo(() => {
    if (!isRegionLimited) {
      return orgsPublic;
    }
    return orgsPublic.filter(
      (org) =>
        effectiveScope === "city"
          ? org.city?.toLowerCase() === ongCity
          : org.region?.toLowerCase() === ongRegion
    );
  }, [effectiveScope, isRegionLimited, ongCity, ongRegion, orgsPublic]);

  const markerOrgs = (() => {
    const map = new Map(scopedOrgs.map((org) => [org.user_id, org]));
    if (selectedOrgPublic && !map.has(selectedOrgPublic.user_id)) {
      map.set(selectedOrgPublic.user_id, selectedOrgPublic);
    }
    return Array.from(map.values());
  })();

  const mapMarkers = markerOrgs
    .filter((org) => hasValidCoordinates(org.lat, org.lng))
    .map((org) => ({
      id: org.user_id,
      title: org.name || t.ong.donations.commerceLabel,
      lat: org.lat as number,
      lng: org.lng as number,
    }));

  const missingMarkersCount = useMemo(() => {
    return scopedOrgs.filter((org) => !hasValidCoordinates(org.lat, org.lng))
      .length;
  }, [scopedOrgs]);

  const selectedMarkerId =
    selectedOrgPublic?.user_id ?? selectedDonation?.user_id ?? null;

  const formatDistanceToOng = (distanceKm: number) =>
    t.ong.dashboard.distanceToOng.replace(
      "{distance}",
      distanceKm.toFixed(1)
    );

  return (
    <div className="grid gap-6 sm:gap-8">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <OngProfileForm initialValues={ongOrganization ?? undefined} />
        <div className="rounded-3xl border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-2 sm:p-4">
          <div className="flex flex-col gap-2 px-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t.ong.dashboard.scopeTitle}
            </p>
            {renderScopeControls()}
          </div>
          <OngMap
            centerLat={ongLat}
            centerLng={ongLng}
            markers={mapMarkers}
            selectedMarkerId={selectedMarkerId}
          />
          {!hasValidCoordinates(ongLat, ongLng) ? (
            <p className="mt-3 text-xs text-slate-500">
              {t.ong.dashboard.mapMissingLocation}
            </p>
          ) : null}
          {missingMarkersCount > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              {missingMarkersCount} {t.ong.dashboard.mapMissingMarkers}
            </p>
          ) : null}
        </div>
      </div>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-3 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.ong.dashboard.availableTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {isRegionLimited ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 badge-animate">
                {visibleDonationList.length} {t.ong.dashboard.availableInZone}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 badge-animate">
                {visibleDonationList.length} {t.ong.dashboard.availableOptions}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:gap-4">
          {visibleDonationList.length > 0 ? (
            visibleDonationList.map(({ donation, org, distanceKm }, index) => {
              const isSelected = donation.id === effectiveSelectedDonationId;
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
                  className={`grid gap-3 rounded-2xl border p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr_auto] card-animate animate-fade-up ${
                    isSelected
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-100 bg-white"
                  }`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {donation.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.ong.dashboard.publishedLabel}: {donation.created_at?.slice(0, 10)}
                    </p>
                    {org?.city && (
                      <p className="text-xs text-slate-500">
                        {org.city} {org.region ? `· ${org.region}` : ""}
                      </p>
                    )}
                    {distanceKm !== null && (
                      <p className="text-xs text-emerald-600">
                        {formatDistanceToOng(distanceKm)}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {t.ong.dashboard.statusLabel}: {formatDonationStatus(donation.status, t.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">{t.common.quantity}</p>
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
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white btn-glow"
                    >
                      {t.ong.donations.requestAction}
                    </button>
                  </form>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
              <p>{t.ong.dashboard.emptyInZone}</p>
              {effectiveScope !== "all" ? (
                <button
                  type="button"
                  onClick={() => setScopeMode("all")}
                  className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 btn-glow-soft"
                >
                  {t.ong.dashboard.expandAllSpain}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {t.ong.dashboard.detailTitle}
        </h2>
        {selectedDonation ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900">
                {selectedDonation.title}
              </p>
              <p className="text-xs text-slate-500">
                {selectedDonation.kg} kg · {formatDonationStatus(selectedDonation.status, t.status)}
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
                    {t.ong.dashboard.contactTitle}
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
                      {t.ong.dashboard.contactMissing}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  {t.ong.dashboard.contactRequestPrompt}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            {t.ong.dashboard.detailSelectPrompt}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.ong.dashboard.requestsTitle}
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 badge-animate">
            {requestedDonations.length} {t.ong.dashboard.requestsLabel}
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {requestedDonations.length > 0 ? (
            requestedDonations.map((donation, index) => {
              const org = donation.user_id
                ? requestedOrgMap.get(donation.user_id)
                : null;
              const isSelected = donation.id === effectiveSelectedDonationId;
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
                  className={`grid gap-3 rounded-2xl border p-4 text-sm text-slate-700 sm:grid-cols-[1.4fr_0.6fr] card-animate animate-fade-up ${
                    isSelected
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-100 bg-white"
                  }`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {donation.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {donation.kg} kg · {formatDonationStatus(donation.status, t.status)}
                    </p>
                    {org?.address && (
                      <p className="text-xs text-slate-500">{org.address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      {t.ong.dashboard.contactTitle}
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
                        {t.ong.dashboard.contactMissingData}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">
              {t.ong.dashboard.requestsEmpty}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
