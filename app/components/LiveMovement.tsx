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
  name: string;
  rank: number;
};

type MovementRow = {
  name: string;
  delta: number;
};

export default function LiveMovement() {
  const [movement, setMovement] = useState<MovementRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out">(
    "loading"
  );

  useEffect(() => {
    const loadMovement = async () => {
      setStatus("loading");
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setStatus("signed-out");
        setMovement([]);
        return;
      }

      const { data: snapshots } = await supabase
        .from("localseo_rank_snapshots")
        .select("id,cohort_id,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const snapshotPairs = new Map<string, SnapshotRow[]>();
      (snapshots ?? []).forEach((snapshot) => {
        const list = snapshotPairs.get(snapshot.cohort_id) ?? [];
        if (list.length < 2) {
          list.push(snapshot);
          snapshotPairs.set(snapshot.cohort_id, list);
        }
      });

      let latestPair: SnapshotRow[] | null = null;
      snapshotPairs.forEach((pair) => {
        if (pair.length < 2) return;
        if (!latestPair) {
          latestPair = pair;
          return;
        }
        const currentLatest = new Date(latestPair[0].created_at).getTime();
        const candidateLatest = new Date(pair[0].created_at).getTime();
        if (candidateLatest > currentLatest) {
          latestPair = pair;
        }
      });

      if (!latestPair) {
        setMovement([]);
        setStatus("ready");
        return;
      }

      const [latest, previous] = latestPair;
      const { data: items } = await supabase
        .from("localseo_rank_snapshot_items")
        .select("snapshot_id,place_id,name,rank")
        .in("snapshot_id", [latest.id, previous.id]);

      const latestItems =
        items?.filter((item) => item.snapshot_id === latest.id) ?? [];
      const previousItems =
        items?.filter((item) => item.snapshot_id === previous.id) ?? [];

      const previousRankMap = new Map(
        previousItems.map((item) => [item.place_id, item.rank])
      );

      const deltas = latestItems
        .map((item) => {
          const prevRank = previousRankMap.get(item.place_id);
          if (!prevRank) return null;
          return { name: item.name, delta: prevRank - item.rank };
        })
        .filter((item): item is MovementRow => Boolean(item));

      const sorted = deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      setMovement(sorted.slice(0, 5));
      setStatus("ready");
    };

    loadMovement();

    const handleRefresh = () => {
      loadMovement();
    };

    window.addEventListener("localseo:snapshot-saved", handleRefresh);

    return () => {
      window.removeEventListener("localseo:snapshot-saved", handleRefresh);
    };
  }, []);

  const helperText = useMemo(() => {
    if (status === "signed-out") {
      return "Sign in to see live movement.";
    }
    if (status === "loading") {
      return "Loading live movement...";
    }
    return null;
  }, [status]);

  return (
    <div className="grid gap-3 rounded-3xl border border-white/70 bg-white/70 p-5 text-sm shadow-[0_30px_60px_-40px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-[#8a836e]">
          Live movement
        </p>
        <p className="text-xs text-[#8a836e]">Latest snapshot</p>
      </div>
      {movement.length ? (
        movement.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3"
          >
            <p className="font-medium text-[#101018]">{item.name}</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.delta >= 0
                  ? "bg-[#e3f7ef] text-[#136a4b]"
                  : "bg-[#fde8e3] text-[#8b2f1b]"
              }`}
            >
              {item.delta >= 0 ? `+${item.delta}` : item.delta}
            </span>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
          {helperText ?? "Run a cohort search to see movement."}
        </div>
      )}
    </div>
  );
}
