"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase/client";

type PostcodeCohort = {
  id: string;
  name: string;
  postcode: string;
  keyword: string | null;
  radius_km: number | null;
  business_name: string | null;
  notes: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [cohorts, setCohorts] = useState<PostcodeCohort[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});
  const [isPro, setIsPro] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [keyword, setKeyword] = useState("");
  const [radiusKm, setRadiusKm] = useState("3");
  const [businessName, setBusinessName] = useState("");
  const [notes, setNotes] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "daily">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [hourUtc, setHourUtc] = useState("9");

  const fetchCohorts = async (ownerId: string) => {
    const { data, error } = await supabase
      .from("localseo_postcode_cohorts")
      .select(
        "id,name,postcode,keyword,radius_km,business_name,notes,created_at"
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      setFormError(error.message);
      return;
    }

    setCohorts(data ?? []);
  };

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
      if (data.user?.id) {
        await fetchCohorts(data.user.id);
        const { data: subscription } = await supabase
          .from("localseo_subscriptions")
          .select("status,trial_end,current_period_end")
          .eq("owner_id", data.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setIsPro(Boolean(subscription?.status) && subscription?.status !== "canceled");
      } else {
        setCohorts([]);
      }
      setStatus("ready");
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      if (session?.user?.id) {
        fetchCohorts(session.user.id);
        supabase
          .from("localseo_subscriptions")
          .select("status")
          .eq("owner_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => {
            setIsPro(Boolean(data?.status) && data?.status !== "canceled");
          });
      } else {
        setCohorts([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    setUserId(null);
    router.push("/sign-in");
  };

  const handleCreateCohort = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!userId) {
      setFormError("Please sign in before creating a cohort.");
      return;
    }

    if (!isPro && cohorts.length >= 1) {
      setFormError("Free plan allows 1 cohort. Upgrade to add more.");
      return;
    }

    if (!name.trim() || !postcode.trim()) {
      setFormError("Cohort name and postcode are required.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("localseo_postcode_cohorts").insert({
      owner_id: userId,
      name: name.trim(),
      postcode: postcode.trim(),
      keyword: keyword.trim() ? keyword.trim() : null,
      radius_km: radiusKm ? Number(radiusKm) : null,
      business_name: businessName.trim() ? businessName.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    });

    if (error) {
      setFormError(error.message);
      setIsSaving(false);
      return;
    }

    const { data: createdCohort } = await supabase
      .from("localseo_postcode_cohorts")
      .select("id")
      .eq("owner_id", userId)
      .eq("name", name.trim())
      .eq("postcode", postcode.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (createdCohort?.id) {
      await supabase.from("localseo_tracking_schedules").insert({
        owner_id: userId,
        cohort_id: createdCohort.id,
        frequency,
        day_of_week: frequency === "weekly" ? Number(dayOfWeek) : null,
        hour_utc: Number(hourUtc),
        is_active: true,
      });
    }

    setFormSuccess("Cohort saved. Ready to start tracking.");
    setName("");
    setPostcode("");
    setKeyword("");
    setRadiusKm("3");
    setBusinessName("");
    setNotes("");
    setFrequency("weekly");
    setDayOfWeek("1");
    setHourUtc("9");
    await fetchCohorts(userId);
    setIsSaving(false);
  };

  const handleCreateReport = async (cohortId: string) => {
    setShareStatus((prev) => ({ ...prev, [cohortId]: "creating" }));
    if (!isPro) {
      setShareStatus((prev) => ({
        ...prev,
        [cohortId]: "Upgrade to Pro to create shareable reports.",
      }));
      return;
    }
    const response = await fetch("/api/reports/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohortId }),
    });

    const raw = await response.text();
    const payload = raw ? JSON.parse(raw) : {};

    if (!response.ok) {
      setShareStatus((prev) => ({
        ...prev,
        [cohortId]: payload.error || "Failed to create report.",
      }));
      return;
    }

    if (payload.url && payload.slug) {
      setShareLinks((prev) => ({
        ...prev,
        [cohortId]: payload.url,
      }));
      setShareStatus((prev) => ({ ...prev, [cohortId]: "ready" }));
    } else {
      setShareStatus((prev) => ({
        ...prev,
        [cohortId]: "Report created but response was incomplete.",
      }));
    }
  };

  const handleRefreshBilling = async () => {
    setFormError(null);
    setFormSuccess(null);
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/stripe/refresh", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setFormError(payload.error || "Unable to refresh billing status.");
        return;
      }
      setFormSuccess("Billing status refreshed.");
      if (userId) {
        const { data: subscription } = await supabase
          .from("localseo_subscriptions")
          .select("status")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setIsPro(
          Boolean(subscription?.status) && subscription?.status !== "canceled"
        );
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to refresh billing."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f4ef] px-6 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#101018]">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-[#4f4a3d]">
            {status === "loading"
              ? "Checking session..."
              : email
              ? `Signed in as ${email}`
              : "You are not signed in."}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            {email ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-[#101018]/20 bg-white px-6 py-3 text-sm font-semibold text-[#101018] transition hover:border-[#101018]"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  className="rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20"
                  href="/sign-in"
                >
                  Sign in
                </Link>
                <Link
                  className="rounded-full border border-[#101018]/20 bg-white px-6 py-3 text-sm font-semibold text-[#101018] transition hover:border-[#101018]"
                  href="/sign-up"
                >
                  Create account
                </Link>
              </>
            )}
            {email ? (
              <button
                type="button"
                onClick={handleRefreshBilling}
                disabled={isRefreshing}
                className="rounded-full border border-[#101018]/20 bg-white px-6 py-3 text-sm font-semibold text-[#101018] transition hover:border-[#101018] disabled:opacity-60"
              >
                {isRefreshing ? "Refreshing..." : "Refresh billing status"}
              </button>
            ) : null}
            {!isPro ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/stripe/checkout", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ plan: "monthly" }),
                    });
                    const payload = await response.json();
                    if (!response.ok) {
                      setFormError(
                        payload.error || "Unable to start checkout."
                      );
                      return;
                    }
                    if (payload.url) {
                      window.location.href = payload.url;
                    } else {
                      setFormError("Missing checkout URL.");
                    }
                  } catch (error) {
                    setFormError(
                      error instanceof Error
                        ? error.message
                        : "Checkout failed."
                    );
                  }
                }}
                className="rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20 transition hover:-translate-y-0.5"
              >
                Upgrade to Pro
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch("/api/stripe/portal", {
                    method: "POST",
                  });
                  const payload = await response.json();
                  if (payload.url) {
                    window.location.href = payload.url;
                  }
                }}
                className="rounded-full border border-[#101018]/20 bg-white px-6 py-3 text-sm font-semibold text-[#101018] transition hover:border-[#101018]"
              >
                Manage billing
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-sm text-[#4f4a3d] shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <p className="font-semibold text-[#101018]">
            Connect your first postcode cohort.
          </p>
          <p className="mt-2">
            This creates a tracking group for a postcode, keyword, and radius so
            you can monitor Maps visibility and competitor movement.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={handleCreateCohort}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                Cohort name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                  placeholder="Central London dentists"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                Postcode
                <input
                  type="text"
                  value={postcode}
                  onChange={(event) => setPostcode(event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                  placeholder="SW1A 1AA"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e] md:col-span-2">
                Primary keyword
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                  placeholder="Emergency dentist"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                Radius (km)
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                />
              </label>
            </div>

            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
              Business name
              <input
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                placeholder="LocalSmile Dental"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                placeholder="Track map pack and top 10 organic results."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                Frequency
                <select
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(event.target.value as "weekly" | "daily")
                  }
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                >
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                Day (UTC)
                <select
                  value={dayOfWeek}
                  onChange={(event) => setDayOfWeek(event.target.value)}
                  disabled={frequency === "daily"}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20 disabled:opacity-60"
                >
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                Hour (UTC)
                <select
                  value={hourUtc}
                  onChange={(event) => setHourUtc(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                >
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <option key={idx} value={String(idx)}>
                      {String(idx).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-[#8b2f1b]">
                {formError}
              </p>
            ) : null}

            {formSuccess ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900">
                {formSuccess}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20 transition hover:-translate-y-0.5 disabled:opacity-60 md:w-fit"
            >
              {isSaving ? "Saving..." : "Create cohort"}
            </button>
            {!isPro ? (
              <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2 text-xs text-amber-900">
                Free plan includes 1 cohort and 1 scan. Upgrade to unlock
                unlimited cohorts, scans, and daily tracking.
              </div>
            ) : null}
          </form>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-sm text-[#4f4a3d] shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-semibold text-[#101018]">Your cohorts</p>
            <span className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
              {cohorts.length} active
            </span>
          </div>

          {email ? (
            cohorts.length ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {cohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-[#101018]">
                      {cohort.name}
                    </p>
                    <p className="mt-1 text-xs text-[#8a836e]">
                      {cohort.postcode}
                      {cohort.radius_km
                        ? ` • ${cohort.radius_km}km radius`
                        : ""}
                    </p>
                    {cohort.keyword ? (
                      <p className="mt-2 text-xs text-[#4f4a3d]">
                        Keyword: {cohort.keyword}
                      </p>
                    ) : null}
                    {cohort.business_name ? (
                      <p className="mt-1 text-xs text-[#4f4a3d]">
                        Business: {cohort.business_name}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCreateReport(cohort.id)}
                        className="rounded-full border border-[#101018]/20 px-3 py-1 font-semibold text-[#101018] transition hover:border-[#101018]"
                      >
                        {shareStatus[cohort.id] === "creating"
                          ? "Creating..."
                          : "Create report link"}
                      </button>
                      {shareLinks[cohort.id] ? (
                        <a
                          href={shareLinks[cohort.id]}
                          className="rounded-full border border-[#101018]/20 px-3 py-1 font-semibold text-[#101018] transition hover:border-[#101018]"
                        >
                          View report
                        </a>
                      ) : null}
                      {shareStatus[cohort.id] &&
                      shareStatus[cohort.id] !== "creating" &&
                      shareStatus[cohort.id] !== "ready" ? (
                        <span className="text-[#8b2f1b]">
                          {shareStatus[cohort.id]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#8a836e]">
                No cohorts yet. Create one above to start tracking.
              </p>
            )
          ) : (
            <p className="mt-4 text-xs text-[#8a836e]">
              Sign in to view your cohorts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
