"use client";

import { useActionState } from "react";
import DonationForm from "./DonationForm";
import { updateDonation, type DonationState } from "./actions";

type EditDonationFormProps = {
  donationId: string;
  initialValues: {
    title: string | null;
    kg: number | null;
    category: string | null;
    storage: string | null;
    expires_at: string | null;
    pickup_window: string | null;
    allergens: string | null;
    description: string | null;
    notes: string | null;
  };
};

const initialState: DonationState = {};

export default function EditDonationForm({
  donationId,
  initialValues,
}: EditDonationFormProps) {
  const [state, action, pending] = useActionState(updateDonation, initialState);

  return (
    <DonationForm
      title="Editar excedente"
      subtitle="Solo puedes editar excedentes que aun estan libres."
      submitLabel="Guardar cambios"
      pendingLabel="Guardando..."
      action={action}
      pending={pending}
      state={state}
      initialValues={initialValues}
      donationId={donationId}
      className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up sm:p-6"
    />
  );
}
