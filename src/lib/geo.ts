export function haversineKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;

  const dLat = toRad(destLat - originLat);
  const dLng = toRad(destLng - originLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(originLat)) *
      Math.cos(toRad(destLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}
