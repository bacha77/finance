import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// TODO: Replace with your actual Resend API Key
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_placeholder_key';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    const email = record.email
    const id = record.id

    if (!email) {
      throw new Error('No email found in record')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Storehouse Finance <welcome@storehousefinance.net>',
        to: [email],
        subject: 'Welcome to Storehouse Finance! 🎉',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Welcome to Storehouse Finance!</h1>
            <p>Hi there,</p>
            <p>Thank you for signing up. We're thrilled to have you on board. Storehouse Finance is the all-in-one financial operating system for modern churches.</p>
            <p>Here are a few quick tips to get started:</p>
            <ul>
              <li><strong>Connect your bank accounts</strong> to seamlessly import transactions.</li>
              <li><strong>Invite your team</strong> from the Team Management tab.</li>
              <li><strong>Explore the AI Smartboard</strong> to get instant insights into your finances.</li>
            </ul>
            <p>If you have any questions, just reply to this email. We're here to help!</p>
            <br/>
            <p>Blessings,</p>
            <p><strong>The Storehouse Finance Team</strong></p>
          </div>
        `
      })
    })

    const data = await res.json()

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    )
  }
})
