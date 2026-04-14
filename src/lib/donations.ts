export const DONATION_STATUS_LABELS = {
  available: "Libre",
  pending: "Pendiente",
  assigned: "Pendiente",
  collected: "Recogido",
} as const;

type DonationStatus = keyof typeof DONATION_STATUS_LABELS;

export function formatDonationStatus(status?: string | null): string {
  if (!status) {
    return "Desconocido";
  }

  if (status in DONATION_STATUS_LABELS) {
    return DONATION_STATUS_LABELS[status as DonationStatus];
  }

  return status;
}
