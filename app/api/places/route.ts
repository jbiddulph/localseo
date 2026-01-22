export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  try {
    const apiKey = requireGoogleKey();
    const body = (await request.json()) as {
      postcode?: string;
      query?: string;
      radius_km?: number;
    };
    const postcode = body.postcode?.trim();
    const query = body.query?.trim();
    const radiusKm =
      typeof body.radius_km === "number" && Number.isFinite(body.radius_km)
        ? Math.max(body.radius_km, 0.5)
        : 1.5;

    if (!postcode) {
      return Response.json(
        { error: "Postcode is required." },
        { status: 400 }
      );
    }

    if (!query) {
      return Response.json(
        { error: "Keyword is required." },
        { status: 400 }
      );
    }

    const geocodeUrl = new URL(
      "https://maps.googleapis.com/maps/api/geocode/json"
    );
    geocodeUrl.searchParams.set("address", postcode);
    geocodeUrl.searchParams.set("key", apiKey);

    const geocodeRes = await fetch(geocodeUrl.toString(), { cache: "no-store" });
    const geocodeData = (await geocodeRes.json()) as GeocodeResponse;

    if (geocodeData.status !== "OK" || geocodeData.results.length === 0) {
      return Response.json(
        {
          error: `Geocoding error (${geocodeData.status}): ${
            geocodeData.error_message ||
            "Unable to find coordinates for that postcode."
          }`,
        },
        { status: 400 }
      );
    }

    const location = geocodeData.results[0].geometry.location;
    const radiusMeters = Math.round(radiusKm * 1000);
    const placesUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    );
    placesUrl.searchParams.set("location", `${location.lat},${location.lng}`);
    placesUrl.searchParams.set("radius", String(radiusMeters));
    placesUrl.searchParams.set("keyword", query);
    placesUrl.searchParams.set("key", apiKey);

    const placesRes = await fetch(placesUrl.toString(), { cache: "no-store" });
    const placesData = (await placesRes.json()) as PlacesResponse;

    if (placesData.status !== "OK") {
      return Response.json(
        {
          error: `Places error (${placesData.status}): ${
            placesData.error_message || "Unable to fetch nearby businesses."
          }`,
        },
        { status: 400 }
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

    return Response.json({
      center: location,
      places,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
