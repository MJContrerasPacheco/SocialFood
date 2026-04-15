"use client";

import { useActionState } from "react";
import DonationForm from "./DonationForm";
import { createDonation, type DonationState } from "./actions";

const initialState: DonationState = {};

export default function CreateDonationForm() {
  const [state, action, pending] = useActionState(createDonation, initialState);

  return (
    <DonationForm
      title="Nueva donacion"
      subtitle="Publica excedentes con detalles, estado y ventana de recogida."
      submitLabel="Publicar donacion"
      pendingLabel="Publicando..."
      action={action}
      pending={pending}
      state={state}
      className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur animate-fade-up-delay-1 sm:p-6"
    />
  );
}
