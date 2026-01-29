import { randomBytes } from "crypto";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      {
        error:
          "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your environment and restart the server.",
      },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "You must be signed in to create reports." },
      { status: 401 }
    );
  }

  const body = (await request.json()) as { cohortId?: string };
  const cohortId = body.cohortId?.trim();

  if (!cohortId) {
    return Response.json({ error: "Cohort ID is required." }, { status: 400 });
  }

  const slug = randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("localseo_reports").insert({
    owner_id: user.id,
    cohort_id: cohortId,
    slug,
    expires_at: expiresAt,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    slug,
    url: `/reports/${slug}`,
    expires_at: expiresAt,
  });
}
