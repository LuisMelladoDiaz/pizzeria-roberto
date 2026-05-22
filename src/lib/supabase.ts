import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase. Copia .env.example a .env y completa los valores.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TicketStatus = 'waiting' | 'ready' | 'collected'

export interface Ticket {
  id: string
  ticket_code: string
  status: TicketStatus
  push_subscription: PushSubscriptionJSON | null
  created_at: string
  notified_at: string | null
  collected_at: string | null
}
