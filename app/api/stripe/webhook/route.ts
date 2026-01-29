import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/app/lib/stripe/client";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = headers().get("stripe-signature");
  const body = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return new Response("Missing webhook secret.", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const handleSubscription = async (subscription: Stripe.Subscription) => {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const priceId = subscription.items.data[0]?.price.id ?? null;
    const ownerId = subscription.metadata.user_id ?? null;

    if (!ownerId) {
      const customer = await stripe.customers.retrieve(customerId);
      const userId =
        typeof customer !== "string" && customer.metadata.user_id
          ? customer.metadata.user_id
          : null;
      if (userId) {
        subscription.metadata.user_id = userId;
      }
    }

    const resolvedOwnerId = subscription.metadata.user_id;
    if (!resolvedOwnerId) {
      return;
    }

    await supabaseAdmin.from("localseo_subscriptions").upsert({
      owner_id: resolvedOwnerId,
      stripe_subscription_id: subscription.id,
      price_id: priceId,
      status: subscription.status,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await handleSubscription(subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscription(subscription);
      break;
    }
    default:
      break;
  }

  return new Response("ok", { status: 200 });
}
