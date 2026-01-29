import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { stripe } from "@/app/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json()) as { plan?: "monthly" | "yearly" };
  const plan = body.plan ?? "monthly";
  const priceId =
    plan === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;

  if (!priceId) {
    return Response.json(
      { error: "Missing Stripe price IDs." },
      { status: 500 }
    );
  }

  const { data: existingCustomer } = await supabase
    .from("localseo_customers")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = existingCustomer?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("localseo_customers")
      .insert({ id: user.id, stripe_customer_id: customerId });
  }

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
    subscription_data: {
      trial_period_days: 7,
      metadata: { user_id: user.id },
    },
  });

  return Response.json({ url: session.url });
}
