import { chromium } from "playwright";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Finding = {
  category: "SEO" | "GDPR & Privacy" | "Accessibility";
  severity: "low" | "medium" | "high";
  issue: string;
  recommendation: string;
};

type ScanSummary = {
  url: string;
  title: string | null;
  description: string | null;
  h1Count: number;
  canonical: string | null;
  hasRobotsMeta: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  missingImageAltCount: number;
  unlabeledFormFieldCount: number;
  unlabeledButtonCount: number;
  hasPrivacyLink: boolean;
  hasCookieLink: boolean;
  hasTermsLink: boolean;
  hasCookieBannerSignals: boolean;
  hasLangAttribute: boolean;
};

type ScanPageResult = {
  summary: ScanSummary;
  findings: Finding[];
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

function buildFindings(summary: ScanSummary): Finding[] {
  const findings: Finding[] = [];

  if (!summary.title) {
    findings.push({
      category: "SEO",
      severity: "high",
      issue: "Missing <title> tag.",
      recommendation: "Add a concise title that includes your primary keyword.",
    });
  } else if (summary.title.length < 15 || summary.title.length > 65) {
    findings.push({
      category: "SEO",
      severity: "medium",
      issue: "Title length is outside the recommended range (15–65 chars).",
      recommendation: "Adjust the title length for better SERP visibility.",
    });
  }

  if (!summary.description) {
    findings.push({
      category: "SEO",
      severity: "medium",
      issue: "Missing meta description.",
      recommendation:
        "Add a 150–160 character summary that explains your core offer.",
    });
  }

  if (summary.h1Count === 0) {
    findings.push({
      category: "SEO",
      severity: "high",
      issue: "No H1 heading found.",
      recommendation: "Add a single H1 that matches the page intent.",
    });
  } else if (summary.h1Count > 1) {
    findings.push({
      category: "SEO",
      severity: "low",
      issue: "Multiple H1 headings detected.",
      recommendation: "Keep one primary H1 per page for clarity.",
    });
  }

  if (!summary.canonical) {
    findings.push({
      category: "SEO",
      severity: "low",
      issue: "Missing canonical link tag.",
      recommendation: "Add a canonical URL to avoid duplicate content issues.",
    });
  }

  if (!summary.hasOgTitle || !summary.hasOgDescription || !summary.hasOgImage) {
    findings.push({
      category: "SEO",
      severity: "low",
      issue: "Open Graph tags are incomplete.",
      recommendation: "Add og:title, og:description, and og:image tags.",
    });
  }

  if (summary.missingImageAltCount > 0) {
    findings.push({
      category: "Accessibility",
      severity: "medium",
      issue: `${summary.missingImageAltCount} image(s) missing alt text.`,
      recommendation: "Add descriptive alt text to important images.",
    });
  }

  if (summary.unlabeledFormFieldCount > 0) {
    findings.push({
      category: "Accessibility",
      severity: "high",
      issue: `${summary.unlabeledFormFieldCount} form field(s) lack labels.`,
      recommendation:
        "Ensure inputs have labels or aria-labels for screen readers.",
    });
  }

  if (summary.unlabeledButtonCount > 0) {
    findings.push({
      category: "Accessibility",
      severity: "medium",
      issue: `${summary.unlabeledButtonCount} button(s) have no accessible name.`,
      recommendation: "Add visible text or aria-labels to buttons.",
    });
  }

  if (!summary.hasLangAttribute) {
    findings.push({
      category: "Accessibility",
      severity: "low",
      issue: "Missing lang attribute on <html>.",
      recommendation: "Add the correct language attribute to the html tag.",
    });
  }

  if (!summary.hasPrivacyLink) {
    findings.push({
      category: "GDPR & Privacy",
      severity: "high",
      issue: "No privacy policy link detected.",
      recommendation: "Add a visible privacy policy link in the footer.",
    });
  }

  if (!summary.hasCookieLink) {
    findings.push({
      category: "GDPR & Privacy",
      severity: "medium",
      issue: "No cookie policy link detected.",
      recommendation: "Add a cookie policy page or cookie notice link.",
    });
  }

  if (!summary.hasTermsLink) {
    findings.push({
      category: "GDPR & Privacy",
      severity: "low",
      issue: "No terms link detected.",
      recommendation: "Add terms of service if you collect user data.",
    });
  }

  if (!summary.hasCookieBannerSignals) {
    findings.push({
      category: "GDPR & Privacy",
      severity: "medium",
      issue: "No cookie consent banner detected.",
      recommendation:
        "Add a consent banner if you use cookies or tracking scripts.",
    });
  }

  return findings;
}

async function runSafeInteractions(page: import("playwright").Page) {
  const selectors = [
    "details > summary",
    "[role='tab']",
    "[aria-controls]",
  ];

  for (const selector of selectors) {
    const elements = await page.$$(selector);
    const limited = elements.slice(0, 10);
    for (const element of limited) {
      try {
        await element.click({ timeout: 1000 });
      } catch {
        // Ignore interaction errors to keep scanning stable.
      }
    }
  }
}

async function scanPage(
  page: import("playwright").Page,
  url: string,
  interactions: boolean
): Promise<ScanPageResult> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  if (interactions) {
    await runSafeInteractions(page);
  }

  const summary = await page.evaluate(() => {
    const textIncludes = (value: string) =>
      document.body?.innerText?.toLowerCase().includes(value) ?? false;

    const title = document.title || null;
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute(
        "content"
      ) ?? null;
    const h1Count = document.querySelectorAll("h1").length;
    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
      null;
    const hasRobotsMeta =
      !!document.querySelector('meta[name="robots"]')?.getAttribute("content");
    const hasOgTitle = !!document.querySelector('meta[property="og:title"]');
    const hasOgDescription = !!document.querySelector(
      'meta[property="og:description"]'
    );
    const hasOgImage = !!document.querySelector('meta[property="og:image"]');

    const images = Array.from(document.querySelectorAll("img"));
    const missingImageAltCount = images.filter((img) => {
      const alt = img.getAttribute("alt");
      return !alt || alt.trim().length === 0;
    }).length;

    const hasLabel = (input: HTMLInputElement | HTMLTextAreaElement) => {
      const id = input.id;
      if (id && document.querySelector(`label[for="${id}"]`)) {
        return true;
      }
      if (input.closest("label")) {
        return true;
      }
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      return Boolean(ariaLabel || ariaLabelledBy);
    };

    const formFields = Array.from(
      document.querySelectorAll("input, textarea, select")
    ).filter((field) => {
      if (field instanceof HTMLInputElement && field.type === "hidden") {
        return false;
      }
      return true;
    }) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

    const unlabeledFormFieldCount = formFields.filter((field) => {
      if (field instanceof HTMLSelectElement) {
        const id = field.id;
        if (id && document.querySelector(`label[for="${id}"]`)) {
          return false;
        }
        if (field.closest("label")) {
          return false;
        }
        const ariaLabel = field.getAttribute("aria-label");
        const ariaLabelledBy = field.getAttribute("aria-labelledby");
        return !(ariaLabel || ariaLabelledBy);
      }
      return !hasLabel(field as HTMLInputElement | HTMLTextAreaElement);
    }).length;

    const buttons = Array.from(document.querySelectorAll("button"));
    const unlabeledButtonCount = buttons.filter((button) => {
      const text = button.textContent?.trim() ?? "";
      const ariaLabel = button.getAttribute("aria-label");
      return !text && !ariaLabel;
    }).length;

    const links = Array.from(document.querySelectorAll("a")).map(
      (link) =>
        `${link.getAttribute("href") ?? ""} ${link.textContent ?? ""}`.toLowerCase()
    );

    const hasPrivacyLink = links.some((link) => link.includes("privacy"));
    const hasCookieLink = links.some((link) => link.includes("cookie"));
    const hasTermsLink = links.some((link) => link.includes("terms"));
    const hasCookieBannerSignals =
      textIncludes("cookie") &&
      (textIncludes("consent") ||
        textIncludes("accept") ||
        textIncludes("preferences"));

    const hasLangAttribute = !!document.documentElement.getAttribute("lang");

    return {
      title,
      description,
      h1Count,
      canonical,
      hasRobotsMeta,
      hasOgTitle,
      hasOgDescription,
      hasOgImage,
      missingImageAltCount,
      unlabeledFormFieldCount,
      unlabeledButtonCount,
      hasPrivacyLink,
      hasCookieLink,
      hasTermsLink,
      hasCookieBannerSignals,
      hasLangAttribute,
    };
  });

  const fullSummary: ScanSummary = { url, ...summary };
  const findings = buildFindings(fullSummary);
  return { summary: fullSummary, findings };
}

