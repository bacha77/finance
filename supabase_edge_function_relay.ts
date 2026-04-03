
// ============================================================
// 📨 SUPABASE EDGE FUNCTION: send-invoice-relay
// Copy this code into your Supabase Edge Function editor
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = "re_ir63AG7B_axpVnUBgCg72XyrPJkdvcDab";

serve(async (req) => {
  // 1. Handle CORS (Allow your app to talk to this function)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { to, subject, html, fromName } = await req.json();

    // 2. Dispatch to Resend (Securely from the server)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <onboarding@resend.dev>`,
        to,
        subject,
        html,
      }),
    });

    const data = await res.json();
    
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 400,
    });
  }
});
