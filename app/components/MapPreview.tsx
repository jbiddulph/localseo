"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

type PlaceResult = {
  name: string;
  place_id: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  location: { lat: number; lng: number };
};

const fallbackLocations: PlaceResult[] = [
  {
    name: "BrightSmile Dental",
    place_id: "sample-1",
    rating: 4.7,
    user_ratings_total: 210,
    vicinity: "Soho",
    location: { lng: -0.1411, lat: 51.5166 },
  },
  {
    name: "Riverside Dental",
    place_id: "sample-2",
    rating: 4.4,
    user_ratings_total: 132,
    vicinity: "Waterloo",
    location: { lng: -0.128, lat: 51.5077 },
  },
  {
    name: "City Dental Lab",
    place_id: "sample-3",
    rating: 4.6,
    user_ratings_total: 98,
    vicinity: "Holborn",
    location: { lng: -0.1145, lat: 51.513 },
  },
];

export default function MapPreview() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_KEY;

  const [postcode, setPostcode] = useState("SW1A 1AA");
  const [query, setQuery] = useState("dentist");
  const [places, setPlaces] = useState<PlaceResult[]>(fallbackLocations);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const center = useMemo(() => {
    if (places.length === 0) {
      return [-0.1276, 51.5072] as [number, number];
    }
    const first = places[0];
    return [first.location.lng, first.location.lat] as [number, number];
  }, [places]);

  useEffect(() => {
    if (!token || !mapContainer.current) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: 12.2,
      pitch: 45,
      bearing: -12,
      antialias: true,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    return () => {
      map.remove();
    };
  }, [token]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const map = mapRef.current;
    const bounds = new mapboxgl.LngLatBounds();

    places.forEach((place, index) => {
      const markerEl = document.createElement("div");
      markerEl.style.width = "12px";
      markerEl.style.height = "12px";
      markerEl.style.borderRadius = "999px";
      markerEl.style.backgroundColor = index === 0 ? "#f6c561" : "#7bd9b1";
      markerEl.style.boxShadow =
        index === 0
          ? "0 0 0 6px rgba(246, 197, 97, 0.2)"
          : "0 0 0 6px rgba(123, 217, 177, 0.2)";

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([place.location.lng, place.location.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setText(place.name))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([place.location.lng, place.location.lat]);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, duration: 800 });
    } else {
      map.setCenter(center);
    }
  }, [places, center]);

  const handleSearch = async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode, query }),
      });

      const payload = (await response.json()) as {
        places?: PlaceResult[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error || "Unable to fetch businesses for that postcode."
        );
      }

      const placesResult = payload.places ?? [];
      setPlaces(placesResult.length ? placesResult : []);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  };

  if (!token) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 p-8 text-center text-sm text-amber-900">
        Add `NEXT_PUBLIC_MAPBOX_PUBLIC_KEY` to `local-seo/.env.local` to load the
        live map preview.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/80 p-3 text-xs shadow-sm">
        <input
          value={postcode}
          onChange={(event) => setPostcode(event.target.value)}
          placeholder="Enter postcode"
          className="w-full rounded-full border border-transparent bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[#101018]/20 sm:w-[180px]"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Business type"
          className="w-full rounded-full border border-transparent bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[#101018]/20 sm:w-[160px]"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={status === "loading"}
          className="rounded-full bg-[#101018] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {status === "loading" ? "Finding..." : "Find businesses"}
        </button>
        {status === "error" && errorMessage ? (
          <span className="text-xs font-semibold text-[#8b2f1b]">
            {errorMessage}
          </span>
        ) : null}
      </div>

      <div className="relative h-full min-h-[280px] overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.3)]">
        <div className="absolute left-4 top-4 z-10 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
          Live Maps Preview
        </div>
        <div ref={mapContainer} className="h-full min-h-[280px] w-full" />
      </div>

      <div className="grid gap-2 text-xs text-[#4f4a3d] sm:grid-cols-2">
        {places.map((place) => (
          <div
            key={place.place_id}
            className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2"
          >
            <p className="font-semibold text-[#101018]">{place.name}</p>
            <p>
              {place.rating ? `Rating ${place.rating} · ` : ""}
              {place.vicinity ?? "Area match"}
            </p>
          </div>
        ))}
        {places.length === 0 && (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2 text-center text-amber-900">
            No businesses returned. Try a wider query or postcode.
          </div>
        )}
      </div>
    </div>
  );
}
