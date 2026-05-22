import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Ticket } from '../lib/supabase'

/* ── helpers ──────────────────────────────────────────────── */

function elapsedLabel(createdAt: string): string {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

/* ── LoginScreen ──────────────────────────────────────────── */

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError('Credenciales incorrectas. Verifica usuario y contraseña.')
    } else {
      onLogin()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <header className="bg-[#2A2A2A] py-4 px-6 flex items-center justify-center border-b border-[#F5C100]/20">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🍕</span>
          <h1
            className="text-[#F5C100] font-black text-xl"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Pizzería Roberto
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 select-none">🔐</div>
            <h2
              className="text-white font-black text-2xl mb-2"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              Panel de Cocina
            </h2>
            <p className="text-white/45 text-sm">Acceso exclusivo para el personal de Pizzería Roberto</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="roberto@pizzeria.com"
              autoComplete="email"
              className="w-full bg-[#2A2A2A] text-white py-4 px-5 rounded-2xl border-2 border-[#3A3A3A] focus:border-[#F5C100] focus:outline-none transition-colors placeholder:text-white/25"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="w-full bg-[#2A2A2A] text-white py-4 px-5 rounded-2xl border-2 border-[#3A3A3A] focus:border-[#F5C100] focus:outline-none transition-colors placeholder:text-white/25"
            />

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-xl text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-[#F5C100] text-[#1A1A1A] font-black text-lg py-5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 hover:bg-[#E8B800] shadow-lg shadow-[#F5C100]/20"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {loading ? '⏳ Entrando...' : '🔓 Entrar al Panel'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

/* ── TicketCard ───────────────────────────────────────────── */

interface TicketCardProps {
  ticket: Ticket
  onReady: (id: string) => Promise<void>
  onCollected: (id: string) => Promise<void>
  now: number
}

function TicketCard({ ticket, onReady, onCollected, now }: TicketCardProps) {
  const [busy, setBusy] = useState(false)
  const waitSecs = Math.floor((now - new Date(ticket.created_at).getTime()) / 1000)
  const isLong = waitSecs > 600 // 10 min warning
  const isReady = ticket.status === 'ready'

  const handleAction = async (fn: (id: string) => Promise<void>) => {
    setBusy(true)
    try {
      await fn(ticket.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`bg-[#2A2A2A] rounded-2xl p-5 border-2 transition-all ${
        isReady
          ? 'border-[#F5C100] shadow-[0_0_24px_rgba(245,193,0,0.18)]'
          : isLong
          ? 'border-[#E87722]/60'
          : 'border-[#3A3A3A]'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[#F5C100] font-black text-3xl tracking-[0.15em]"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {ticket.ticket_code}
            </span>
            {isReady && (
              <span className="bg-[#F5C100] text-[#1A1A1A] text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                LISTO
              </span>
            )}
          </div>
          <div
            className={`flex items-center gap-1.5 text-sm ${
              isReady ? 'text-[#F5C100]/80' : isLong ? 'text-[#E87722]' : 'text-white/45'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isReady ? 'bg-[#F5C100]' : isLong ? 'bg-[#E87722] animate-pulse' : 'bg-white/30 animate-pulse'
              }`}
            />
            <span>
              {isReady ? '¡Listo para recoger!' : `Esperando · ${elapsedLabel(ticket.created_at)}`}
              {isLong && !isReady && ' ⚠️'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {ticket.status === 'waiting' && (
          <button
            onClick={() => handleAction(onReady)}
            disabled={busy}
            className="flex-1 bg-[#F5C100] text-[#1A1A1A] font-black text-sm py-3.5 rounded-xl active:scale-95 disabled:opacity-50 transition-all shadow-sm"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {busy ? '⏳ Enviando...' : '🍕 Pedido Listo'}
          </button>
        )}
        {ticket.status === 'ready' && (
          <button
            onClick={() => handleAction(onCollected)}
            disabled={busy}
            className="flex-1 bg-emerald-600 text-white font-black text-sm py-3.5 rounded-xl active:scale-95 disabled:opacity-50 transition-all"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {busy ? '⏳ Cerrando...' : '✅ Recogido'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── BusinessView ─────────────────────────────────────────── */

export default function BusinessView() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [now, setNow] = useState(Date.now())

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setIsLoggedIn(true)
    })
  }, [])

  // 1-second ticker for elapsed time
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load tickets and subscribe to realtime
  const loadTickets = useCallback(async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['waiting', 'ready'])
      .order('created_at', { ascending: true })
    setTickets((data ?? []) as Ticket[])
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return

    loadTickets()

    const channel = supabase
      .channel('business_panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadTickets)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isLoggedIn, loadTickets])

  const handleReady = async (ticketId: string) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    try {
      // Call Edge Function — sends push + updates status atomically
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ticket_id: ticketId }),
        },
      )
      if (!res.ok) throw new Error(await res.text())
    } catch (err) {
      console.warn('Edge Function unavailable, falling back to direct update:', err)
      // Direct fallback (no push notification sent)
      await supabase
        .from('tickets')
        .update({ status: 'ready', notified_at: new Date().toISOString() })
        .eq('id', ticketId)
    }
  }

  const handleCollected = async (ticketId: string) => {
    await supabase
      .from('tickets')
      .update({ status: 'collected', collected_at: new Date().toISOString() })
      .eq('id', ticketId)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setTickets([])
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />
  }

  const waiting = tickets.filter((t) => t.status === 'waiting')
  const ready = tickets.filter((t) => t.status === 'ready')

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      {/* Sticky header */}
      <header className="bg-[#2A2A2A] py-4 px-5 border-b border-[#F5C100]/20 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🍕</span>
            <div>
              <h1
                className="text-[#F5C100] font-black text-base leading-tight"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                Panel de Cocina
              </h1>
              <p className="text-white/40 text-xs">Pizzería Roberto</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {waiting.length > 0 && (
              <div className="text-center">
                <div
                  className="text-[#F5C100] font-black text-2xl leading-none"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  {waiting.length}
                </div>
                <div className="text-white/40 text-xs">esperando</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-white/30 text-xs py-1.5 px-3 rounded-lg border border-white/10 hover:border-white/30 hover:text-white/60 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Ticket list */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-6xl mb-4 select-none">🎉</div>
            <p
              className="text-white font-black text-xl"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              ¡Sin pedidos pendientes!
            </p>
            <p className="text-white/35 text-sm mt-1">
              Los nuevos tickets aparecerán aquí en tiempo real
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Ready first */}
            {ready.length > 0 && (
              <>
                <p className="text-[#F5C100]/60 text-xs font-bold uppercase tracking-wider px-1">
                  Listos para recoger ({ready.length})
                </p>
                {ready.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onReady={handleReady}
                    onCollected={handleCollected}
                    now={now}
                  />
                ))}
              </>
            )}

            {/* Waiting */}
            {waiting.length > 0 && (
              <>
                <p className="text-white/35 text-xs font-bold uppercase tracking-wider px-1 mt-5">
                  En preparación ({waiting.length})
                </p>
                {waiting.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onReady={handleReady}
                    onCollected={handleCollected}
                    now={now}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
