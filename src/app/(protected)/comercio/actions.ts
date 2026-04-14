"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { DONACIONES_TABLE, ORGANIZATIONS_TABLE } from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocoding";

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
  description: z.string().max(600).optional(),
  kg: z.coerce.number().positive(),
});

const profileSchema = z.object({
  name: z.string().min(2).max(140).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().max(60).optional().or(z.literal("")),
  whatsapp: z.string().max(60).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  region: z.string().max(120).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  lat: z.coerce.number().optional().or(z.nan()),
  lng: z.coerce.number().optional().or(z.nan()),
});

export async function createDonation(
  _: DonationState,
  formData: FormData
) {
  const { user } = await requireApprovedRole("comercio");

  const parsed = donationSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    kg: formData.get("kg"),
  });

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies DonationState;
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from(DONACIONES_TABLE).insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    kg: parsed.data.kg,
    status: "available",
  });

  if (error) {
    return { error: "No se pudo crear la donacion" } satisfies DonationState;
  }

  revalidatePath("/comercio");
  return { success: "Donacion creada" } satisfies DonationState;
}

export async function updateCommerceProfile(
  _: ProfileState,
  formData: FormData
) {
  const { user } = await requireApprovedRole("comercio");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    contact_email: formData.get("contact_email"),
    telefono: formData.get("telefono"),
    whatsapp: formData.get("whatsapp"),
    address: formData.get("address"),
    city: formData.get("city"),
    region: formData.get("region"),
    postal_code: formData.get("postal_code"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });

  if (!parsed.success) {
    return { error: "Datos invalidos" } satisfies ProfileState;
  }

  const lat = Number.isFinite(parsed.data.lat) ? parsed.data.lat : null;
  const lng = Number.isFinite(parsed.data.lng) ? parsed.data.lng : null;
  let addressValue = parsed.data.address || null;
  let resolvedLat = lat;
  let resolvedLng = lng;

  if (
    resolvedLat === null &&
    resolvedLng === null &&
    (parsed.data.address || parsed.data.city || parsed.data.region)
  ) {
    const geocoded = await geocodeAddress({
      address: parsed.data.address,
      postalCode: parsed.data.postal_code,
      city: parsed.data.city,
      region: parsed.data.region,
      email: parsed.data.contact_email,
    });

    if (geocoded) {
      resolvedLat = geocoded.lat;
      resolvedLng = geocoded.lng;
      if (!addressValue) {
        addressValue = geocoded.displayName;
      }
    }
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from(ORGANIZATIONS_TABLE).upsert(
    {
      user_id: user.id,
      role: "comercio",
      name: parsed.data.name || null,
      contact_email: parsed.data.contact_email || null,
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
    .update({ status: "collected" })
    .eq("id", donationId)
    .eq("user_id", user.id);

  revalidatePath("/comercio");
  revalidatePath("/ong");
}
