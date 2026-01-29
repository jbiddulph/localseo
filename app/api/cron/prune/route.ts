import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_ALERT_RETENTION_DAYS = 120;
const BATCH_SIZE = 500;

function getRetentionDays(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(7, Math.min(parsed, 365));
}

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const secret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("secret");

  if (!secret || token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retentionDays = getRetentionDays(
    process.env.RETENTION_DAYS,
    DEFAULT_RETENTION_DAYS
  );
  const alertRetentionDays = getRetentionDays(
    process.env.ALERT_RETENTION_DAYS,
    DEFAULT_ALERT_RETENTION_DAYS
  );

  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const alertCutoff = new Date(
    Date.now() - alertRetentionDays * 24 * 60 * 60 * 1000
  ).toISOString();

  let deletedSnapshots = 0;
  let deletedAlerts = 0;

  while (true) {
    const { data: snapshots, error } = await supabaseAdmin
      .from("localseo_rank_snapshots")
      .select("id")
      .lt("created_at", cutoff)
      .limit(BATCH_SIZE);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!snapshots || snapshots.length === 0) {
      break;
    }

    const ids = snapshots.map((row) => row.id);
    const { error: deleteError } = await supabaseAdmin
      .from("localseo_rank_snapshots")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    deletedSnapshots += ids.length;
  }

  while (true) {
    const { data: alerts, error } = await supabaseAdmin
      .from("localseo_alerts")
      .select("id")
      .lt("created_at", alertCutoff)
      .limit(BATCH_SIZE);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!alerts || alerts.length === 0) {
      break;
    }

    const ids = alerts.map((row) => row.id);
    const { error: deleteError } = await supabaseAdmin
      .from("localseo_alerts")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    deletedAlerts += ids.length;
  }

  return Response.json({
    deletedSnapshots,
    deletedAlerts,
    retentionDays,
    alertRetentionDays,
  });
}
