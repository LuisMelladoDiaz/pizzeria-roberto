// @ts-nocheck – Este archivo corre en Deno (no Node.js).
// Para tipos correctos instala la extensión VS Code: denoland.vscode-deno
// Supabase Edge Function – send-notification (Deno runtime)
// Marks a ticket as "ready" and sends a Web Push notification to the client.
// Deploy: supabase functions deploy send-notification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as { ticket_id?: string }
    const { ticket_id } = body

    if (!ticket_id) {
      return new Response(
        JSON.stringify({ error: 'ticket_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl     = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    const vapidEmail      = Deno.env.get('VAPID_EMAIL') ?? 'admin@pizzeriaroberto.com'

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Mark ticket as ready and record notification timestamp
    const { data: ticket, error: updateErr } = await supabase
      .from('tickets')
      .update({ status: 'ready', notified_at: new Date().toISOString() })
      .eq('id', ticket_id)
      .select()
      .single()

    if (updateErr || !ticket) {
      throw new Error(`Error actualizando ticket: ${updateErr?.message ?? 'no encontrado'}`)
    }

    // Send Web Push only if the client has a stored subscription
    if (ticket.push_subscription && vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey)

      await webpush.sendNotification(
        ticket.push_subscription as webpush.PushSubscription,
        JSON.stringify({
          title: '🍕 ¡Tu pedido está listo!',
          body: `Pedido #${ticket.ticket_code as string} – Pasa a recogerlo en el mostrador`,
          ticket_code: ticket.ticket_code,
        }),
      )
    }

    return new Response(
      JSON.stringify({ success: true, ticket_code: ticket.ticket_code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('send-notification error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
