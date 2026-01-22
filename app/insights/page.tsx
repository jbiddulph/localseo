import Link from "next/link";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-[#f8f4ef] px-6 py-12 text-[#1a1916]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Local SEO Insights
          </p>
          <h1 className="text-4xl font-semibold text-[#101018]">
            Why Google Maps rankings move all the time
          </h1>
          <p className="text-base text-[#4f4a3d]">
            Rankings in Google Maps are volatile by nature. That volatility
            does not always mean you lost ground. It often reflects real-time
            search dynamics and signals that change throughout the day.
          </p>
        </header>

        <section className="grid gap-6 rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-[#4f4a3d] shadow-[0_30px_60px_-45px_rgba(0,0,0,0.35)]">
          <h2 className="text-2xl font-semibold text-[#101018]">
            What drives the fluctuation
          </h2>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                Business hours
              </p>
              <p className="mt-2">
                Businesses that are open at the time of search can be weighted
                more heavily in the local pack. Your ranking can soften when
                you close for the day.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                Searcher proximity
              </p>
              <p className="mt-2">
                Distance remains one of the hardest factors to control. A
                searcher standing a few blocks away can see a different order
                of businesses.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                Review velocity and recency
              </p>
              <p className="mt-2">
                A recent influx of reviews or a new review streak can boost
                visibility. Lulls can soften it.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                Engagement signals
              </p>
              <p className="mt-2">
                Actions like calls, direction requests, and profile clicks can
                amplify visibility for a period of time.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-[#4f4a3d] shadow-[0_30px_60px_-45px_rgba(0,0,0,0.35)]">
          <h2 className="text-2xl font-semibold text-[#101018]">
            How to monitor effectively
          </h2>
          <ul className="grid gap-3">
            <li>
              Track weekly or bi-weekly to see the trend, not the noise.
            </li>
            <li>
              Focus on consistent rank changes across multiple snapshots.
            </li>
            <li>
              Large, sudden shifts can indicate listing issues or algorithm
              changes.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-[#4f4a3d] shadow-[0_30px_60px_-45px_rgba(0,0,0,0.35)]">
          <p className="font-semibold text-[#101018]">
            The goal is not to avoid movement — it is to see patterns early.
          </p>
          <p className="mt-2">
            Local SEO Rank Tracker stores snapshots so you can separate normal
            fluctuation from real drops.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              className="rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20"
              href="/sign-up"
            >
              Start tracking
            </Link>
            <Link
              className="rounded-full border border-[#101018]/20 bg-white px-6 py-3 text-sm font-semibold text-[#101018]"
              href="/"
            >
              Back to homepage
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
