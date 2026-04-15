"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteDonation } from "./actions";

type DeleteDonationControlProps = {
  donationId: string;
};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 btn-glow-soft disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Eliminando..." : "Confirmar eliminar"}
    </button>
  );
}

export default function DeleteDonationControl({
  donationId,
}: DeleteDonationControlProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 btn-glow-soft"
      >
        Eliminar
      </button>
    );
  }

  return (
    <div className="grid gap-2 animate-fade-up">
      <form action={deleteDonation}>
        <input type="hidden" name="donacionId" value={donationId} />
        <DeleteSubmitButton />
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 btn-glow-soft"
      >
        Cancelar
      </button>
    </div>
  );
}
