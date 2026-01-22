"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type SnapshotRow = {
  id: string;
  created_at: string;
};

type SnapshotItemRow = {
  place_id: string;
  name: string;
  rank: number;
};

export default function PostcodeLeaderboard() {
  const [items, setItems] = useState<SnapshotItemRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out">(
    "loading"
  );

  useEffect(() => {
    const loadLeaderboard = async () => {
      setStatus("loading");
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setStatus("signed-out");
        setItems([]);
        return;
      }

      const { data: snapshots } = await supabase
        .from("localseo_rank_snapshots")
        .select("id,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const latest = snapshots?.[0];
      if (!latest) {
        setItems([]);
        setStatus("ready");
        return;
      }

      const { data: snapshotItems } = await supabase
        .from("localseo_rank_snapshot_items")
        .select("place_id,name,rank")
        .eq("snapshot_id", latest.id)
        .order("rank", { ascending: true })
        .limit(10);

      setItems(snapshotItems ?? []);
      setStatus("ready");
    };

    loadLeaderboard();

    const handleRefresh = () => {
      loadLeaderboard();
    };

    window.addEventListener("localseo:snapshot-saved", handleRefresh);

    return () => {
      window.removeEventListener("localseo:snapshot-saved", handleRefresh);
    };
  }, []);

  if (status === "signed-out") {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-3 text-center text-xs text-amber-900">
        Sign in to see your latest postcode leaderboard.
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-3 text-center text-xs text-amber-900">
        Loading your latest leaderboard...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-3 text-center text-xs text-amber-900">
        Run a cohort search to populate your leaderboard.
      </div>
    );
  }

  return (
    <div className="grid gap-2 text-sm">
      <div className="grid grid-cols-3 border-b border-[#f0e6d7] pb-2 text-xs uppercase tracking-[0.3em] text-[#8a836e]">
        <span>Rank</span>
        <span>Business</span>
        <span>Change</span>
      </div>
      {items.map((item) => (
        <div
          key={item.place_id}
          className="grid grid-cols-3 items-center rounded-2xl border border-white/60 bg-white/70 px-4 py-3"
        >
          <span className="font-semibold text-[#101018]">#{item.rank}</span>
          <span className="text-[#4f4a3d]">{item.name}</span>
          <span className="text-sm font-semibold text-[#8a836e]">
            —
          </span>
        </div>
      ))}
    </div>
  );
}
