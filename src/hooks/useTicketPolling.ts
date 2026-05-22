import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Ticket } from '../lib/supabase'

export function useTicketPolling(
  ticketCode: string | null,
  onUpdate: (ticket: Ticket) => void,
  intervalMs = 4000,
) {
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    if (!ticketCode) return

    let alive = true

    const poll = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_code', ticketCode)
        .single()
      if (alive && data) callbackRef.current(data as Ticket)
    }

    poll()
    const id = window.setInterval(poll, intervalMs)

    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [ticketCode, intervalMs])
}
