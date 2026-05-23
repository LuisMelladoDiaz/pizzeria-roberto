// @ts-nocheck – Deno runtime (ver supabase/functions/send-notification/index.ts)
// Limpia todos los tickets abiertos (waiting/ready) del día anterior.
// Llamada por pg_cron a las 6 AM hora española (4 AM UTC en horario de verano).
// Deploy: supabase functions deploy cleanup-tickets

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Delete all tickets still open (waiting or ready)
    const { count, error } = await supabase
      .from('tickets')
      .delete({ count: 'exact' })
      .in('status', ['waiting', 'ready'])

    if (error) throw error

    const msg = `Limpieza completada: ${count ?? 0} tickets eliminados`
    console.log(msg)

    return new Response(
      JSON.stringify({ success: true, deleted: count ?? 0, message: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('cleanup-tickets error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