async function highlightAndScreenshot(
  page: import("playwright").Page,
  url: string,
  highlightLimit: number,
  interactions: boolean
) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  if (interactions) {
    await runSafeInteractions(page);
  }

  await page.addStyleTag({
    content:
      "[data-localseo-highlight='1']{outline:2px dashed #f5b301;outline-offset:2px;}body{scroll-behavior:auto !important;}",
  });

  const highlightedCount = await page.evaluate((limit) => {
    const highlights: Element[] = [];
    const addElements = (elements: Element[]) => {
      for (const element of elements) {
        if (highlights.length >= limit) break;
        if (!highlights.includes(element)) {
          highlights.push(element);
        }
      }
    };

    const missingAltImages = Array.from(
      document.querySelectorAll("img:not([alt]), img[alt='']")
    );
    addElements(missingAltImages);

    const formFields = Array.from(
      document.querySelectorAll("input, textarea, select")
    ).filter((field) => {
      if (field instanceof HTMLInputElement && field.type === "hidden") {
        return false;
      }
      return true;
    });

    const unlabeledFields = formFields.filter((field) => {
      if (field instanceof HTMLSelectElement) {
        const id = field.id;
        if (id && document.querySelector(`label[for=\"${id}\"]`)) {
          return false;
        }
        if (field.closest("label")) {
          return false;
        }
        const ariaLabel = field.getAttribute("aria-label");
        const ariaLabelledBy = field.getAttribute("aria-labelledby");
        return !(ariaLabel || ariaLabelledBy);
      }

      const input = field as HTMLInputElement | HTMLTextAreaElement;
      const id = input.id;
      if (id && document.querySelector(`label[for=\"${id}\"]`)) {
        return false;
      }
      if (input.closest("label")) {
        return false;
      }
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      return !(ariaLabel || ariaLabelledBy);
    });
    addElements(unlabeledFields);

    const unlabeledButtons = Array.from(
      document.querySelectorAll("button")
    ).filter((button) => {
      const text = button.textContent?.trim() ?? "";
      const ariaLabel = button.getAttribute("aria-label");
      return !text && !ariaLabel;
    });
    addElements(unlabeledButtons);

    highlights.slice(0, limit).forEach((element) => {
      element.setAttribute("data-localseo-highlight", "1");
    });

    return highlights.length;
  }, Math.max(highlightLimit, 0));

  const screenshotBuffer = await page.screenshot({ fullPage: true });
  return {
    screenshotBase64: screenshotBuffer.toString("base64"),
    highlightedCount,
  };
}

