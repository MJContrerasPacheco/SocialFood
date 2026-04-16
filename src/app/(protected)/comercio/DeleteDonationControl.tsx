"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteDonation } from "./actions";
import { useI18n } from "@/components/I18nProvider";

type DeleteDonationControlProps = {
  donationId: string;
};

function DeleteSubmitButton() {
  const { t } = useI18n();
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 btn-glow-soft disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? t.deleteDonation.deleting : t.deleteDonation.confirm}
    </button>
  );
}

export default function DeleteDonationControl({
  donationId,
}: DeleteDonationControlProps) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 btn-glow-soft"
      >
        {t.deleteDonation.delete}
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
        {t.deleteDonation.cancel}
      </button>
    </div>
  );
}
