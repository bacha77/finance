import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com";

async function verifyPayPalSignature(req: Request, rawBody: string): Promise<boolean> {
  // If webhook verification secrets aren't configured yet, skip strict verification
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID) {
    return true;
  }

  try {
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    const tokenRes = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) return false;
    const { access_token } = await tokenRes.json();

    const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo"),
        cert_url: req.headers.get("paypal-cert-url"),
        transmission_id: req.headers.get("paypal-transmission-id"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    });

    if (!verifyRes.ok) return false;
    const verifyData = await verifyRes.json();
    return verifyData.verification_status === "SUCCESS";
  } catch (err) {
    console.error("PayPal webhook verification error:", err);
    return false;
  }
}

function computeNextEndDate(isAnnual: boolean, currentEndDate?: string | null): string {
  const now = new Date();
  let base = now;
  if (currentEndDate) {
    const parsed = new Date(currentEndDate);
    if (!isNaN(parsed.getTime()) && parsed > now) {
      base = parsed;
    }
  }
  const days = isAnnual ? 365 : 30;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  next.setUTCHours(23, 59, 59, 999);
  return next.toISOString();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const isVerified = await verifyPayPalSignature(req, rawBody);
    if (!isVerified) {
      return new Response(JSON.stringify({ error: "Invalid PayPal webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event.event_type || "";
    const resource = event.resource || {};

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse custom_id metadata if attached during checkout
    let churchId: string | null = null;
    let planId: string | null = null;
    let isAnnual = false;

    const rawCustomId =
      resource.custom_id ||
      resource.purchase_units?.[0]?.custom_id ||
      resource.supplementary_data?.related_ids?.order_id ||
      null;

    if (rawCustomId) {
      try {
        const parsed = JSON.parse(rawCustomId);
        churchId = parsed.churchId || null;
        planId = parsed.planId || null;
        isAnnual = Boolean(parsed.isAnnual);
      } catch {
        // Fallback if custom_id is a plain church UUID
        if (/^[0-9a-f-]{36}$/i.test(rawCustomId)) {
          churchId = rawCustomId;
        }
      }
    }

    const orderOrSubId =
      resource.supplementary_data?.related_ids?.order_id ||
      resource.billing_agreement_id ||
      resource.id ||
      "";

    // Look up church by paypal_order_id if churchId wasn't in custom_id
    if (!churchId && orderOrSubId) {
      const { data: matchedChurch } = await supabase
        .from("churches")
        .select("id, plan, subscription_end_date")
        .or(`paypal_order_id.eq.${orderOrSubId},paypal_order_id.eq.sub_${orderOrSubId}`)
        .maybeSingle();

      if (matchedChurch) {
        churchId = matchedChurch.id;
        planId = planId || matchedChurch.plan;
      }
    }

    if (!churchId) {
      return new Response(
        JSON.stringify({ received: true, status: "ignored_no_church_match", eventType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: church } = await supabase
      .from("churches")
      .select("id, name, plan, subscription_end_date")
      .eq("id", churchId)
      .maybeSingle();

    // 1. Payment capture or subscription renewal
    if (
      eventType === "PAYMENT.CAPTURE.COMPLETED" ||
      eventType === "BILLING.SUBSCRIPTION.ACTIVATED" ||
      eventType === "BILLING.SUBSCRIPTION.RENEWED" ||
      eventType === "PAYMENT.SALE.COMPLETED"
    ) {
      const amountValue = parseFloat(
        resource.amount?.value ||
          resource.amount?.total ||
          resource.billing_info?.last_payment?.amount?.value ||
          "0"
      );

      // Infer plan & annual cycle from amount if not explicitly provided
      const resolvedPlan =
        planId && planId !== "trial"
          ? planId
          : amountValue >= 300
          ? "growth"
          : "starter";
      const resolvedAnnual = isAnnual || amountValue >= 900;
      const nextEndDate = computeNextEndDate(resolvedAnnual, church?.subscription_end_date);

      await supabase
        .from("churches")
        .update({
          plan: resolvedPlan,
          subscription_end_date: nextEndDate,
          paypal_order_id: orderOrSubId || undefined,
          cancel_at_period_end: false,
        })
        .eq("id", churchId);

      // Idempotently log to admin_payments
      if (amountValue > 0 && orderOrSubId) {
        const { data: existingPayment } = await supabase
          .from("admin_payments")
          .select("id")
          .eq("church_id", churchId)
          .ilike("notes", `%${orderOrSubId}%`)
          .maybeSingle();

        if (!existingPayment) {
          await supabase.from("admin_payments").insert({
            church_id: churchId,
            amount: amountValue,
            payment_method: `PayPal (${resolvedAnnual ? "Annual" : "Monthly"})`,
            notes: `${resolvedPlan.toUpperCase()} Plan — PayPal Ref #${orderOrSubId}`,
          });
        }
      }

      return new Response(
        JSON.stringify({ received: true, updated: churchId, plan: resolvedPlan, nextEndDate }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Subscription cancelled / suspended / expired
    if (
      eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
      eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
      eventType === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      const updatePayload: Record<string, unknown> = {
        cancel_at_period_end: true,
      };
      if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
        updatePayload.subscription_end_date = new Date().toISOString();
      }

      await supabase.from("churches").update(updatePayload).eq("id", churchId);

      return new Response(
        JSON.stringify({ received: true, cancelled: churchId, eventType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ received: true, eventType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("PayPal Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal webhook error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

