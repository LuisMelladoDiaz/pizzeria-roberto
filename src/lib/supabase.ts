import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase. Copia .env.example a .env y completa los valores.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TicketStatus = 'waiting' | 'ready'

export interface Business {
  id: string
  name: string
  slug: string
  description: string | null
  logo_emoji: string
  owner_email: string | null
  active: boolean
  created_at: string
}

export interface Ticket {
  id: string
  business_id: string
  ticket_code: string
  status: TicketStatus
  push_subscription: PushSubscriptionJSON | null
  created_at: string
  notified_at: string | null
}
