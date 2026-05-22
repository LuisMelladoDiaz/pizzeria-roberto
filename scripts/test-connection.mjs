// Test de conexión a Supabase
// Ejecutar: node scripts/test-connection.mjs

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

// Parse .env manually (no dotenv needed)
const env = {}
readFileSync(envPath, 'utf-8')
  .split('\n')
  .filter(l => l && !l.startsWith('#'))
  .forEach(l => {
    const [k, ...rest] = l.split('=')
    if (k && rest.length) env[k.trim()] = rest.join('=').trim()
  })

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

console.log(`\n🔌  Conectando a ${SUPABASE_URL} ...\n`)

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { transport: ws },
})

// ── Test 1: conexión básica ──────────────────────────────────
try {
  const { data, error } = await supabase.from('tickets').select('count').limit(1)
  if (error) throw error
  console.log('✅  Test 1 – Conexión a Supabase: OK')
  console.log(`    Tabla "tickets" accesible. Respuesta: ${JSON.stringify(data)}`)
} catch (e) {
  console.error('❌  Test 1 – Conexión fallida:', e.message)
  console.error('    → Verifica que ejecutaste supabase/schema.sql en tu proyecto Supabase')
  process.exit(1)
}

// ── Test 2: insertar ticket de prueba ───────────────────────
const testCode = `TEST_${Date.now()}`
try {
  const { data, error } = await supabase
    .from('tickets')
    .insert({ ticket_code: testCode, status: 'waiting' })
    .select()
    .single()
  if (error) throw error
  console.log(`\n✅  Test 2 – INSERT ticket "${testCode}": OK`)
  console.log(`    ID generado: ${data.id}`)

  // ── Test 3: leer el ticket insertado ──────────────────────
  const { data: found, error: readErr } = await supabase
    .from('tickets')
    .select('*')
    .eq('ticket_code', testCode)
    .single()
  if (readErr) throw readErr
  console.log(`\n✅  Test 3 – SELECT por ticket_code: OK`)
  console.log(`    Status: ${found.status} | created_at: ${found.created_at}`)

  // ── Test 4: actualizar status ──────────────────────────────
  const { error: updateErr } = await supabase
    .from('tickets')
    .update({ status: 'ready' })
    .eq('ticket_code', testCode)
  if (updateErr) throw updateErr
  console.log(`\n✅  Test 4 – UPDATE status a "ready": OK`)

  // ── Cleanup ───────────────────────────────────────────────
  await supabase.from('tickets').delete().eq('ticket_code', testCode)
  console.log(`\n🧹  Ticket de prueba eliminado.`)

} catch (e) {
  console.error('\n❌  Test INSERT/SELECT/UPDATE fallido:', e.message)
  console.error('    → Verifica las políticas RLS en supabase/schema.sql')
  process.exit(1)
}

console.log('\n🎉  Todos los tests pasaron. La conexión a Supabase funciona correctamente.\n')
