import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, context } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set')
    }

    const systemPrompt = `You are the AI Smart Board assistant for a church financial system.
You will be provided with the current live state of the dashboard (members, ledger, funds) in JSON format.
Your job is to answer user questions about the data, or identify if the user wants to execute a specific action (like generating an invoice, drafting an email, viewing a chart, or generating a PDF report).

You must ALWAYS return your answer in valid JSON format matching this schema:
{
  "type": "answer" | "action",
  "message": "The text response to show the user. Always include this.",
  "action": "send_invoice" | "render_chart" | "draft_email" | "generate_pdf" | null,
  "payload": {} // specific data based on the action
}

Payload Schemas:
- send_invoice: { "memberName": "John Doe" }
- render_chart: { "title": "Chart Title", "data": [{ "name": "Category 1", "value": 100 }, { "name": "Category 2", "value": 200 }] }
- draft_email: { "to": "john@example.com", "subject": "Thank You", "body": "Dear John, ..." }
- generate_pdf: { "title": "Report Title", "summary": "Brief summary", "columns": ["Header1", "Header2"], "rows": [["Row1Col1", "Row1Col2"]] }

DASHBOARD CONTEXT:
${JSON.stringify(context, null, 2)}
`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to call Gemini API')
    }

    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!aiResponseText) {
        throw new Error('Invalid response from Gemini API')
    }

    // Attempt to parse the JSON
    let parsedResponse = {}
    try {
        parsedResponse = JSON.parse(aiResponseText)
    } catch (e) {
        // Fallback if the AI returned markdown JSON
        const match = aiResponseText.match(/```json\n([\s\S]*?)\n```/)
        if (match) {
            parsedResponse = JSON.parse(match[1])
        } else {
            parsedResponse = { type: 'answer', message: aiResponseText }
        }
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
