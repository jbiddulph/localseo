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

  const { data: customer } = await supabase
    .from("localseo_customers")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    return Response.json(
      { error: "No billing profile found." },
      { status: 404 }
    );
  }

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: `${baseUrl}/dashboard`,
  });

  return Response.json({ url: portal.url });
}
