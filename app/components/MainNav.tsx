"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export default function MainNav() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setIsSignedIn(Boolean(data.user));
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="w-full border-b border-white/70 bg-[#f8f4ef]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#101018] text-white">
            LS
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#4f4a3d]">
              Local SEO
            </p>
            <p className="text-lg font-semibold text-[#101018]">
              Rank Tracker
            </p>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-[#4f4a3d]">
          <Link className="transition hover:text-[#101018]" href="/#product">
            Product
          </Link>
          <Link className="transition hover:text-[#101018]" href="/#postcodes">
            Postcodes
          </Link>
          <Link className="transition hover:text-[#101018]" href="/#pricing">
            Pricing
          </Link>
          <Link className="transition hover:text-[#101018]" href="/insights">
            Rankings guide
          </Link>
          {isSignedIn ? (
            <Link className="transition hover:text-[#101018]" href="/scanner">
              Site scanner
            </Link>
          ) : null}
          <Link
            className="rounded-full border border-[#101018]/20 px-4 py-2 text-sm font-semibold text-[#101018] transition hover:border-[#101018]"
            href={isSignedIn ? "/dashboard" : "/sign-in"}
          >
            {isSignedIn ? "My Cohorts" : "Sign in"}
          </Link>
          <Link
            className="rounded-full border border-[#101018] px-5 py-2 text-[#101018] transition hover:bg-[#101018] hover:text-white"
            href="/sign-up"
          >
            Start tracking
          </Link>
        </nav>
      </div>
    </div>
  );
}