async function discoverLinks(
  page: import("playwright").Page,
  baseUrl: string,
  maxPages: number,
  maxDepth: number,
  timeLimitMs: number
) {
  const base = new URL(baseUrl);
  const origin = base.origin;
  const queue: Array<{ url: string; depth: number }> = [
    { url: normalizeUrl(baseUrl), depth: 0 },
  ];
  const visited = new Set<string>();
  let maxDepthFound = 0;
  const start = Date.now();

  while (queue.length > 0 && visited.size < maxPages) {
    if (Date.now() - start > timeLimitMs) break;
    const next = queue.shift();
    if (!next) break;
    if (visited.has(next.url)) continue;
    if (next.depth > maxDepth) continue;

    visited.add(next.url);
    maxDepthFound = Math.max(maxDepthFound, next.depth);

    try {
      await page.goto(next.url, { waitUntil: "domcontentloaded", timeout: 20000 });
      const links = await page.$$eval("a[href]", (anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute("href") || "")
          .filter(Boolean)
      );

      for (const href of links) {
        const resolved = new URL(href, next.url);
        if (resolved.origin !== origin) continue;
        if (resolved.pathname.startsWith("/api")) continue;
        const normalized = normalizeUrl(resolved.toString());
        if (visited.has(normalized)) continue;
        queue.push({ url: normalized, depth: next.depth + 1 });
      }
    } catch {
      // Ignore crawl errors and continue.
    }
  }

  const urls = Array.from(visited);

  return {
    pagesFound: urls.length,
    maxDepthFound,
    urls,
    sampleUrls: urls.slice(0, 10),
  };
}

