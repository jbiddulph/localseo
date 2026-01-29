import { fetchPlacesByPostcode } from "@/app/lib/google/places";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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
    const { center, places } = await fetchPlacesByPostcode({
      postcode,
      keyword: query,
      radiusKm,
    });

    return Response.json({
      center,
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
