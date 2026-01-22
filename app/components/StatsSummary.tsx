"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type SnapshotRow = {
  id: string;
  cohort_id: string;
  created_at: string;
};

type SnapshotItemRow = {
  snapshot_id: string;
  place_id: string;
  rank: number;
};

type StatBlock = {
  label: string;
  value: string;
};

const defaultStats: StatBlock[] = [
  { label: "Tracked postcodes", value: "—" },
  { label: "Avg rank lift", value: "—" },
  { label: "Weekly alerts", value: "—" },
];

export default function StatsSummary() {
  const [stats, setStats] = useState<StatBlock[]>(defaultStats);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out">(
    "loading"
  );

  useEffect(() => {
    const loadStats = async () => {
      setStatus("loading");
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setStatus("signed-out");
        setStats(defaultStats);
        return;
      }

      const { data: cohorts } = await supabase
        .from("localseo_postcode_cohorts")
        .select("id")
        .eq("owner_id", user.id);

      const trackedPostcodes = cohorts?.length ?? 0;

      const { data: snapshots } = await supabase
        .from("localseo_rank_snapshots")
        .select("id,cohort_id,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const snapshotPairs = new Map<string, SnapshotRow[]>();
      (snapshots ?? []).forEach((snapshot) => {
        const list = snapshotPairs.get(snapshot.cohort_id) ?? [];
        if (list.length < 2) {
          list.push(snapshot);
          snapshotPairs.set(snapshot.cohort_id, list);
        }
      });

      const snapshotIds = Array.from(snapshotPairs.values())
        .flat()
        .map((snapshot) => snapshot.id);

      let averageLift = 0;
      let weeklyAlerts = 0;
      let totalPairs = 0;

      if (snapshotIds.length >= 2) {
        const { data: items } = await supabase
          .from("localseo_rank_snapshot_items")
          .select("snapshot_id,place_id,rank")
          .in("snapshot_id", snapshotIds);

        const itemsBySnapshot = new Map<string, SnapshotItemRow[]>();
        (items ?? []).forEach((item) => {
          const list = itemsBySnapshot.get(item.snapshot_id) ?? [];
          list.push(item);
          itemsBySnapshot.set(item.snapshot_id, list);
        });

        snapshotPairs.forEach((pair) => {
          if (pair.length < 2) return;
          const [latest, previous] = pair;
          const latestItems = itemsBySnapshot.get(latest.id) ?? [];
          const previousItems = itemsBySnapshot.get(previous.id) ?? [];
          if (!latestItems.length || !previousItems.length) return;

          const previousRankMap = new Map(
            previousItems.map((item) => [item.place_id, item.rank])
          );

          let cohortDeltaTotal = 0;
          let cohortCount = 0;
          let cohortAlerts = 0;

          latestItems.forEach((item) => {
            const prevRank = previousRankMap.get(item.place_id);
            if (!prevRank) return;
            const delta = prevRank - item.rank;
            cohortDeltaTotal += delta;
            cohortCount += 1;
            if (delta !== 0) {
              cohortAlerts += 1;
            }
          });

          if (cohortCount > 0) {
            totalPairs += 1;
            averageLift += cohortDeltaTotal / cohortCount;

            const latestDate = new Date(latest.created_at);
            const now = new Date();
            const days =
              (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
            if (days <= 7) {
              weeklyAlerts += cohortAlerts;
            }
          }
        });
      }

      const avgLiftValue =
        totalPairs > 0 ? averageLift / totalPairs : 0;
      const avgLiftDisplay =
        avgLiftValue === 0
          ? "0"
          : `${avgLiftValue > 0 ? "+" : ""}${avgLiftValue.toFixed(1)}`;

      setStats([
        { label: "Tracked postcodes", value: String(trackedPostcodes) },
        { label: "Avg rank lift", value: avgLiftDisplay },
        { label: "Weekly alerts", value: String(weeklyAlerts) },
      ]);
      setStatus("ready");
    };

    loadStats();

    const handleRefresh = () => {
      loadStats();
    };

    window.addEventListener("localseo:snapshot-saved", handleRefresh);

    return () => {
      window.removeEventListener("localseo:snapshot-saved", handleRefresh);
    };
  }, []);

  const helperText = useMemo(() => {
    if (status === "signed-out") {
      return "Sign in to see live tracking stats.";
    }
    if (status === "loading") {
      return "Loading live metrics...";
    }
    return null;
  }, [status]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[0_15px_40px_-32px_rgba(0,0,0,0.4)]"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[#8a836e]">
            {stat.label}
          </p>
          <p className="text-2xl font-semibold text-[#101018]">
            {stat.value}
          </p>
        </div>
      ))}
      {helperText ? (
        <p className="sm:col-span-3 text-xs text-[#8a836e]">{helperText}</p>
      ) : null}
    </div>
  );
}
