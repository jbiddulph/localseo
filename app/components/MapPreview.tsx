"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/app/lib/supabase/client";

type PlaceResult = {
  name: string;
  place_id: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  location: { lat: number; lng: number };
};

type PostcodeCohort = {
  id: string;
  name: string;
  postcode: string;
  keyword: string | null;
  radius_km: number | null;
  business_name: string | null;
};

type PlacesPayload = {
  center?: { lat: number; lng: number };
  places?: PlaceResult[];
  error?: string;
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

  const [cohorts, setCohorts] = useState<PostcodeCohort[]>([]);
  const [selectedCohort, setSelectedCohort] =
    useState<PostcodeCohort | null>(null);
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [postcode, setPostcode] = useState("SW1A 1AA");
  const [query, setQuery] = useState("dentist");
  const [radiusKm, setRadiusKm] = useState("1.5");
  const [places, setPlaces] = useState<PlaceResult[]>(fallbackLocations);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [centerOverride, setCenterOverride] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const center = useMemo(() => {
    if (centerOverride) {
      return [centerOverride.lng, centerOverride.lat] as [number, number];
    }
    if (places.length === 0) {
      return [-0.1276, 51.5072] as [number, number];
    }
    const first = places[0];
    return [first.location.lng, first.location.lat] as [number, number];
  }, [places, centerOverride]);

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
    const loadCohorts = async () => {
      setIsLoadingCohorts(true);
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUserEmail(currentUser?.email ?? null);
      setUserId(currentUser?.id ?? null);

      if (!currentUser) {
        setCohorts([]);
        setSelectedCohort(null);
        setIsLoadingCohorts(false);
        return;
      }

      const { data: cohortData, error } = await supabase
        .from("localseo_postcode_cohorts")
        .select("id,name,postcode,keyword,radius_km,business_name")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setCohorts(cohortData ?? []);
      }
      setIsLoadingCohorts(false);
    };

    loadCohorts();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadCohorts();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    setSaveMessage(null);

    if (!query.trim()) {
      setStatus("error");
      setErrorMessage("Keyword is required.");
      return;
    }

    try {
      const response = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode,
          query,
          radius_km: radiusKm ? Number(radiusKm) : undefined,
        }),
      });

      const payload = (await response.json()) as PlacesPayload;

      if (!response.ok) {
        throw new Error(
          payload.error || "Unable to fetch businesses for that postcode."
        );
      }

      const placesResult = payload.places ?? [];
      if (payload.center) {
        setCenterOverride(payload.center);
      }
      setPlaces(placesResult.length ? placesResult : []);
      setStatus("idle");

      if (selectedCohort && userId && placesResult.length) {
        const { data: latestSnapshots, error: latestError } = await supabase
          .from("localseo_rank_snapshots")
          .select("id")
          .eq("owner_id", userId)
          .eq("cohort_id", selectedCohort.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (latestError) {
          setErrorMessage(latestError.message);
          setStatus("error");
          return;
        }

        const latestSnapshotId = latestSnapshots?.[0]?.id ?? null;

        let hasChanges = true;
        if (latestSnapshotId) {
          const { data: previousItems, error: itemsError } = await supabase
            .from("localseo_rank_snapshot_items")
            .select("place_id,rank,rating,user_ratings_total")
            .eq("snapshot_id", latestSnapshotId);

          if (itemsError) {
            setErrorMessage(itemsError.message);
            setStatus("error");
            return;
          }

          if (previousItems && previousItems.length) {
            const previousMap = new Map(
              previousItems.map((item) => [
                item.place_id,
                {
                  rank: item.rank,
                  rating: item.rating ?? null,
                  user_ratings_total: item.user_ratings_total ?? null,
                },
              ])
            );

            hasChanges =
              previousItems.length !== placesResult.length ||
              placesResult.some((place, index) => {
                const prev = previousMap.get(place.place_id);
                if (!prev) return true;
                const nextRank = index + 1;
                const nextRating = place.rating ?? null;
                const nextTotal = place.user_ratings_total ?? null;
                return (
                  prev.rank !== nextRank ||
                  prev.rating !== nextRating ||
                  prev.user_ratings_total !== nextTotal
                );
              });
          }
        }

        if (!hasChanges) {
          setSaveMessage("No changes detected since the last snapshot.");
          setStatus("idle");
          return;
        }

        const { data: snapshot, error: snapshotError } = await supabase
          .from("localseo_rank_snapshots")
          .insert({
            cohort_id: selectedCohort.id,
            owner_id: userId,
            keyword: query.trim(),
            postcode: postcode.trim(),
            radius_km: radiusKm ? Number(radiusKm) : null,
            center_lat: payload.center?.lat ?? null,
            center_lng: payload.center?.lng ?? null,
          })
          .select("id")
          .single();

        if (snapshotError) {
          setErrorMessage(snapshotError.message);
          setStatus("error");
          return;
        }

        const items = placesResult.map((place, index) => ({
          snapshot_id: snapshot.id,
          place_id: place.place_id,
          name: place.name,
          rank: index + 1,
          rating: place.rating ?? null,
          user_ratings_total: place.user_ratings_total ?? null,
          vicinity: place.vicinity ?? null,
          lat: place.location.lat,
          lng: place.location.lng,
        }));

        const { error: itemsError } = await supabase
          .from("localseo_rank_snapshot_items")
          .insert(items);

        if (itemsError) {
          setErrorMessage(itemsError.message);
          setStatus("error");
        } else {
          setSaveMessage("Snapshot saved.");
          window.dispatchEvent(new Event("localseo:snapshot-saved"));
        }
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  };

  const handleCohortChange = (value: string) => {
    const cohort = cohorts.find((item) => item.id === value) ?? null;
    setSelectedCohort(cohort);
    if (cohort) {
      setPostcode(cohort.postcode);
      setQuery(cohort.keyword ?? "");
      setRadiusKm(
        cohort.radius_km !== null && cohort.radius_km !== undefined
          ? String(cohort.radius_km)
          : "1.5"
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
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <select
            value={selectedCohort?.id ?? ""}
            onChange={(event) => handleCohortChange(event.target.value)}
            className="w-full rounded-full border border-transparent bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[#101018]/20 sm:w-[220px]"
          >
            <option value="">
              {isLoadingCohorts
                ? "Loading cohorts..."
                : userEmail
                ? "Select a cohort"
                : "Sign in to load cohorts"}
            </option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSearch}
            disabled={
              status === "loading" || !selectedCohort || !postcode.trim()
            }
            className="rounded-full border border-[#101018]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#101018] transition hover:border-[#101018] disabled:opacity-60"
          >
            {status === "loading" ? "Running..." : "Run cohort search"}
          </button>
        </div>
        <input
          value={postcode}
          onChange={(event) => setPostcode(event.target.value)}
          placeholder="Enter postcode"
          className="w-full rounded-full border border-transparent bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[#101018]/20 sm:w-[180px]"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Required keyword"
          className="w-full rounded-full border border-transparent bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[#101018]/20 sm:w-[160px]"
        />
        <input
          type="number"
          min="0.5"
          step="0.5"
          value={radiusKm}
          onChange={(event) => setRadiusKm(event.target.value)}
          placeholder="Radius (km)"
          className="w-full rounded-full border border-transparent bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[#101018]/20 sm:w-[120px]"
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
        {saveMessage ? (
          <span className="text-xs font-semibold text-[#136a4b]">
            {saveMessage}
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
        {selectedCohort?.business_name ? (
          <div className="sm:col-span-2 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-xs text-[#4f4a3d]">
            Your business:{" "}
            <span className="font-semibold text-[#101018]">
              {selectedCohort.business_name}
            </span>
            {(() => {
              const match = places.find((place) =>
                place.name
                  .toLowerCase()
                  .includes(selectedCohort.business_name!.toLowerCase())
              );
              if (!match) {
                return (
                  <span className="ml-2 text-[#8b2f1b]">
                    Not in top {places.length || 0}
                  </span>
                );
              }
              const rank =
                places.findIndex((place) => place.place_id === match.place_id) +
                1;
              return (
                <span className="ml-2 text-[#136a4b]">Rank #{rank}</span>
              );
            })()}
          </div>
        ) : null}
        {places.map((place, index) => (
          <div
            key={place.place_id}
            className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#101018] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                  #{index + 1}
                </span>
                <p className="font-semibold text-[#101018]">{place.name}</p>
              </div>
              {selectedCohort?.business_name &&
              place.name
                .toLowerCase()
                .includes(selectedCohort.business_name.toLowerCase()) ? (
                <span className="rounded-full bg-[#101018] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                  Your business
                </span>
              ) : null}
            </div>
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
