import MapPreview from "./components/MapPreview";

export default function Home() {
  const trackedPostcodes = [
    { code: "SW1A", visibility: "Top 3", change: "+2", trend: "Up" },
    { code: "E1", visibility: "Top 5", change: "+1", trend: "Up" },
    { code: "NW3", visibility: "Top 10", change: "-1", trend: "Down" },
    { code: "SE10", visibility: "Top 3", change: "+3", trend: "Up" },
  ];

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

  const competitors = [
    { name: "BrightSmile Dental", change: "+3", move: "up" },
    { name: "Riverside Dental", change: "-2", move: "down" },
    { name: "City Dental Lab", change: "+1", move: "up" },
  ];

  return (
    <div className="min-h-screen text-[15px] text-[#1a1916]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-12 h-72 w-72 animate-[floaty_10s_ease-in-out_infinite] rounded-full bg-[#f6c561]/40 blur-[120px]" />
        <div className="pointer-events-none absolute right-10 top-40 h-80 w-80 animate-[floaty_12s_ease-in-out_infinite] rounded-full bg-[#7bd9b1]/40 blur-[120px]" />
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-20 pt-10">
          <header className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#101018] text-white">
                LS
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#4f4a3d]">
                  Local SEO
                </p>
                <p className="text-lg font-semibold">Rank Tracker</p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-[#4f4a3d]">
              <a className="transition hover:text-[#101018]" href="#">
                Product
              </a>
              <a className="transition hover:text-[#101018]" href="#">
                Postcodes
              </a>
              <a className="transition hover:text-[#101018]" href="#">
                Pricing
              </a>
              <a
                className="rounded-full border border-[#101018]/20 px-4 py-2 text-sm font-semibold text-[#101018] transition hover:border-[#101018]"
                href="/sign-in"
              >
                Sign in
              </a>
              <button className="rounded-full border border-[#101018] px-5 py-2 text-[#101018] transition hover:bg-[#101018] hover:text-white">
                Request demo
              </button>
            </nav>
          </header>

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
                <button className="rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20 transition hover:-translate-y-0.5">
                  Start tracking
                </button>
                <button className="rounded-full border border-[#101018]/20 bg-white/60 px-6 py-3 text-sm font-semibold text-[#101018] transition hover:border-[#101018]">
                  View sample report
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Tracked postcodes", value: "24" },
                  { label: "Avg rank lift", value: "+2.6" },
                  { label: "Weekly alerts", value: "12" },
                ].map((stat) => (
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
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.4)]">
                <MapPreview />
              </div>
              <div className="grid gap-3 rounded-3xl border border-white/70 bg-white/70 p-5 text-sm shadow-[0_30px_60px_-40px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-[#8a836e]">
                    Live movement
                  </p>
                  <p className="text-xs text-[#8a836e]">Last 7 days</p>
                </div>
                {competitors.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3"
                  >
                    <p className="font-medium text-[#101018]">{item.name}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.move === "up"
                          ? "bg-[#e3f7ef] text-[#136a4b]"
                          : "bg-[#fde8e3] text-[#8b2f1b]"
                      }`}
                    >
                      {item.change}
                    </span>
                  </div>
                ))}
              </div>
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
          <div className="grid gap-4 text-sm">
            <div className="grid grid-cols-3 border-b border-[#f0e6d7] pb-2 text-xs uppercase tracking-[0.3em] text-[#8a836e]">
              <span>Postcode</span>
              <span>Visibility</span>
              <span>Movement</span>
            </div>
            {trackedPostcodes.map((postcode) => (
              <div
                key={postcode.code}
                className="grid grid-cols-3 items-center rounded-2xl border border-white/60 bg-white/70 px-4 py-3"
              >
                <span className="font-semibold text-[#101018]">
                  {postcode.code}
                </span>
                <span className="text-[#4f4a3d]">{postcode.visibility}</span>
                <span
                  className={`text-sm font-semibold ${
                    postcode.trend === "Up"
                      ? "text-[#136a4b]"
                      : "text-[#8b2f1b]"
                  }`}
                >
                  {postcode.change} {postcode.trend}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
