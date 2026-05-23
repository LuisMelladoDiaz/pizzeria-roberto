-- ============================================================
--  ServiCall – Limpieza automática a las 6 AM (hora española)
--  Ejecutar en Supabase SQL Editor DESPUÉS de hacer deploy de
--  la función cleanup-tickets.
-- ============================================================

-- Paso 1: habilitar la extensión pg_cron (solo en plan Pro)
-- Si estás en plan Free, usa la opción alternativa de abajo.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net; -- necesario para llamar la Edge Function vía HTTP

-- Paso 2: programar la llamada diaria a las 4:00 AM UTC
-- (= 6:00 AM CEST en verano / 5:00 AM CET en invierno)
-- Ajusta la hora si lo necesitas.
SELECT cron.schedule(
  'cleanup-servi-call-tickets',         -- nombre del job
  '0 4 * * *',                          -- cron: cada día a las 04:00 UTC
  $$
    SELECT net.http_post(
      url     := 'https://ztninuzhtkfznbhokvrs.supabase.co/functions/v1/cleanup-tickets',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer ' ||
                 current_setting('app.service_role_key', true) || '"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);

-- Para verificar que el job quedó registrado:
-- SELECT * FROM cron.job;

-- Para eliminarlo si necesitas cambiar algo:
-- SELECT cron.unschedule('cleanup-servi-call-tickets');

-- ============================================================
--  ALTERNATIVA SIN pg_cron (plan Free de Supabase):
-- ============================================================
-- Opción A: Vercel Cron Job
--   Añade esto a vercel.json:
--   "crons": [{ "path": "/api/cleanup", "schedule": "0 4 * * *" }]
--   Y crea api/cleanup.ts llamando a la Edge Function.
--
-- Opción B: GitHub Actions (gratis, muy fiable)
--   .github/workflows/cleanup.yml:
--   on:
--     schedule:
--       - cron: '0 4 * * *'
--   jobs:
--     cleanup:
--       runs-on: ubuntu-latest
--       steps:
--         - run: |
--             curl -X POST \
--               https://ztninuzhtkfznbhokvrs.supabase.co/functions/v1/cleanup-tickets \
--               -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
-- ============================================================
