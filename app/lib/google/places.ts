type PlacesResponse = {
  results: Array<{
    name: string;
    place_id: string;
    rating?: number;
    user_ratings_total?: number;
    vicinity?: string;
    geometry: { location: { lat: number; lng: number } };
  }>;
  status: string;
  error_message?: string;
};

type GeocodeResponse = {
  results: Array<{
    geometry: { location: { lat: number; lng: number } };
    formatted_address: string;
  }>;
  status: string;
  error_message?: string;
};

function requireGoogleKey() {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API;

  if (!apiKey) {
    throw new Error(
      "Missing Google API key. Set GOOGLE_MAPS_API_KEY (preferred)."
    );
  }
  return apiKey;
}

export async function fetchPlacesByPostcode(params: {
  postcode: string;
  keyword: string;
  radiusKm: number;
}) {
  const apiKey = requireGoogleKey();
  const geocodeUrl = new URL(
    "https://maps.googleapis.com/maps/api/geocode/json"
  );
  geocodeUrl.searchParams.set("address", params.postcode);
  geocodeUrl.searchParams.set("key", apiKey);

  const geocodeRes = await fetch(geocodeUrl.toString(), { cache: "no-store" });
  const geocodeData = (await geocodeRes.json()) as GeocodeResponse;

  if (geocodeData.status !== "OK" || geocodeData.results.length === 0) {
    throw new Error(
      `Geocoding error (${geocodeData.status}): ${
        geocodeData.error_message ||
        "Unable to find coordinates for that postcode."
      }`
    );
  }

  const location = geocodeData.results[0].geometry.location;
  const radiusMeters = Math.round(Math.max(params.radiusKm, 0.5) * 1000);
  const placesUrl = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
  );
  placesUrl.searchParams.set("location", `${location.lat},${location.lng}`);
  placesUrl.searchParams.set("radius", String(radiusMeters));
  placesUrl.searchParams.set("keyword", params.keyword);
  placesUrl.searchParams.set("key", apiKey);

  const placesRes = await fetch(placesUrl.toString(), { cache: "no-store" });
  const placesData = (await placesRes.json()) as PlacesResponse;

  if (placesData.status !== "OK") {
    throw new Error(
      `Places error (${placesData.status}): ${
        placesData.error_message || "Unable to fetch nearby businesses."
      }`
    );
  }

  const places = placesData.results.map((place) => ({
    name: place.name,
    place_id: place.place_id,
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    vicinity: place.vicinity,
    location: place.geometry.location,
  }));

  return { center: location, places };
}
