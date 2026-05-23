import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SORT_KEY } from '../lib/storage'
import type { Ticket, Business } from '../lib/supabase'

type SortMode = 'time' | 'alpha'

/* ── helpers ──────────────────────────────────────────────── */

function elapsedLabel(createdAt: string): string {
  const s = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

/* ── LoginScreen ──────────────────────────────────────────── */

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) setError('Credenciales incorrectas. Verifica usuario y contraseña.')
    else onLogin()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <header className="bg-[#2A2A2A] py-4 px-6 flex items-center justify-center border-b border-[#F5C100]/20">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🍕</span>
          <h1 className="text-[#F5C100] font-black text-xl" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Pizzería Roberto
          </h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 select-none">🔐</div>
            <h2 className="text-white font-black text-2xl mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Panel de Cocina
            </h2>
            <p className="text-white/45 text-sm">Acceso exclusivo para el personal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="roberto@pizzeria.com" autoComplete="email"
              className="w-full bg-[#2A2A2A] text-white py-4 px-5 rounded-2xl border-2 border-[#3A3A3A] focus:border-[#F5C100] focus:outline-none transition-colors placeholder:text-white/25" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" autoComplete="current-password"
              className="w-full bg-[#2A2A2A] text-white py-4 px-5 rounded-2xl border-2 border-[#3A3A3A] focus:border-[#F5C100] focus:outline-none transition-colors placeholder:text-white/25" />
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-xl text-center">
                ⚠️ {error}
              </div>
            )}
            <button type="submit" disabled={loading || !email || !password}
              className="w-full bg-[#F5C100] text-[#1A1A1A] font-black text-lg py-5 rounded-2xl disabled:opacity-40 transition-all active:scale-95"
              style={{ fontFamily: 'Nunito, sans-serif' }}>
              {loading ? '⏳ Entrando...' : '🔓 Entrar al Panel'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

/* ── TicketCard ───────────────────────────────────────────── */

interface CardProps {
  ticket: Ticket
  onCall: (id: string) => Promise<void>
  onFinalize: (id: string) => Promise<void>
  now: number
}

function TicketCard({ ticket, onCall, onFinalize, now }: CardProps) {
  const [busyCall, setBusyCall] = useState(false)
  const [busyFin, setBusyFin] = useState(false)
  const waitSecs = Math.floor((now - new Date(ticket.created_at).getTime()) / 1000)
  const isLong = waitSecs > 600
  const isReady = ticket.status === 'ready'

  return (
    <div className={`bg-[#2A2A2A] rounded-2xl p-5 border-2 transition-all ${
      isReady ? 'border-[#F5C100] shadow-[0_0_24px_rgba(245,193,0,0.18)]'
      : isLong ? 'border-[#E87722]/60' : 'border-[#3A3A3A]'}`}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#F5C100] font-black text-3xl tracking-[0.15em]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {ticket.ticket_code}
          </span>
          {isReady && (
            <span className="bg-[#F5C100] text-[#1A1A1A] text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
              LLAMADO
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${isReady ? 'text-[#F5C100]/80' : isLong ? 'text-[#E87722]' : 'text-white/45'}`}>
          <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-[#F5C100] animate-pulse' : isLong ? 'bg-[#E87722] animate-pulse' : 'bg-white/30 animate-pulse'}`} />
          <span>
            {isReady ? 'Cliente avisado · esperando recogida' : `En espera · ${elapsedLabel(ticket.created_at)}`}
            {isLong && !isReady && ' ⚠️'}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={async () => { setBusyCall(true); try { await onCall(ticket.id) } finally { setBusyCall(false) } }}
          disabled={busyCall || busyFin}
          className={`flex-1 font-black text-sm py-3.5 rounded-xl active:scale-95 disabled:opacity-50 transition-all ${
            isReady ? 'bg-[#E87722] text-white' : 'bg-[#F5C100] text-[#1A1A1A]'}`}
          style={{ fontFamily: 'Nunito, sans-serif' }}>
          {busyCall ? '⏳...' : isReady ? '🔔 Llamar de nuevo' : '🍕 Llamar'}
        </button>
        <button
          onClick={async () => { setBusyFin(true); try { await onFinalize(ticket.id) } finally { setBusyFin(false) } }}
          disabled={busyCall || busyFin}
          className="flex-1 bg-emerald-600 text-white font-black text-sm py-3.5 rounded-xl active:scale-95 disabled:opacity-50 transition-all"
          style={{ fontFamily: 'Nunito, sans-serif' }}>
          {busyFin ? '⏳...' : '✅ Finalizar'}
        </button>
      </div>
    </div>
  )
}

/* ── BusinessView ─────────────────────────────────────────── */

export default function BusinessView() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [now, setNow] = useState(Date.now())
  const [sortBy, setSortBy] = useState<SortMode>(
    () => (localStorage.getItem(SORT_KEY) as SortMode) ?? 'time',
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) setIsLoggedIn(true) })
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load business after login
  useEffect(() => {
    if (!isLoggedIn) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return
      supabase
        .from('businesses')
        .select('*')
        .eq('owner_email', user.email)
        .single()
        .then(({ data }) => { if (data) setBusiness(data as Business) })
    })
  }, [isLoggedIn])

  const loadTickets = useCallback(async () => {
    if (!business) return
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('business_id', business.id)
      .in('status', ['waiting', 'ready'])
      .order('created_at', { ascending: true })
    setTickets((data ?? []) as Ticket[])
  }, [business])

  useEffect(() => {
    if (!business) return
    loadTickets()
    const channel = supabase
      .channel(`panel:${business.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets',
        filter: `business_id=eq.${business.id}` }, loadTickets)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [business, loadTickets])

  const handleCall = async (ticketId: string) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (err) {
      console.warn('Edge Function unavailable, direct update:', err)
      await supabase.from('tickets').update({ status: 'ready', notified_at: new Date().toISOString() }).eq('id', ticketId)
    }
  }

  const handleFinalize = async (ticketId: string) => {
    await supabase.from('tickets').delete().eq('id', ticketId)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false); setBusiness(null); setTickets([])
  }

  const changeSort = (mode: SortMode) => {
    setSortBy(mode)
    localStorage.setItem(SORT_KEY, mode)
  }

  if (!isLoggedIn) return <LoginScreen onLogin={() => setIsLoggedIn(true)} />

  // Apply sort
  const sorted = [...tickets].sort((a, b) =>
    sortBy === 'alpha'
      ? a.ticket_code.localeCompare(b.ticket_code)
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const waiting = sorted.filter((t) => t.status === 'waiting')
  const ready = sorted.filter((t) => t.status === 'ready')

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <header className="bg-[#2A2A2A] py-3 px-5 border-b border-[#F5C100]/20 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{business?.logo_emoji ?? '🍕'}</span>
            <div>
              <h1 className="text-[#F5C100] font-black text-base leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Panel de Cocina
              </h1>
              <p className="text-white/40 text-xs">{business?.name ?? '…'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <div className="flex bg-[#1A1A1A] rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => changeSort('time')}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${sortBy === 'time' ? 'bg-[#F5C100] text-[#1A1A1A]' : 'text-white/40'}`}
              >
                🕐 Hora
              </button>
              <button
                onClick={() => changeSort('alpha')}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${sortBy === 'alpha' ? 'bg-[#F5C100] text-[#1A1A1A]' : 'text-white/40'}`}
              >
                🔤 A–Z
              </button>
            </div>

            {waiting.length > 0 && (
              <div className="text-center min-w-[2rem]">
                <div className="text-[#F5C100] font-black text-xl leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>{waiting.length}</div>
                <div className="text-white/40 text-[10px]">esp.</div>
              </div>
            )}

            <button onClick={handleLogout} className="text-white/30 text-xs py-1.5 px-2.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-6xl mb-4 select-none">🎉</div>
            <p className="text-white font-black text-xl" style={{ fontFamily: 'Nunito, sans-serif' }}>¡Sin pedidos pendientes!</p>
            <p className="text-white/35 text-sm mt-1">Los tickets aparecerán aquí en tiempo real</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ready.length > 0 && (
              <>
                <p className="text-[#F5C100]/60 text-xs font-bold uppercase tracking-wider px-1">
                  Llamados – esperando recogida ({ready.length})
                </p>
                {ready.map((t) => (
                  <TicketCard key={t.id} ticket={t} onCall={handleCall} onFinalize={handleFinalize} now={now} />
                ))}
              </>
            )}
            {waiting.length > 0 && (
              <>
                <p className="text-white/35 text-xs font-bold uppercase tracking-wider px-1 mt-5">
                  En preparación ({waiting.length})
                </p>
                {waiting.map((t) => (
                  <TicketCard key={t.id} ticket={t} onCall={handleCall} onFinalize={handleFinalize} now={now} />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
