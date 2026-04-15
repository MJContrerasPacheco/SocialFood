import { DONATION_CERTIFICATES_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

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

const formatDate = (value?: string | null) => {
  if (!value) {
    return "No informado";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No informado";
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

  const resolvedParams = (await searchParams) ?? {};
  const operationId = getParam(resolvedParams.id).trim();
  const operationHash = getParam(resolvedParams.hash).trim();

  let certificate: {
    operation_id: string;
    operation_hash: string;
    collected_at: string | null;
    snapshot: CertificateSnapshot | null;
    created_at: string | null;
  } | null = null;

  if (operationId) {
    const { data } = await supabase
      .from(DONATION_CERTIFICATES_TABLE)
      .select("operation_id, operation_hash, collected_at, snapshot, created_at")
      .eq("operation_id", operationId)
      .single();
    certificate = (data as typeof certificate) ?? null;
  } else if (operationHash) {
    const { data } = await supabase
      .from(DONATION_CERTIFICATES_TABLE)
      .select("operation_id, operation_hash, collected_at, snapshot, created_at")
      .eq("operation_hash", operationHash)
      .single();
    certificate = (data as typeof certificate) ?? null;
  }

  const snapshot = (certificate?.snapshot as CertificateSnapshot | null) ?? null;
  const donation = snapshot?.donation ?? null;
  const commerce = snapshot?.commerce ?? null;
  const ong = snapshot?.ong ?? null;

  return (
    <div className="grid gap-6 sm:gap-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Verificacion
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
          Verifica un certificado
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Introduce el ID de operacion o el hash para ver los datos originales.
        </p>
      </section>

      <form className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="id">
              ID de operacion
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
              Hash verificable
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
          Verificar
        </button>
      </form>

      {certificate ? (
        <section className="grid gap-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700 sm:p-6">
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Certificado valido
            </p>
            <p className="text-sm text-emerald-800">
              Datos originales registrados en SocialFood.
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">Operacion</p>
            <p>ID: {certificate.operation_id}</p>
            <p>Hash: {certificate.operation_hash}</p>
            <p>Recogida: {formatDate(certificate.collected_at)}</p>
            <p>Registro: {formatDate(certificate.created_at)}</p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">Establecimiento</p>
            <p>{commerce?.name || "No informado"}</p>
            <p>CIF/NIF: {commerce?.tax_id || "No informado"}</p>
            <p>Registro sanitario: {commerce?.registry_number || "No informado"}</p>
            <p>
              {commerce?.address || ""} {commerce?.city || ""} {commerce?.region || ""}
            </p>
            <p>
              Firma registrada: {commerce?.signature_data_url ? "Si" : "No"}
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">ONG receptora</p>
            <p>{ong?.name || "No informado"}</p>
            <p>CIF: {ong?.tax_id || "No informado"}</p>
            <p>Registro: {ong?.registry_number || "No informado"}</p>
            <p>
              {ong?.address || ""} {ong?.city || ""} {ong?.region || ""}
            </p>
            <p>Firma registrada: {ong?.signature_data_url ? "Si" : "No"}</p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase text-slate-400">Detalle donacion</p>
            <p>{donation?.title || "Excedente"}</p>
            <p>{donation?.kg ?? 0} kg</p>
            <p>
              Categoria: {donation?.category || donation?.storage || "No informado"}
            </p>
            <p>Caducidad: {formatDate(donation?.expires_at)}</p>
            <p>Ventana de recogida: {donation?.pickup_window || "No informado"}</p>
          </div>
        </section>
      ) : operationId || operationHash ? (
        <section className="rounded-3xl border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-700 sm:p-6">
          No se encontro ningun certificado con esos datos.
        </section>
      ) : null}
    </div>
  );
}
