export type DonationStatusLabels = {
  available: string;
  pending: string;
  assigned: string;
  collected: string;
  unknown: string;
};

export const DEFAULT_DONATION_STATUS_LABELS: DonationStatusLabels = {
  available: "Libre",
  pending: "Pendiente",
  assigned: "Pendiente",
  collected: "Recogido",
  unknown: "Desconocido",
};

type DonationStatus = keyof Omit<DonationStatusLabels, "unknown">;

export function formatDonationStatus(
  status?: string | null,
  labels: DonationStatusLabels = DEFAULT_DONATION_STATUS_LABELS
): string {
  if (!status) {
    return labels.unknown;
  }

  if (status in labels) {
    return labels[status as DonationStatus];
  }

  return status;
}
