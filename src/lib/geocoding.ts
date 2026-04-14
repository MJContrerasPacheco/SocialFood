export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

type GeocodeParams = {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
  email?: string | null;
};

export async function geocodeAddress({
  address,
  postalCode,
  city,
  region,
  email,
}: GeocodeParams): Promise<GeocodeResult | null> {
  const results = await searchAddresses({
    address,
    postalCode,
    city,
    region,
    email,
  });
  return results[0] ?? null;
}

export async function searchAddresses({
  address,
  postalCode,
  city,
  region,
  email,
}: GeocodeParams): Promise<GeocodeResult[]> {
  const query = [address, postalCode, city, region]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (!query) {
    return [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", query);
  url.searchParams.set("addressdetails", "1");
  if (email) {
    url.searchParams.set("email", email);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "es",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  return data.map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lon),
    displayName: item.display_name,
  }));
}
