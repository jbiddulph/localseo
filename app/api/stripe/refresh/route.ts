import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { stripe } from "@/app/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: customer, error: customerError } = await supabase
    .from("localseo_customers")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (customerError) {
    return Response.json({ error: customerError.message }, { status: 500 });
  }

  let customerId = customer?.stripe_customer_id ?? null;
  if (!customerId && user.email) {
    const existing = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    customerId = existing.data[0]?.id ?? null;
    if (customerId) {
      const { error: insertError } = await supabase
        .from("localseo_customers")
        .insert({ id: user.id, stripe_customer_id: customerId });
      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  if (!customerId) {
    return Response.json(
      { error: "No Stripe customer found for this account." },
      { status: 404 }
    );
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    expand: ["data.items.data.price"],
    limit: 5,
  });

  if (!subscriptions.data.length) {
    return Response.json(
      { error: "No Stripe subscriptions found for this account." },
      { status: 404 }
    );
  }

  const sorted = subscriptions.data.sort(
    (a, b) => (b.created ?? 0) - (a.created ?? 0)
  );
  const latest =
    sorted.find((subscription) => subscription.status !== "canceled") ??
    sorted[0];

  await supabase.from("localseo_subscriptions").upsert({
    owner_id: user.id,
    stripe_subscription_id: latest.id,
    price_id: latest.items.data[0]?.price.id ?? null,
    status: latest.status,
    current_period_end: latest.current_period_end
      ? new Date(latest.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: latest.cancel_at_period_end ?? false,
    trial_end: latest.trial_end
      ? new Date(latest.trial_end * 1000).toISOString()
      : null,
  });

  return Response.json({
    status: latest.status,
    subscription_id: latest.id,
  });
}
