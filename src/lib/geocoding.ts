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

const DEFAULT_COUNTRY_CODE = process.env.NEXT_PUBLIC_GEOCODE_COUNTRY_CODE
  ? process.env.NEXT_PUBLIC_GEOCODE_COUNTRY_CODE.trim().toLowerCase()
  : "es";

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
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  if (DEFAULT_COUNTRY_CODE) {
    url.searchParams.set("countrycodes", DEFAULT_COUNTRY_CODE);
  }
  if (address) {
    url.searchParams.set("street", address);
  }
  if (postalCode) {
    url.searchParams.set("postalcode", postalCode);
  }
  if (city) {
    url.searchParams.set("city", city);
  }
  if (region) {
    url.searchParams.set("state", region);
  }
  if (!address && !postalCode && !city && !region) {
    url.searchParams.set("q", query);
  }
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
    class?: string;
    type?: string;
    importance?: number;
  }>;

  const ranked = data
    .map((item) => {
      const category = item.class ?? "";
      const kind = item.type ?? "";
      let score = Number(item.importance ?? 0);

      if (kind === "house" || kind === "building") {
        score += 1.1;
      } else if (kind === "residential" || kind === "street") {
        score += 0.6;
      }

      if (category === "building" || category === "amenity") {
        score += 0.2;
      }

      return {
        lat: Number(item.lat),
        lng: Number(item.lon),
        displayName: item.display_name,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.map(({ lat, lng, displayName }) => ({
    lat,
    lng,
    displayName,
  }));
}
