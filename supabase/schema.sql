-- ============================================================
--  ServiCall – Pizzería Roberto  |  Supabase schema
--  Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── tickets ─────────────────────────────────────────────────
CREATE TABLE public.tickets (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_code      TEXT        NOT NULL UNIQUE,
  status           TEXT        NOT NULL DEFAULT 'waiting'
                               CHECK (status IN ('waiting', 'ready', 'collected')),
  push_subscription JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at      TIMESTAMPTZ,
  collected_at     TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tickets_code    ON public.tickets (ticket_code);
CREATE INDEX idx_tickets_status  ON public.tickets (status);
CREATE INDEX idx_tickets_created ON public.tickets (created_at DESC);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous clients) can read tickets
CREATE POLICY "public_read" ON public.tickets
  FOR SELECT USING (true);

-- Anyone can create a ticket (client registers their code)
CREATE POLICY "public_insert" ON public.tickets
  FOR INSERT WITH CHECK (true);

-- Anyone can update (clients save push subscription; business updates status via Edge Function)
CREATE POLICY "public_update" ON public.tickets
  FOR UPDATE USING (true) WITH CHECK (true);

-- ── Realtime ─────────────────────────────────────────────────
-- Enable realtime for the tickets table so clients get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- ── Seed: business user ──────────────────────────────────────
-- Create the Pizzería Roberto business account in Supabase Auth.
-- Replace the password with a secure one matching VITE_BUSINESS_PASSWORD.
--
-- Run in the Supabase dashboard → Authentication → Users → "Add user"
-- OR via the Supabase CLI / API:
--
--   curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/admin/users \
--     -H "apikey: YOUR_SERVICE_ROLE_KEY" \
--     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"email":"roberto@pizzeria.com","password":"YOUR_PASSWORD","email_confirm":true}'
