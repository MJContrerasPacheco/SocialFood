"use server";

import { revalidatePath } from "next/cache";
import {
  DONACIONES_TABLE,
  ORGANIZATIONS_TABLE,
  REQUESTS_TABLE,
} from "@/lib/constants";
import { requireApprovedRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocoding";

export type ProfileState = {
  error?: string;
  success?: string;
};

import { z } from "zod";

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
      role: "ong",
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

  revalidatePath("/ong");
  return { success: "Perfil actualizado" } satisfies ProfileState;
}
