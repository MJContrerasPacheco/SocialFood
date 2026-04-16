"use client";

import { useActionState, useRef, useState } from "react";
import { searchAddresses, type GeocodeResult } from "@/lib/geocoding";
import { REGIONS } from "@/lib/regions";
import { updateOngProfile, type ProfileState } from "./actions";
import SignatureField from "@/components/SignatureField";
import { useI18n } from "@/components/I18nProvider";

const initialState: ProfileState = {};

type OngProfileFormProps = {
  initialValues?: {
    name?: string | null;
    contact_email?: string | null;
    tax_id?: string | null;
    registry_number?: string | null;
    signature_data_url?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
};

export default function OngProfileForm({ initialValues }: OngProfileFormProps) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    updateOngProfile,
    initialState
  );
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [coords, setCoords] = useState(() => {
    const latValue = Number.isFinite(initialValues?.lat ?? NaN)
      ? Number(initialValues?.lat).toFixed(6)
      : "";
    const lngValue = Number.isFinite(initialValues?.lng ?? NaN)
      ? Number(initialValues?.lng).toFixed(6)
      : "";
    return { lat: latValue, lng: lngValue };
  });
  const addressRef = useRef<HTMLInputElement>(null);
  const postalCodeRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const regionRef = useRef<HTMLSelectElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const applyCoordinates = (lat: number, lng: number) => {
    setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
  };

  const handleUseLocation = () => {
    setGeoStatus(null);
    if (!navigator.geolocation) {
      setGeoStatus(t.profile.geo.notAvailable);
      return;
    }

    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoordinates(position.coords.latitude, position.coords.longitude);
        setGeoStatus(t.profile.geo.appliedCurrent);
        setSuggestions([]);
        setGeoPending(false);
      },
      () => {
        setGeoStatus(t.profile.geo.failed);
        setGeoPending(false);
      }
    );
  };

  const handleGeocode = async () => {
    setGeoStatus(null);
    setGeoPending(true);
    const results = await searchAddresses({
      address: addressRef.current?.value ?? "",
      postalCode: postalCodeRef.current?.value ?? "",
      city: cityRef.current?.value ?? "",
      region: regionRef.current?.value ?? "",
      email: emailRef.current?.value ?? "",
    });

    if (!results.length) {
      setGeoStatus(t.profile.geo.addressNotFound);
      setSuggestions([]);
      setGeoPending(false);
      return;
    }

    if (results.length === 1) {
      const result = results[0];
      applyCoordinates(result.lat, result.lng);
      if (addressRef.current) {
        addressRef.current.value = result.displayName;
      }
      setGeoStatus(t.profile.geo.addressApplied);
      setSuggestions(results);
    } else {
      setGeoStatus(t.profile.geo.selectSuggestion);
      setSuggestions(results);
    }
    setGeoPending(false);
  };

  const handleSelectSuggestion = (result: GeocodeResult) => {
    applyCoordinates(result.lat, result.lng);
    if (addressRef.current) {
      addressRef.current.value = result.displayName;
    }
    setSuggestions([]);
    setGeoStatus(`${t.profile.geo.appliedPrefix} ${result.displayName}`);
  };

  return (
    <form
      action={action}
      className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-1 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t.profile.ong.title}
        </h2>
        <p className="text-sm text-slate-600">
          {t.profile.ong.subtitle}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="name">
            {t.profile.fields.ongName}
          </label>
          <input
            id="name"
            name="name"
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="contact_email"
          >
            {t.profile.fields.contactEmail}
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={initialValues?.contact_email ?? ""}
            ref={emailRef}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="tax_id">
            {t.profile.fields.taxIdOng}
          </label>
          <input
            id="tax_id"
            name="tax_id"
            defaultValue={initialValues?.tax_id ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="registry_number"
          >
            {t.profile.fields.registryNumberOng}
          </label>
          <input
            id="registry_number"
            name="registry_number"
            defaultValue={initialValues?.registry_number ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>
      <SignatureField
        name="signature_data_url"
        label={t.profile.ong.signatureLabel}
        helper={t.profile.ong.signatureHelper}
        initialValue={initialValues?.signature_data_url ?? null}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="telefono">
            {t.profile.fields.phone}
          </label>
          <input
            id="telefono"
            name="telefono"
            defaultValue={initialValues?.telefono ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="whatsapp">
            {t.profile.fields.whatsapp}
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            defaultValue={initialValues?.whatsapp ?? ""}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="address">
          {t.profile.fields.address}
        </label>
        <input
          id="address"
          name="address"
          defaultValue={initialValues?.address ?? ""}
          ref={addressRef}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="city">
            {t.profile.fields.city}
          </label>
          <input
            id="city"
            name="city"
            defaultValue={initialValues?.city ?? ""}
            ref={cityRef}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="region">
            {t.profile.fields.region}
          </label>
          <select
            id="region"
            name="region"
            defaultValue={initialValues?.region ?? ""}
            ref={regionRef}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">{t.profile.fields.regionPlaceholder}</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="postal_code"
          >
            {t.profile.fields.postalCode}
          </label>
          <input
            id="postal_code"
            name="postal_code"
            inputMode="numeric"
            defaultValue={initialValues?.postal_code ?? ""}
            ref={postalCodeRef}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>
      <input type="hidden" id="lat" name="lat" value={coords.lat} readOnly />
      <input type="hidden" id="lng" name="lng" value={coords.lng} readOnly />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:flex-wrap">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={geoPending}
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 btn-glow-soft sm:w-auto"
        >
          {t.profile.geo.useLocation}
        </button>
        <button
          type="button"
          onClick={handleGeocode}
          disabled={geoPending}
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 btn-glow-soft sm:w-auto"
        >
          {t.profile.geo.searchAddress}
        </button>
        {geoStatus && (
          <span className="text-xs text-slate-600">{geoStatus}</span>
        )}
        {coords.lat && coords.lng ? (
          <span className="text-xs font-semibold text-emerald-600">
            {t.profile.geo.coordinatesConfirmed}
          </span>
        ) : null}
      </div>
      {suggestions.length > 0 && (
        <div className="grid gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t.profile.geo.suggestions}
          </p>
          {suggestions.map((result) => (
            <button
              key={`${result.displayName}-${result.lat.toFixed(6)}-${result.lng.toFixed(6)}`}
              type="button"
              onClick={() => handleSelectSuggestion(result)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 btn-glow-soft"
            >
              {result.displayName}
            </button>
          ))}
        </div>
      )}
      {state?.error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 notice-animate">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 notice-animate">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 btn-glow"
      >
        {pending ? t.profile.submit.saving : t.profile.submit.save}
      </button>
    </form>
  );
}