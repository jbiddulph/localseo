import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

type ReportResult = {
  cohort: {
    id: string;
    name: string;
    postcode: string;
    keyword: string | null;
    radius_km: number | null;
    business_name: string | null;
  };
  latestSnapshot: {
    id: string;
    created_at: string;
  } | null;
  previousSnapshot: {
    id: string;
    created_at: string;
  } | null;
  items: Array<{
    place_id: string;
    name: string;
    rank: number;
    rating: number | null;
    user_ratings_total: number | null;
  }>;
  deltas: Array<{
    name: string;
    delta: number;
  }>;
};

export async function getReportDataBySlug(slug: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    console.log("Report lookup", {
      slug,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
    const { data: report, error } = await supabaseAdmin
      .from("localseo_reports")
      .select("id,cohort_id,expires_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !report) {
      if (error) {
        console.error("Report lookup error", error);
      }
      return { error: "Report not found." };
    }

    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      return { error: "Report has expired." };
    }

    const { data: cohort, error: cohortError } = await supabaseAdmin
      .from("localseo_postcode_cohorts")
      .select("id,name,postcode,keyword,radius_km,business_name")
      .eq("id", report.cohort_id)
      .maybeSingle();

    if (cohortError || !cohort) {
      return { error: "Cohort not found." };
    }

    const { data: snapshots } = await supabaseAdmin
      .from("localseo_rank_snapshots")
      .select("id,created_at")
      .eq("cohort_id", cohort.id)
      .order("created_at", { ascending: false })
      .limit(2);

    const latestSnapshot = snapshots?.[0] ?? null;
    const previousSnapshot = snapshots?.[1] ?? null;

    let items: ReportResult["items"] = [];
    let deltas: ReportResult["deltas"] = [];

    if (latestSnapshot) {
      const { data: latestItems } = await supabaseAdmin
        .from("localseo_rank_snapshot_items")
        .select("place_id,name,rank,rating,user_ratings_total")
        .eq("snapshot_id", latestSnapshot.id)
        .order("rank", { ascending: true })
        .limit(20);

      items = (latestItems ?? []) as ReportResult["items"];

      if (previousSnapshot) {
        const { data: prevItems } = await supabaseAdmin
          .from("localseo_rank_snapshot_items")
          .select("place_id,rank")
          .eq("snapshot_id", previousSnapshot.id);

        const prevMap = new Map(
          (prevItems ?? []).map((item) => [item.place_id, item.rank])
        );

        deltas = items
          .map((item) => {
            const prevRank = prevMap.get(item.place_id);
            if (prevRank === undefined) return null;
            return { name: item.name, delta: prevRank - item.rank };
          })
          .filter(
            (entry): entry is { name: string; delta: number } => Boolean(entry)
          )
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 6);
      }
    }

    return {
      data: {
        cohort,
        latestSnapshot,
        previousSnapshot,
        items,
        deltas,
      } satisfies ReportResult,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to load report data.",
    };
  }
}
