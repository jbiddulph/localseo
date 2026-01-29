import { chromium } from "playwright";
import { getReportDataBySlug } from "@/app/lib/reports/report-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function renderReportHtml(data: Awaited<ReturnType<typeof getReportDataBySlug>>["data"]) {
  if (!data) return "";
  const { cohort, latestSnapshot, previousSnapshot, items, deltas } = data;

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${cohort.name} Report</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1a1916; padding: 32px; }
        h1 { font-size: 24px; margin-bottom: 6px; }
        h2 { margin-top: 24px; font-size: 18px; }
        .meta { color: #6f675a; font-size: 12px; }
        .card { border: 1px solid #e8e0d5; border-radius: 12px; padding: 16px; margin-top: 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
        .up { background: #e3f7ef; color: #136a4b; }
        .down { background: #fde8e3; color: #8b2f1b; }
        ul { padding-left: 18px; }
        li { margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <h1>${cohort.name}</h1>
      <div class="meta">Postcode: ${cohort.postcode}</div>
      <div class="meta">Keyword: ${cohort.keyword ?? "—"}</div>
      <div class="meta">Snapshot: ${latestSnapshot?.created_at ?? "—"}</div>
      <div class="meta">Previous snapshot: ${previousSnapshot?.created_at ?? "—"}</div>

      <div class="card">
        <strong>Top results</strong>
        <ul>
          ${items
            .map(
              (item) =>
                `<li>#${item.rank} ${item.name} ${
                  item.rating ? `(${item.rating})` : ""
                }</li>`
            )
            .join("")}
        </ul>
      </div>

      <div class="card">
        <strong>Movement highlights</strong>
        ${
          deltas.length
            ? `<ul>${deltas
                .map(
                  (delta) =>
                    `<li>${delta.name} <span class="badge ${
                      delta.delta >= 0 ? "up" : "down"
                    }">${delta.delta >= 0 ? "+" : ""}${delta.delta}</span></li>`
                )
                .join("")}</ul>`
            : "<p>No movement detected yet.</p>"
        }
      </div>
    </body>
  </html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";

  if (!slug) {
    return Response.json({ error: "Missing report slug." }, { status: 400 });
  }

  const { data, error } = await getReportDataBySlug(slug);
  if (error || !data) {
    return Response.json({ error: error || "Report not found." }, { status: 404 });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const reportPage = await browser.newPage();
    await reportPage.setContent(renderReportHtml(data), { waitUntil: "load" });
    const pdfBuffer = await reportPage.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });
    await reportPage.close();
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${slug}-report.pdf\"`,
      },
    });
  } finally {
    await browser.close();
  }
}
