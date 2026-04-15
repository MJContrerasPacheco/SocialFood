"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
  DONACIONES_TABLE,
  DONATION_CERTIFICATES_TABLE,
  ORGANIZATIONS_TABLE,
  REQUESTS_TABLE,
  SIGNATURES_BUCKET,
} from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseImageDataUrl } from "@/lib/image-data";

export type ProfileState = {
  error?: string;
  success?: string;
};

import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2).max(140).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  tax_id: z.string().max(80).optional().or(z.literal("")),
  registry_number: z.string().max(80).optional().or(z.literal("")),
  signature_data_url: z.string().max(500000).optional().or(z.literal("")),
  telefono: z.string().max(60).optional().or(z.literal("")),
  whatsapp: z.string().max(60).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  region: z.string().max(120).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
});

const normalizeCoordinate = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const numberValue = Number(trimmed);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  if (Math.abs(numberValue) < 0.0001) {
    return null;
  }
  return numberValue;
};

const buildOperationId = (collectedAt: string) => {
  const dateToken = collectedAt.slice(0, 10).replace(/-/g, "");
  const randomToken = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `SF-${dateToken}-${randomToken}`;
};

const buildOperationHash = (
  operationId: string,
  donationId: string,
  commerceUserId: string,
  ongUserId: string,
  collectedAt: string
) => {
  return crypto
    .createHash("sha256")
    .update(`${operationId}:${donationId}:${commerceUserId}:${ongUserId}:${collectedAt}`)
    .digest("hex")
    .toUpperCase();
};

export async function requestDonation(formData: FormData) {
  const { user } = await requireApprovedRole("ong");
  const donationId = String(formData.get("donacionId") || "");

  if (!donationId) {
    return;
  }

  const supabase = await createServerSupabase();
  const { data: donation } = await supabase
    .from(DONACIONES_TABLE)
    .select("id, status")
    .eq("id", donationId)
    .single();

  if (!donation || donation.status !== "available") {
    return;
  }

  await supabase.from(REQUESTS_TABLE).upsert(
    {
      donation_id: donationId,
      ong_user_id: user.id,
      status: "pending",
    },
    { onConflict: "donation_id,ong_user_id" }
  );

  await supabase
    .from(DONACIONES_TABLE)
    .update({ status: "pending" })
    .eq("id", donationId);

  revalidatePath("/ong");
  revalidatePath("/ong/donaciones");
  revalidatePath("/comercio");
}

export async function confirmDonationCollected(formData: FormData) {
  const { user } = await requireApprovedRole("ong");
  const donationId = String(formData.get("donacionId") || "");

  if (!donationId) {
    return;
  }

  const supabase = await createServerSupabase();

  const { data: donation } = await supabase
    .from(DONACIONES_TABLE)
    .select(
      "id, status, created_at, user_id, title, kg, category, storage, expires_at, pickup_window, allergens, notes"
    )
    .eq("id", donationId)
    .single();

  if (!donation || donation.status !== "pending" || !donation.user_id) {
    return;
  }

  const { data: request } = await supabase
    .from(REQUESTS_TABLE)
    .select("donation_id, ong_user_id")
    .eq("donation_id", donationId)
    .eq("ong_user_id", user.id)
    .single();

  if (!request) {
    return;
  }

  const { data: commerce } = await supabase
    .from(ORGANIZATIONS_TABLE)
    .select(
      "name, contact_email, tax_id, registry_number, signature_data_url, signature_path, telefono, whatsapp, address, city, region, postal_code"
    )
    .eq("user_id", donation.user_id)
    .single();

  const { data: ong } = await supabase
    .from(ORGANIZATIONS_TABLE)
    .select(
      "name, contact_email, tax_id, registry_number, signature_data_url, signature_path, telefono, whatsapp, address, city, region, postal_code"
    )
    .eq("user_id", user.id)
    .single();

  const collectedAt = new Date().toISOString();
  const operationId = buildOperationId(collectedAt);
  const operationHash = buildOperationHash(
    operationId,
    donation.id,
    donation.user_id,
    user.id,
    collectedAt
  );

  const snapshot = {
    operation_id: operationId,
    operation_hash: operationHash,
    collected_at: collectedAt,
    donation: {
      id: donation.id,
      title: donation.title,
      kg: donation.kg,
      category: donation.category,
      storage: donation.storage,
      expires_at: donation.expires_at,
      pickup_window: donation.pickup_window,
      allergens: donation.allergens,
      notes: donation.notes,
      created_at: donation.created_at,
    },
    commerce: {
      name: commerce?.name ?? null,
      contact_email: commerce?.contact_email ?? null,
      tax_id: commerce?.tax_id ?? null,
      registry_number: commerce?.registry_number ?? null,
      signature_data_url: commerce?.signature_data_url ?? null,
      signature_path: commerce?.signature_path ?? null,
      telefono: commerce?.telefono ?? null,
      whatsapp: commerce?.whatsapp ?? null,
      address: commerce?.address ?? null,
      city: commerce?.city ?? null,
      region: commerce?.region ?? null,
      postal_code: commerce?.postal_code ?? null,
    },
    ong: {
      name: ong?.name ?? null,
      contact_email: ong?.contact_email ?? null,
      tax_id: ong?.tax_id ?? null,
      registry_number: ong?.registry_number ?? null,
      signature_data_url: ong?.signature_data_url ?? null,
      signature_path: ong?.signature_path ?? null,
      telefono: ong?.telefono ?? null,
      whatsapp: ong?.whatsapp ?? null,
      address: ong?.address ?? null,
      city: ong?.city ?? null,
      region: ong?.region ?? null,
      postal_code: ong?.postal_code ?? null,
    },
  };

  const { error: updateError } = await supabase
    .from(DONACIONES_TABLE)
    .update({ status: "collected", collected_at: collectedAt })
    .eq("id", donationId);

  if (updateError) {
    return;
  }

  const { error: certificateError } = await supabase
    .from(DONATION_CERTIFICATES_TABLE)
    .insert({
      donation_id: donation.id,
      commerce_user_id: donation.user_id,
      ong_user_id: user.id,
      operation_id: operationId,
      operation_hash: operationHash,
      collected_at: collectedAt,
      snapshot,
    });

  if (certificateError) {
    return;
  }

  revalidatePath("/ong");
  revalidatePath("/ong/donaciones");
  revalidatePath("/comercio");
}

