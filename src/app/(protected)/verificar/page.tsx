import { DONATION_CERTIFICATES_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n";

type SearchParams = {
  id?: string | string[];
  hash?: string | string[];
};

type CertificateSnapshot = {
  operation_id?: string | null;
  operation_hash?: string | null;
  collected_at?: string | null;
  donation?: {
    title?: string | null;
    kg?: number | null;
    category?: string | null;
    storage?: string | null;
    expires_at?: string | null;
    pickup_window?: string | null;
    allergens?: string | null;
    notes?: string | null;
    created_at?: string | null;
  };
  commerce?: {
    name?: string | null;
    tax_id?: string | null;
    registry_number?: string | null;
    contact_email?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    signature_data_url?: string | null;
  };
  ong?: {
    name?: string | null;
    tax_id?: string | null;
    registry_number?: string | null;
    contact_email?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    signature_data_url?: string | null;
  };
};

type CertificateRecord = {
  operation_id: string;
  operation_hash: string;
  collected_at: string | null;
  snapshot: CertificateSnapshot | null;
  created_at: string | null;
};

const formatDate = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getParam = (value?: string | string[]) => {
  return Array.isArray(value) ? value[0] : value ?? "";
};

export default async function VerificarPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireApprovedRole();
  const supabase = await createServerSupabase();
  const cookieStore = await cookies();
  const t = getTranslations(getLocaleFromCookies(cookieStore));
  const formatDateValue = (value?: string | null) =>
    formatDate(value, t.common.unknown);

  const getCategoryLabel = (value?: string | null) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) {
      return t.common.unknown;
    }
    return t.foodTypes[trimmed as keyof typeof t.foodTypes] ?? trimmed;
  };

  const storageLabels = {
    fresco: t.storage.options.fresco,
    refrigerado: t.storage.options.refrigerado,
    congelado: t.storage.options.congelado,
    seco: t.storage.options.seco,
  } as const;

  const getStorageLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    return storageLabels[value as keyof typeof storageLabels] ?? value;
  };

  const getDonationCategoryLabel = (
    category?: string | null,
    storage?: string | null
  ) => {
    if (category) {
      return getCategoryLabel(category);
    }
    if (storage) {
      return getStorageLabel(storage) ?? storage;
    }
    return t.common.unknown;
  };

  const resolvedParams = (await searchParams) ?? {};
  const operationId = getParam(resolvedParams.id).trim();
  const operationHash = getParam(resolvedParams.hash).trim();

  let certificate: CertificateRecord | null = null;

  if (operationId) {
    const { data } = await supabase
      .from(DONATION_CERTIFICATES_TABLE)
      .select("operation_id, operation_hash, collected_at, snapshot, created_at")
      .eq("operation_id", operationId)
      .single();
    certificate = (data as CertificateRecord | null) ?? null;
  } else if (operationHash) {
    const { data } = await supabase
      .from(DONATION_CERTIFICATES_TABLE)
      .select("operation_id, operation_hash, collected_at, snapshot, created_at")
      .eq("operation_hash", operationHash)
      .single();
    certificate = (data as CertificateRecord | null) ?? null;
  }

  const snapshot = certificate?.snapshot ?? null;
  const donation = snapshot?.donation ?? null;
  const commerce = snapshot?.commerce ?? null;
  const ong = snapshot?.ong ?? null;

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          {t.verification.panelTag}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          {t.verification.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.verification.subtitle}
        </p>
      </section>

      <form className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="id">
              {t.verification.form.idLabel}
            </label>
            <input
              id="id"
              name="id"
              defaultValue={operationId}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="hash"
            >
              {t.verification.form.hashLabel}
            </label>
            <input
              id="hash"
              name="hash"
              defaultValue={operationHash}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-emerald-500 btn-glow"
        >
          {t.verification.form.submit}
        </button>
      </form>

      {certificate ? (
        <section className="grid gap-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700 sm:p-6">
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              {t.verification.validTitle}
            </p>
            <p className="text-sm text-emerald-800">
              {t.verification.validSubtitle}
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">
              {t.verification.section.operation}
            </p>
            <p>{t.verification.fields.id}: {certificate.operation_id}</p>
            <p>{t.verification.fields.hash}: {certificate.operation_hash}</p>
            <p>{t.verification.fields.collected}: {formatDateValue(certificate.collected_at)}</p>
            <p>{t.verification.fields.created}: {formatDateValue(certificate.created_at)}</p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">
              {t.verification.section.establishment}
            </p>
            <p>{commerce?.name || t.common.unknown}</p>
            <p>{t.verification.fields.taxId}: {commerce?.tax_id || t.common.unknown}</p>
            <p>
              {t.verification.fields.registryNumber}: {commerce?.registry_number || t.common.unknown}
            </p>
            <p>
              {commerce?.address || ""} {commerce?.city || ""} {commerce?.region || ""}
            </p>
            <p>
              {t.verification.fields.signatureRegistered}:{" "}
              {commerce?.signature_data_url ? t.common.yes : t.common.no}
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">
              {t.verification.section.ong}
            </p>
            <p>{ong?.name || t.common.unknown}</p>
            <p>{t.verification.fields.taxIdOng}: {ong?.tax_id || t.common.unknown}</p>
            <p>{t.verification.fields.registryOng}: {ong?.registry_number || t.common.unknown}</p>
            <p>
              {ong?.address || ""} {ong?.city || ""} {ong?.region || ""}
            </p>
            <p>
              {t.verification.fields.signatureRegistered}:{" "}
              {ong?.signature_data_url ? t.common.yes : t.common.no}
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">
              {t.verification.section.donation}
            </p>
            <p>{donation?.title || t.verification.surplusLabel}</p>
            <p>{donation?.kg ?? 0} kg</p>
            <p>
              {t.verification.fields.category}:{" "}
              {getDonationCategoryLabel(donation?.category, donation?.storage)}
            </p>
            <p>{t.verification.fields.expiry}: {formatDateValue(donation?.expires_at)}</p>
            <p>
              {t.verification.fields.pickupWindow}:{" "}
              {donation?.pickup_window || t.common.unknown}
            </p>
          </div>
        </section>
      ) : operationId || operationHash ? (
        <section className="rounded-3xl border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-700 sm:p-6">
          {t.verification.notFound}
        </section>
      ) : null}
    </div>
  );
}
