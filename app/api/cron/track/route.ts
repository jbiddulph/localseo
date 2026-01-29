import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { fetchPlacesByPostcode } from "@/app/lib/google/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CohortRow = {
  id: string;
  name: string;
  postcode: string;
  keyword: string | null;
  radius_km: number | null;
  business_name: string | null;
};

type ScheduleRow = {
  id: string;
  owner_id: string;
  cohort_id: string;
  frequency: "daily" | "weekly";
  day_of_week: number | null;
  hour_utc: number;
  is_active: boolean;
  last_run_at: string | null;
  cohort: CohortRow | null;
};

type ScheduleRowRaw = Omit<ScheduleRow, "cohort"> & {
  cohort: CohortRow[] | null;
};

type SnapshotItem = {
  place_id: string;
  name: string;
  rank: number;
  rating: number | null;
  user_ratings_total: number | null;
};

function isDue(schedule: ScheduleRow, now: Date) {
  if (!schedule.is_active) return false;

  const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
  const currentHour = now.getUTCHours();
  if (currentHour !== schedule.hour_utc) return false;

  if (schedule.frequency === "daily") {
    if (!lastRun) return true;
    const lastDate = lastRun.toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    return lastDate !== today;
  }

  const dayOfWeek = schedule.day_of_week ?? 1;
  if (now.getUTCDay() !== dayOfWeek) return false;
  if (!lastRun) return true;
  const diffMs = now.getTime() - lastRun.getTime();
  return diffMs > 6 * 24 * 60 * 60 * 1000;
}

function buildAlerts(
  previous: SnapshotItem[],
  current: SnapshotItem[],
  businessName: string | null
) {
  const alerts: Array<{
    alert_type: string;
    severity: "low" | "medium" | "high";
    message: string;
    data: Record<string, unknown>;
  }> = [];

  const prevMap = new Map(
    previous.map((item) => [item.place_id, item] as const)
  );

  const drops = current
    .map((item) => {
      const prev = prevMap.get(item.place_id);
      if (!prev) return null;
      const delta = prev.rank - item.rank;
      return { name: item.name, delta };
    })
    .filter((item): item is { name: string; delta: number } => Boolean(item))
    .filter((item) => item.delta <= -3);

  if (drops.length) {
    alerts.push({
      alert_type: "rank_drop",
      severity: drops.some((drop) => drop.delta <= -5) ? "high" : "medium",
      message: `Detected ${drops.length} rank drops of 3+ positions.`,
      data: { drops },
    });
  }

  const newTopThree = current
    .filter((item) => item.rank <= 3)
    .filter((item) => !prevMap.has(item.place_id));

  if (newTopThree.length) {
    alerts.push({
      alert_type: "new_top_three",
      severity: "medium",
      message: `${newTopThree.length} new competitors entered the top 3.`,
      data: { newTopThree },
    });
  }

  if (businessName) {
    const match = current.find((item) =>
      item.name.toLowerCase().includes(businessName.toLowerCase())
    );
    if (!match || match.rank > 10) {
      alerts.push({
        alert_type: "business_out_of_top",
        severity: "high",
        message: `${businessName} is not in the top 10 for this snapshot.`,
        data: { businessName, rank: match?.rank ?? null },
      });
    }
  }

  return alerts;
}

async function sendAlertEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTS_FROM_EMAIL;

  if (!apiKey || !from) {
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });
}

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const secret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("secret");

  if (!secret || token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const { data: schedules, error } = await supabaseAdmin
    .from("localseo_tracking_schedules")
    .select(
      "id,owner_id,cohort_id,frequency,day_of_week,hour_utc,is_active,last_run_at,cohort:localseo_postcode_cohorts(id,name,postcode,keyword,radius_km,business_name)"
    )
    .eq("is_active", true);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const normalizedSchedules = (schedules ?? []).map((schedule) => {
    const row = schedule as ScheduleRowRaw;
    return {
      ...row,
      cohort: Array.isArray(row.cohort) ? row.cohort[0] ?? null : row.cohort,
    } as ScheduleRow;
  });

  const due = normalizedSchedules.filter((schedule) =>
    isDue(schedule, now)
  );

  const results: Array<{ scheduleId: string; status: string }> = [];

  for (const schedule of due) {
    const cohort = schedule.cohort;
    if (!cohort?.postcode || !cohort.keyword) {
      results.push({
        scheduleId: schedule.id,
        status: "skipped_missing_keyword",
      });
      continue;
    }

    try {
      const { places, center } = await fetchPlacesByPostcode({
        postcode: cohort.postcode,
        keyword: cohort.keyword,
        radiusKm: cohort.radius_km ?? 1.5,
      });

      const { data: lastSnapshot } = await supabaseAdmin
        .from("localseo_rank_snapshots")
        .select("id")
        .eq("owner_id", schedule.owner_id)
        .eq("cohort_id", schedule.cohort_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let hasChanges = true;
      let previousItems: SnapshotItem[] = [];

      if (lastSnapshot?.id) {
        const { data: previous } = await supabaseAdmin
          .from("localseo_rank_snapshot_items")
          .select("place_id,name,rank,rating,user_ratings_total")
          .eq("snapshot_id", lastSnapshot.id);

        previousItems = (previous ?? []) as SnapshotItem[];

        if (previousItems.length) {
          const prevMap = new Map(
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
            previousItems.length !== places.length ||
            places.some((place, index) => {
              const prev = prevMap.get(place.place_id);
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
        await supabaseAdmin
          .from("localseo_tracking_schedules")
          .update({ last_run_at: now.toISOString() })
          .eq("id", schedule.id);

        results.push({ scheduleId: schedule.id, status: "no_changes" });
        continue;
      }

      const { data: snapshot, error: snapshotError } = await supabaseAdmin
        .from("localseo_rank_snapshots")
        .insert({
          cohort_id: schedule.cohort_id,
          owner_id: schedule.owner_id,
          keyword: cohort.keyword,
          postcode: cohort.postcode,
          radius_km: cohort.radius_km ?? null,
          center_lat: center.lat,
          center_lng: center.lng,
        })
        .select("id")
        .single();

      if (snapshotError || !snapshot) {
        results.push({ scheduleId: schedule.id, status: "snapshot_failed" });
        continue;
      }

      const items = places.map((place, index) => ({
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

      await supabaseAdmin.from("localseo_rank_snapshot_items").insert(items);

      const alerts = buildAlerts(previousItems, items, cohort.business_name);

      if (alerts.length) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
          schedule.owner_id
        );
        const email = userData?.user?.email;

        for (const alert of alerts) {
          await supabaseAdmin.from("localseo_alerts").insert({
            owner_id: schedule.owner_id,
            cohort_id: schedule.cohort_id,
            snapshot_id: snapshot.id,
            alert_type: alert.alert_type,
            severity: alert.severity,
            message: alert.message,
            data: alert.data,
          });

          if (email) {
            await sendAlertEmail(
              email,
              `Local SEO alert: ${alert.message}`,
              `<p>${alert.message}</p><p>Cohort: ${cohort.name}</p>`
            );
          }
        }
      }

      await supabaseAdmin
        .from("localseo_tracking_schedules")
        .update({ last_run_at: now.toISOString() })
        .eq("id", schedule.id);

      results.push({ scheduleId: schedule.id, status: "success" });
    } catch (err) {
      results.push({
        scheduleId: schedule.id,
        status: err instanceof Error ? err.message : "error",
      });
    }
  }

  return Response.json({
    checked: due.length,
    results,
  });
}
