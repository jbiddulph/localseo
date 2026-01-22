"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setStatus("ready");
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
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
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-sm text-[#4f4a3d] shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <p className="font-semibold text-[#101018]">
            Next: connect your first postcode cohort.
          </p>
          <p className="mt-2">
            We will store tracked postcodes in tables prefixed with
            <span className="font-semibold"> localseo_</span> when you are ready
            to persist data.
          </p>
        </div>
      </div>
    </div>
  );
}