function renderReportHtml(
  pages: ScanPageResult[],
  screenshotBase64?: string,
  highlightCount?: number
) {
  const tips = [
    "Aim for one primary keyword per page and align it with the H1 + title.",
    "Keep titles under 60–65 characters and descriptions under 160.",
    "Add clear footer links to Privacy, Cookies, and Terms pages.",
    "Ensure form inputs and buttons have accessible labels.",
  ];

  const totalFindings = pages.reduce(
    (sum, page) => sum + page.findings.length,
    0
  );

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Local SEO Scan Report</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1a1916; padding: 32px; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        h2 { margin-top: 24px; font-size: 18px; }
        h3 { margin-top: 18px; font-size: 16px; }
        .meta { color: #6f675a; font-size: 12px; }
        .card { border: 1px solid #e8e0d5; border-radius: 12px; padding: 16px; margin-top: 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
        .high { background: #fde8e3; color: #8b2f1b; }
        .medium { background: #fef3c7; color: #92400e; }
        .low { background: #e3f7ef; color: #136a4b; }
        ul { padding-left: 18px; }
        li { margin-bottom: 8px; }
        pre { background: #f6f3ee; padding: 12px; border-radius: 10px; overflow-x: auto; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>Local SEO Scan Report</h1>
      <div class="meta">Pages scanned: ${pages.length}</div>
      <div class="meta">Total findings: ${totalFindings}</div>
      <div class="card">
        <strong>Quick wins</strong>
        <ul>
          ${tips.map((tip) => `<li>${tip}</li>`).join("")}
        </ul>
      </div>
      <div class="card">
        <strong>Helpful code snippets</strong>
        <p class="meta">Example: SEO basics</p>
        <pre>&lt;title&gt;Emergency Dentist in Soho | BrightSmile&lt;/title&gt;
&lt;meta name="description" content="24/7 emergency dental care in Soho. Book same-day appointments and check availability." /&gt;
&lt;link rel="canonical" href="https://example.com" /&gt;
&lt;meta property="og:title" content="Emergency Dentist in Soho" /&gt;
&lt;meta property="og:description" content="Fast local care in Soho." /&gt;
&lt;meta property="og:image" content="https://example.com/og.jpg" /&gt;</pre>
        <p class="meta">Example: accessibility labels</p>
        <pre>&lt;label for="email"&gt;Email&lt;/label&gt;
&lt;input id="email" name="email" type="email" /&gt;
&lt;button aria-label="Submit form"&gt;Send&lt;/button&gt;</pre>
      </div>
      ${
        screenshotBase64
          ? `<div class="card">
        <strong>Highlighted issues (main page)</strong>
        <div class="meta">Showing up to ${highlightCount ?? 0} highlighted elements.</div>
        <img src="data:image/png;base64,${screenshotBase64}" style="width:100%; border-radius:12px; margin-top:12px;" />
      </div>`
          : ""
      }
      ${pages
        .map((page) => {
          const grouped = page.findings.reduce<Record<string, Finding[]>>(
            (acc, item) => {
              acc[item.category] = acc[item.category] || [];
              acc[item.category].push(item);
              return acc;
            },
            {}
          );

          return `
        <h2>${page.summary.url}</h2>
        <div class="meta">Title: ${page.summary.title ?? "—"}</div>
        <div class="meta">Meta description: ${page.summary.description ?? "—"}</div>
        <div class="card">
          <strong>Snapshot</strong>
          <ul>
            <li>H1 count: ${page.summary.h1Count}</li>
            <li>Canonical: ${page.summary.canonical ?? "—"}</li>
            <li>Open Graph: ${page.summary.hasOgTitle ? "OG Title" : "Missing OG Title"}, ${
              page.summary.hasOgDescription
                ? "OG Description"
                : "Missing OG Description"
            }, ${page.summary.hasOgImage ? "OG Image" : "Missing OG Image"}</li>
            <li>Images missing alt: ${page.summary.missingImageAltCount}</li>
            <li>Unlabeled fields: ${page.summary.unlabeledFormFieldCount}</li>
            <li>Unlabeled buttons: ${page.summary.unlabeledButtonCount}</li>
          </ul>
        </div>
        ${Object.keys(grouped)
          .map(
            (category) => `
          <h3>${category}</h3>
          ${grouped[category]
            .map(
              (item) => `
            <div class="card">
              <span class="badge ${item.severity}">${item.severity}</span>
              <div><strong>${item.issue}</strong></div>
              <div>${item.recommendation}</div>
            </div>
          `
            )
            .join("")}
        `
          )
          .join("")}
      `;
        })
        .join("")}
    </body>
  </html>`;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "You must be signed in to run scans." },
      { status: 401 }
    );
  }

  const body = (await request.json()) as {
    url?: string;
    mode?: "single" | "full" | "discover";
    maxPages?: number;
    maxDepth?: number;
    interactions?: boolean;
    highlightLimit?: number;
  };

  const targetUrl = body.url?.trim() ?? "";
  const mode = body.mode ?? "single";
  const maxPages =
    typeof body.maxPages === "number" && Number.isFinite(body.maxPages)
      ? Math.max(1, Math.min(body.maxPages, 50))
      : 20;
  const maxDepth =
    typeof body.maxDepth === "number" && Number.isFinite(body.maxDepth)
      ? Math.max(0, Math.min(body.maxDepth, 3))
      : 2;
  const interactions = Boolean(body.interactions);
  const highlightLimit =
    typeof body.highlightLimit === "number" &&
    Number.isFinite(body.highlightLimit)
      ? Math.max(0, Math.min(body.highlightLimit, 10))
      : 5;

  if (!isValidUrl(targetUrl)) {
    return Response.json(
      { error: "Please provide a valid http(s) URL." },
      { status: 400 }
    );
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    if (mode === "discover") {
      const discovery = await discoverLinks(
        page,
        targetUrl,
        40,
        3,
        60000
      );
      await page.close();

      return Response.json({
        discovery,
      });
    }

    const scanPages: ScanPageResult[] = [];
    let screenshotBase64: string | null = null;
    let highlightedCount = 0;

    if (mode === "full") {
      const discovery = await discoverLinks(
        page,
        targetUrl,
        maxPages,
        maxDepth,
        120000
      );

      for (const url of discovery.urls) {
        const result = await scanPage(page, url, interactions);
        scanPages.push(result);
      }
    } else {
      const result = await scanPage(page, targetUrl, interactions);
      scanPages.push(result);
    }

    if (highlightLimit > 0) {
      const highlightPage = await browser.newPage();
      const highlightResult = await highlightAndScreenshot(
        highlightPage,
        targetUrl,
        highlightLimit,
        interactions
      );
      screenshotBase64 = highlightResult.screenshotBase64;
      highlightedCount = highlightResult.highlightedCount;
      await highlightPage.close();
    }

    const reportHtml = renderReportHtml(
      scanPages,
      screenshotBase64 ?? undefined,
      highlightedCount
    );
    const reportPage = await browser.newPage();
    await reportPage.setContent(reportHtml, { waitUntil: "load" });
    const pdfBuffer = await reportPage.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await reportPage.close();
    await page.close();
    await browser.close();

    return Response.json({
      pages: scanPages,
      pdfBase64: pdfBuffer.toString("base64"),
      screenshotBase64,
      highlightCount: highlightedCount,
    });
  } catch (error) {
    console.error("Scan failed:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Scan failed.",
      },
      { status: 500 }
    );
  }
}
