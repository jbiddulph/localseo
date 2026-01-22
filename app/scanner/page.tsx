"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type Finding = {
  category: "SEO" | "GDPR & Privacy" | "Accessibility";
  severity: "low" | "medium" | "high";
  issue: string;
  recommendation: string;
};

type ScanResponse = {
  pages?: Array<{
    summary: {
      url: string;
      title: string | null;
      description: string | null;
    };
    findings: Finding[];
  }>;
  discovery?: {
    pagesFound: number;
    maxDepthFound: number;
    sampleUrls: string[];
  };
  pdfBase64?: string;
  screenshotBase64?: string | null;
  highlightCount?: number;
  error?: string;
};

const severityStyles: Record<Finding["severity"], string> = {
  high: "bg-[#fde8e3] text-[#8b2f1b]",
  medium: "bg-[#fef3c7] text-[#92400e]",
  low: "bg-[#e3f7ef] text-[#136a4b]",
};

export default function ScannerPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [authStatus, setAuthStatus] = useState<
    "loading" | "signed-in" | "signed-out"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fullScan, setFullScan] = useState(false);
  const [interactions, setInteractions] = useState(true);
  const [maxPages, setMaxPages] = useState("20");
  const [maxDepth, setMaxDepth] = useState("2");
  const [highlightLimit, setHighlightLimit] = useState("5");
  const [discovery, setDiscovery] = useState<ScanResponse["discovery"] | null>(
    null
  );
  const [pageSummaries, setPageSummaries] = useState<
    Array<{ url: string; count: number }>
  >([]);
  const [pageFindings, setPageFindings] = useState<
    Array<{ url: string; findings: Finding[] }>
  >([]);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [highlightCount, setHighlightCount] = useState<number | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthStatus(data.user ? "signed-in" : "signed-out");
    };

    loadUser();
  }, []);

  const handleScan = async () => {
    setStatus("loading");
    setError(null);
    setFindings([]);
    setPageFindings([]);
    setPageSummaries([]);
    setPdfBase64(null);
    setScreenshotBase64(null);
    setHighlightCount(null);
    setProgress(8);

    let interval: ReturnType<typeof setInterval> | null = null;
    interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(prev + Math.random() * 12, 90);
      });
    }, 500);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          mode: fullScan ? "full" : "single",
          maxPages: Number(maxPages),
          maxDepth: Number(maxDepth),
          interactions,
          highlightLimit: Number(highlightLimit),
        }),
      });

      const raw = await response.text();
      const payload = (raw ? JSON.parse(raw) : {}) as ScanResponse;
      if (!response.ok) {
        const detail = payload.error ?? raw;
        throw new Error(
          detail
            ? `Scan failed (${response.status}): ${detail}`
            : `Scan failed (${response.status}).`
        );
      }

      const pages = payload.pages ?? [];
      const flatFindings = pages.flatMap((page) => page.findings);
      setFindings(flatFindings);
      setPageFindings(
        pages.map((page) => ({
          url: page.summary.url,
          findings: page.findings,
        }))
      );
      setPageSummaries(
        pages.map((page) => ({
          url: page.summary.url,
          count: page.findings.length,
        }))
      );
      setPdfBase64(payload.pdfBase64 ?? null);
      setScreenshotBase64(payload.screenshotBase64 ?? null);
      setHighlightCount(payload.highlightCount ?? null);
      setStatus("ready");
      setProgress(100);
    } catch (scanError) {
      setStatus("error");
      setError(
        scanError instanceof Error ? scanError.message : "Scan failed."
      );
      setProgress(0);
    } finally {
      if (interval) {
        clearInterval(interval);
      }
    }
  };

  const handleDiscover = async () => {
    setError(null);
    setDiscovery(null);
    setIsDiscovering(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode: "discover" }),
      });
      const raw = await response.text();
      const payload = (raw ? JSON.parse(raw) : {}) as ScanResponse;
      if (!response.ok) {
        const detail = payload.error ?? raw;
        throw new Error(
          detail
            ? `Discover failed (${response.status}): ${detail}`
            : `Discover failed (${response.status}).`
        );
      }
      setDiscovery(payload.discovery ?? null);
    } catch (discoverError) {
      setError(
        discoverError instanceof Error
          ? discoverError.message
          : "Discovery failed."
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  const findingsSummary = useMemo(() => {
    if (!pageSummaries.length) return null;
    const total = pageSummaries.reduce((sum, item) => sum + item.count, 0);
    return `${pageSummaries.length} page(s), ${total} issue(s)`;
  }, [pageSummaries]);

  const handleDownload = () => {
    if (!pdfBase64) return;
    const link = document.createElement("a");
    const blob = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const file = new Blob([blob], { type: "application/pdf" });
    link.href = URL.createObjectURL(file);
    link.download = "local-seo-report.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-[#f8f4ef] px-6 py-12 text-[#1a1916]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
            Site Scanner
          </p>
          <h1 className="text-4xl font-semibold text-[#101018]">
            Scan any URL for SEO, privacy, and accessibility issues.
          </h1>
          <p className="text-base text-[#4f4a3d]">
            We provide quick, actionable checks so you can prioritise the fixes
            that matter.
          </p>
        </header>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_30px_60px_-45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
              Website URL
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
              />
            </label>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#4f4a3d]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fullScan}
                  onChange={(event) => setFullScan(event.target.checked)}
                  className="h-4 w-4 accent-[#101018]"
                />
                Full site scan (internal pages)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={interactions}
                  onChange={(event) => setInteractions(event.target.checked)}
                  className="h-4 w-4 accent-[#101018]"
                />
                Safe interactions (tabs, accordions)
              </label>
            </div>
            {fullScan ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                  Max pages
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxPages}
                    onChange={(event) => setMaxPages(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                  Max depth
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={maxDepth}
                    onChange={(event) => setMaxDepth(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                  Highlight limit
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={highlightLimit}
                    onChange={(event) => setHighlightLimit(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleDiscover}
                  disabled={authStatus !== "signed-in" || isDiscovering}
                  className="w-fit rounded-full border border-[#101018]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#101018] transition hover:border-[#101018] disabled:opacity-60"
                >
                  {isDiscovering ? "Discovering pages..." : "Discover pages"}
                </button>
              </div>
            ) : null}
            {!fullScan ? (
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
                Highlight limit
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={highlightLimit}
                  onChange={(event) => setHighlightLimit(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
                />
              </label>
            ) : null}
            {isDiscovering ? (
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-xs text-[#4f4a3d] shadow-inner">
                Discovering pages…
              </div>
            ) : null}
            {discovery ? (
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-[#4f4a3d] shadow-inner">
                <p>
                  Found {discovery.pagesFound} page(s) across{" "}
                  {discovery.maxDepthFound} level(s).
                </p>
                {discovery.sampleUrls.length ? (
                  <p className="mt-2 text-[11px] text-[#8a836e]">
                    Sample: {discovery.sampleUrls.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleScan}
                disabled={status === "loading" || authStatus !== "signed-in"}
                className="rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20 transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {status === "loading" ? "Scanning..." : "Run scan"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!pdfBase64}
                className="rounded-full border border-[#101018]/20 bg-white px-6 py-3 text-sm font-semibold text-[#101018] transition hover:border-[#101018] disabled:opacity-60"
              >
                Download PDF report
              </button>
            </div>
            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-[#8b2f1b]">
                {error}
              </p>
            ) : null}
            {authStatus === "signed-out" ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2 text-xs font-semibold text-amber-900">
                Please sign in to run scans.
              </p>
            ) : null}
            {status === "loading" ? (
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-[#4f4a3d] shadow-inner">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#8a836e]">
                  <span>Scanning</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-[#f1eadf]">
                  <div
                    className="h-2 rounded-full bg-[#101018] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_30px_60px_-45px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-[#8a836e]">
              Findings
            </p>
            <p className="text-xs text-[#8a836e]">
              {status === "ready" && findingsSummary
                ? findingsSummary
                : "No scan yet"}
            </p>
          </div>

          {status === "ready" && findings.length === 0 ? (
            <p className="mt-4 text-sm text-[#4f4a3d]">
              No critical issues detected. Nice work.
            </p>
          ) : null}

          <div className="mt-4 grid gap-4">
            {screenshotBase64 ? (
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                  Main page highlights
                </p>
                <p className="mt-2 text-xs text-[#4f4a3d]">
                  Showing up to {highlightCount ?? 0} highlighted elements.
                </p>
                <img
                  src={`data:image/png;base64,${screenshotBase64}`}
                  alt="Highlighted issues on the main page"
                  className="mt-3 w-full rounded-2xl border border-white/70"
                />
              </div>
            ) : null}
            {pageSummaries.length ? (
              <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-xs text-[#4f4a3d]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a836e]">
                  Per-page summary
                </p>
                <div className="mt-2 grid gap-2">
                  {pageSummaries.map((page) => (
                    <div
                      key={page.url}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="truncate">{page.url}</span>
                      <span className="text-[#8a836e]">{page.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {pageFindings.length
              ? pageFindings.map((page) => (
                  <div
                    key={page.url}
                    className="rounded-2xl border border-white/70 bg-white/90 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                      {page.url}
                    </p>
                    {page.findings.length ? (
                      <div className="mt-3 grid gap-3 text-sm text-[#4f4a3d]">
                        {page.findings.map((finding, index) => (
                          <div
                            key={`${finding.issue}-${index}`}
                            className="rounded-2xl border border-white/70 bg-white/80 p-4"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${severityStyles[finding.severity]}`}
                              >
                                {finding.severity}
                              </span>
                              <span className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                                {finding.category}
                              </span>
                            </div>
                            <p className="mt-2 font-semibold text-[#101018]">
                              {finding.issue}
                            </p>
                            <p className="mt-1">{finding.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[#4f4a3d]">
                        No issues detected on this page.
                      </p>
                    )}
                  </div>
                ))
              : findings.map((finding, index) => (
                  <div
                    key={`${finding.issue}-${index}`}
                    className="rounded-2xl border border-white/70 bg-white/90 p-4 text-sm text-[#4f4a3d]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${severityStyles[finding.severity]}`}
                      >
                        {finding.severity}
                      </span>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#8a836e]">
                        {finding.category}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-[#101018]">
                      {finding.issue}
                    </p>
                    <p className="mt-1">{finding.recommendation}</p>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
