-- ============================================================
--  ServiCall – Schema v2  |  Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── businesses ───────────────────────────────────────────────
CREATE TABLE public.businesses (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  logo_emoji  TEXT        NOT NULL DEFAULT '🍕',
  owner_email TEXT,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_public_read" ON public.businesses
  FOR SELECT USING (active = true);

-- ── tickets ──────────────────────────────────────────────────
CREATE TABLE public.tickets (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ticket_code       TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting', 'ready')),
  push_subscription JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at       TIMESTAMPTZ,
  -- code is unique per business (two businesses can have the same code)
  UNIQUE (ticket_code, business_id)
);

CREATE INDEX idx_tickets_biz_code   ON public.tickets (business_id, ticket_code);
CREATE INDEX idx_tickets_biz_status ON public.tickets (business_id, status);
CREATE INDEX idx_tickets_created    ON public.tickets (created_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
-- REPLICA IDENTITY FULL: DELETE events include full row data (needed for Realtime)
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

CREATE POLICY "tickets_public_read"   ON public.tickets FOR SELECT USING (true);
CREATE POLICY "tickets_public_insert" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "tickets_public_update" ON public.tickets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "tickets_public_delete" ON public.tickets FOR DELETE USING (true);

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;

-- ── Seed: Pizzería Roberto ────────────────────────────────────
INSERT INTO public.businesses (id, name, slug, description, logo_emoji, owner_email)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Pizzería Roberto',
  'pizzeria-roberto',
  'Las mejores pizzas de la ciudad',
  '🍕',
  'roberto@pizzeria.com'
);

-- ── Seed: business auth user ──────────────────────────────────
-- Create roberto@pizzeria.com in Supabase Auth:
-- Dashboard → Authentication → Users → Add user → Auto Confirm User ✓
-- Or via API (ver README).
