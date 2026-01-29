import Link from "next/link";
import { getReportDataBySlug } from "@/app/lib/reports/report-data";

type Props = {
  params: { slug: string };
};

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: Props) {
  const resolvedParams = await params;
  const { data, error } = await getReportDataBySlug(resolvedParams.slug);

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8f4ef] px-6 py-12 text-[#1a1916]">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/80 p-8">
          <h1 className="text-2xl font-semibold text-[#101018]">
            Report not available
          </h1>
          <p className="mt-2 text-sm text-[#4f4a3d]">
            {error ?? "This report link is invalid or expired."}
          </p>
          {error?.includes("SUPABASE_SERVICE_ROLE_KEY") ? (
            <p className="mt-2 text-xs text-[#8b2f1b]">
              Add SUPABASE_SERVICE_ROLE_KEY to your server environment and
              restart the server.
            </p>
          ) : null}
          <Link
            className="mt-6 inline-flex rounded-full border border-[#101018]/20 px-4 py-2 text-sm font-semibold text-[#101018]"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const { cohort, latestSnapshot, previousSnapshot, items, deltas } = data;
  const businessName = cohort.business_name;
  const businessMatch = businessName
    ? items.find((item) =>
        item.name.toLowerCase().includes(businessName.toLowerCase())
      )
    : null;

  return (
    <div className="min-h-screen bg-[#f8f4ef] px-6 py-12 text-[#1a1916]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-3xl border border-white/70 bg-white/80 p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Shareable report
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#101018]">
            {cohort.name}
          </h1>
          <p className="mt-2 text-sm text-[#4f4a3d]">
            Postcode {cohort.postcode} · Keyword {cohort.keyword ?? "—"}
          </p>
          <p className="mt-2 text-xs text-[#8a836e]">
            Latest snapshot: {latestSnapshot?.created_at ?? "—"} · Previous:{" "}
            {previousSnapshot?.created_at ?? "—"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className="rounded-full border border-[#101018]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#101018]"
              href={`/api/reports/pdf?slug=${resolvedParams.slug}`}
            >
              Download PDF
            </a>
            <Link
              className="rounded-full border border-[#101018]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#101018]"
              href="/"
            >
              Back to home
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Your position
          </p>
          <p className="mt-2 text-sm text-[#4f4a3d]">
            {businessName ? (
              businessMatch ? (
                <>
                  {businessName} is currently ranked{" "}
                  <span className="font-semibold text-[#101018]">
                    #{businessMatch.rank}
                  </span>
                  .
                </>
              ) : (
                `${businessName} is not in the top ${items.length || 0}.`
              )
            ) : (
              "Add a business name to highlight your position."
            )}
          </p>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Movement highlights
          </p>
          {deltas.length ? (
            <div className="mt-3 grid gap-3">
              {deltas.map((delta) => (
                <div
                  key={delta.name}
                  className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm text-[#4f4a3d]"
                >
                  <span className="font-semibold text-[#101018]">
                    {delta.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      delta.delta >= 0
                        ? "bg-[#e3f7ef] text-[#136a4b]"
                        : "bg-[#fde8e3] text-[#8b2f1b]"
                    }`}
                  >
                    {delta.delta >= 0 ? "+" : ""}
                    {delta.delta}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#4f4a3d]">
              No movement detected yet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Top results
          </p>
          <div className="mt-3 grid gap-3">
            {items.map((item) => (
              <div
                key={item.place_id}
                className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm text-[#4f4a3d]"
              >
                <span className="font-semibold text-[#101018]">
                  #{item.rank} {item.name}
                </span>
                <span className="text-xs text-[#8a836e]">
                  {item.rating ? `Rating ${item.rating}` : "No rating"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
