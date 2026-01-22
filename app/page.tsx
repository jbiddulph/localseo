import Link from "next/link";
import MapPreview from "./components/MapPreview";
import LiveMovement from "./components/LiveMovement";
import StatsSummary from "./components/StatsSummary";
import PostcodeLeaderboard from "./components/PostcodeLeaderboard";

export default function Home() {
  const features = [
    {
      title: "Postcode heatmaps",
      description: "See ranking pockets block-by-block, not just city-wide.",
    },
    {
      title: "Competitor movement",
      description: "Track when rivals surge, drop, or enter your patch.",
    },
    {
      title: "Multi-location alerts",
      description: "Weekly summaries for every branch, auto-sorted by impact.",
    },
  ];

  return (
    <div className="min-h-screen text-[15px] text-[#1a1916]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-12 h-72 w-72 animate-[floaty_10s_ease-in-out_infinite] rounded-full bg-[#f6c561]/40 blur-[120px]" />
        <div className="pointer-events-none absolute right-10 top-40 h-80 w-80 animate-[floaty_12s_ease-in-out_infinite] rounded-full bg-[#7bd9b1]/40 blur-[120px]" />
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-20 pt-10">
          <section className="grid animate-[reveal_0.8s_ease-out] gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#4f4a3d] shadow-sm">
                Hyper-local rankings
                <span className="h-2 w-2 rounded-full bg-[#7bd9b1]" />
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-[#101018] md:text-5xl">
                Map rankings that feel like street intelligence, not city
                averages.
              </h1>
              <p className="max-w-xl text-base text-[#4f4a3d] md:text-lg">
                Track Google Maps positions by postcode, watch competitor
                movement, and share a simple report that shows exactly where you
                win or lose visibility.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  className="rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20 transition hover:-translate-y-0.5"
                  href="/sign-up"
                >
                  Start tracking
                </Link>
                <Link
                  className="rounded-full border border-[#101018]/20 bg-white/60 px-6 py-3 text-sm font-semibold text-[#101018] transition hover:border-[#101018]"
                  href="/sign-in"
                >
                  View sample report
                </Link>
              </div>
              <StatsSummary />
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.4)]">
                <MapPreview />
              </div>
              <LiveMovement />
            </div>
          </section>
        </div>
      </div>

      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20">
        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Built for local operators
          </p>
          <h2 className="text-3xl font-semibold text-[#101018]">
            Track every postcode like a campaign.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_30px_60px_-45px_rgba(0,0,0,0.4)]"
            >
              <h3 className="text-xl font-semibold text-[#101018]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm text-[#4f4a3d]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-24">
        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Weekly roll-up
          </p>
          <h2 className="text-3xl font-semibold text-[#101018]">
            Postcode leaderboard snapshot.
          </h2>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_30px_60px_-45px_rgba(0,0,0,0.4)]">
          <PostcodeLeaderboard />
        </div>
      </section>
    </div>
  );
}
