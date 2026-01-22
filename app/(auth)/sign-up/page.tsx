"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    if (!data.session) {
      setStatus("idle");
      setMessage(
        "Check your inbox to confirm your email before signing in."
      );
      return;
    }

    setStatus("idle");
    router.push("/dashboard");
  };

  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
      <p className="text-xs uppercase tracking-[0.35em] text-[#8a836e]">
        Get started
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#101018]">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-[#4f4a3d]">
        Start tracking local rankings and competitor movement.
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
            placeholder="you@agency.com"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a836e]">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-inner outline-none focus:border-[#101018]/20"
            placeholder="Choose a strong password"
          />
        </label>

        {message ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-[#8b2f1b]">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-[#101018] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#101018]/20 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {status === "loading" ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[#4f4a3d]">
        Already have access?{" "}
        <Link className="font-semibold text-[#101018]" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
