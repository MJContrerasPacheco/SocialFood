"use server";

import { z } from "zod";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import {
  DONACIONES_TABLE,
  ORGANIZATIONS_TABLE,
  SIGNATURES_BUCKET,
} from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseImageDataUrl } from "@/lib/image-data";

export type DonationState = {
  error?: string;
  success?: string;
};

export type ProfileState = {
  error?: string;
  success?: string;
};

const donationSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(600).optional().or(z.literal("")),
  kg: z.coerce.number().positive(),
  category: z.string().max(120).optional().or(z.literal("")),
  storage: z.string().max(40).optional().or(z.literal("")),
  expires_at: z.string().max(20).optional().or(z.literal("")),
  pickup_window: z.string().max(120).optional().or(z.literal("")),
  allergens: z.string().max(160).optional().or(z.literal("")),
  notes: z.string().max(240).optional().or(z.literal("")),
});

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

const getTextValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function createDonation(
  _: DonationState,
  formData: FormData
) {
  const { user } = await requireApprovedRole("comercio");

  const parsed = donationSchema.safeParse({
    title: getTextValue(formData, "title"),
    description: getTextValue(formData, "description"),
    kg: formData.get("kg"),
    category: getTextValue(formData, "category"),
    storage: getTextValue(formData, "storage"),
    expires_at: getTextValue(formData, "expires_at"),
    pickup_window: getTextValue(formData, "pickup_window"),
    allergens: getTextValue(formData, "allergens"),
    notes: getTextValue(formData, "notes"),
  });

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies DonationState;
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from(DONACIONES_TABLE).insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description?.trim() || null,
    kg: parsed.data.kg,
    category: parsed.data.category || null,
    storage: parsed.data.storage || null,
    expires_at: parsed.data.expires_at || null,
    pickup_window: parsed.data.pickup_window || null,
    allergens: parsed.data.allergens || null,
    notes: parsed.data.notes || null,
    status: "available",
  });

  if (error) {
    return { error: "No se pudo crear la donacion" } satisfies DonationState;
  }

  revalidatePath("/comercio");
  revalidatePath("/comercio/excedentes");
  return { success: "Donacion creada" } satisfies DonationState;
}

export async function updateDonation(
  _: DonationState,
  formData: FormData
) {
  const { user } = await requireApprovedRole("comercio");
  const donationId = String(formData.get("donacionId") || "");

  if (!donationId) {
    return { error: "Falta el identificador de la donacion" } satisfies DonationState;
  }

  const parsed = donationSchema.safeParse({
    title: getTextValue(formData, "title"),
    description: getTextValue(formData, "description"),
    kg: formData.get("kg"),
    category: getTextValue(formData, "category"),
    storage: getTextValue(formData, "storage"),
    expires_at: getTextValue(formData, "expires_at"),
    pickup_window: getTextValue(formData, "pickup_window"),
    allergens: getTextValue(formData, "allergens"),
    notes: getTextValue(formData, "notes"),
  });

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies DonationState;
  }

  const supabase = await createServerSupabase();
  const { data: donation } = await supabase
    .from(DONACIONES_TABLE)
    .select("id, status")
    .eq("id", donationId)
    .eq("user_id", user.id)
    .single();

  if (!donation) {
    return { error: "No se encontro la donacion" } satisfies DonationState;
  }

  if (donation.status !== "available") {
    return {
      error: "Solo puedes editar excedentes que estan libres",
    } satisfies DonationState;
  }

  const { error } = await supabase
    .from(DONACIONES_TABLE)
    .update({
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      kg: parsed.data.kg,
      category: parsed.data.category || null,
      storage: parsed.data.storage || null,
      expires_at: parsed.data.expires_at || null,
      pickup_window: parsed.data.pickup_window || null,
      allergens: parsed.data.allergens || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", donationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "No se pudo actualizar la donacion" } satisfies DonationState;
  }

  revalidatePath("/comercio");
  revalidatePath("/comercio/excedentes");
  return { success: "Donacion actualizada" } satisfies DonationState;
}

export async function deleteDonation(formData: FormData) {
  const { user } = await requireApprovedRole("comercio");
  const donationId = String(formData.get("donacionId") || "");

  if (!donationId) {
    return;
  }

  const supabase = await createServerSupabase();
  const { data: donation } = await supabase
    .from(DONACIONES_TABLE)
    .select("id, status")
    .eq("id", donationId)
    .eq("user_id", user.id)
    .single();

  if (!donation || donation.status !== "available") {
    return;
  }

  await supabase
    .from(DONACIONES_TABLE)
    .delete()
    .eq("id", donationId)
    .eq("user_id", user.id);

  revalidatePath("/comercio");
  revalidatePath("/comercio/excedentes");
}

export async function updateCommerceProfile(
  _: ProfileState,
  formData: FormData
) {
  const { user } = await requireApprovedRole("comercio");
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
      role: "comercio",
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

  revalidatePath("/comercio");
  return { success: "Perfil actualizado" } satisfies ProfileState;
}

export async function markDonationCollected(formData: FormData) {
  const { user } = await requireApprovedRole("comercio");
  const donationId = String(formData.get("donacionId") || "");

  if (!donationId) {
    return;
  }

  const supabase = await createServerSupabase();
  const { data: donation } = await supabase
    .from(DONACIONES_TABLE)
    .select("id, status")
    .eq("id", donationId)
    .eq("user_id", user.id)
    .single();

  if (!donation || donation.status !== "pending") {
    return;
  }

  await supabase
    .from(DONACIONES_TABLE)
    .update({ status: "collected", collected_at: new Date().toISOString() })
    .eq("id", donationId)
    .eq("user_id", user.id);

  revalidatePath("/comercio");
  revalidatePath("/ong");
}