export async function updateOngProfile(
  _: ProfileState,
  formData: FormData
) {
  const { user } = await requireApprovedRole("ong");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    contact_email: formData.get("contact_email"),
    tax_id: formData.get("tax_id"),
    registry_number: formData.get("registry_number"),
    signature_data_url: formData.get("signature_data_url"),
    telefono: formData.get("telefono"),
    whatsapp: formData.get("whatsapp"),
    address: formData.get("address"),
    city: formData.get("city"),
    region: formData.get("region"),
    postal_code: formData.get("postal_code"),
  });

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies ProfileState;
  }

  const resolvedLat = normalizeCoordinate(formData.get("lat"));
  const resolvedLng = normalizeCoordinate(formData.get("lng"));
  const addressValue = parsed.data.address || null;

  if (resolvedLat === null || resolvedLng === null) {
    return {
      error:
        "Confirma la ubicacion con Buscar por direccion o Usar mi ubicacion.",
    } satisfies ProfileState;
  }

  const supabase = await createServerSupabase();
  const { data: existingOrg } = await supabase
    .from(ORGANIZATIONS_TABLE)
    .select("signature_data_url, signature_path")
    .eq("user_id", user.id)
    .single();

  const signatureInput = parsed.data.signature_data_url?.trim() || "";
  let signatureDataUrl = signatureInput || null;
  let signaturePath = existingOrg?.signature_path ?? null;

  if (!signatureInput) {
    signatureDataUrl = null;
    signaturePath = null;
  } else if (signatureInput !== existingOrg?.signature_data_url) {
    const parsedSignature = parseImageDataUrl(signatureInput);
    if (!parsedSignature) {
      return { error: "Firma invalida" } satisfies ProfileState;
    }
    const extension = parsedSignature.mime === "image/png" ? "png" : "jpg";
    const signatureName = `${user.id}/${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(SIGNATURES_BUCKET)
      .upload(signatureName, parsedSignature.bytes, {
        contentType: parsedSignature.mime,
        upsert: true,
      });

    if (uploadError) {
      return { error: "No se pudo guardar la firma" } satisfies ProfileState;
    }
    signaturePath = signatureName;
  }
  const { error } = await supabase.from(ORGANIZATIONS_TABLE).upsert(
    {
      user_id: user.id,
      role: "ong",
      name: parsed.data.name || null,
      contact_email: parsed.data.contact_email || null,
      tax_id: parsed.data.tax_id || null,
      registry_number: parsed.data.registry_number || null,
      signature_data_url: signatureDataUrl,
      signature_path: signaturePath,
      telefono: parsed.data.telefono || null,
      whatsapp: parsed.data.whatsapp || null,
      address: addressValue,
      city: parsed.data.city || null,
      region: parsed.data.region || null,
      postal_code: parsed.data.postal_code || null,
      lat: resolvedLat,
      lng: resolvedLng,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return {
      error: error.message || "No se pudo guardar el perfil",
    } satisfies ProfileState;
  }

  revalidatePath("/ong");
  revalidatePath("/ong/configuracion");
  return { success: "Perfil actualizado" } satisfies ProfileState;
}
