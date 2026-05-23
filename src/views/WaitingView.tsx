import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTicketPolling } from '../hooks/useTicketPolling'
import { removeStoredTicket } from '../lib/storage'
import type { Ticket, Business } from '../lib/supabase'

function playReadySound() {
  try {
    const ctx = new AudioContext()
    ;[880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18)
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.18 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.55)
      osc.start(ctx.currentTime + i * 0.18)
      osc.stop(ctx.currentTime + i * 0.18 + 0.6)
    })
  } catch { /* no AudioContext */ }
}

function vibrateDevice() {
  if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 300])
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

export default function WaitingView() {
  const { businessSlug, ticketCode } = useParams<{ businessSlug: string; ticketCode: string }>()
  const navigate = useNavigate()

  const [business, setBusiness] = useState<Business | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const notifiedRef = useRef(false)
  const ticketRef = useRef<Ticket | null>(null)
  const businessRef = useRef<Business | null>(null)
  const pushSupported = useRef('serviceWorker' in navigator && 'PushManager' in window)

  useEffect(() => { ticketRef.current = ticket }, [ticket])
  useEffect(() => { businessRef.current = business }, [business])

  const handleFinalized = useCallback(() => {
    if (businessRef.current && ticketCode) {
      removeStoredTicket(businessRef.current.id, ticketCode)
    }
    setIsFinalized(true)
  }, [ticketCode])

  const handleTicketUpdate = useCallback((updated: Ticket) => {
    setTicket(updated)
    if (updated.status === 'ready' && !notifiedRef.current) {
      notifiedRef.current = true
      setIsReady(true)
    }
  }, [])

  // Polling fallback when push not supported
  useTicketPolling(
    !pushSupported.current && businessRef.current ? ticketCode ?? null : null,
    handleTicketUpdate,
    4000,
  )

  // Looping alarm while client is being called
  useEffect(() => {
    if (!isReady) return
    playReadySound(); vibrateDevice()
    const id = window.setInterval(() => { playReadySound(); vibrateDevice() }, 4000)
    return () => window.clearInterval(id)
  }, [isReady])

  // Load business + ticket, set up Realtime
  useEffect(() => {
    if (!businessSlug || !ticketCode) { navigate('/cliente'); return }
    let cancelled = false

    const init = async () => {
      // Load business
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', businessSlug)
        .maybeSingle()
      if (cancelled) return
      if (!biz) { navigate('/cliente/negocios'); return }
      setBusiness(biz as Business)

      // Load ticket
      const { data: t } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_code', ticketCode)
        .eq('business_id', (biz as Business).id)
        .maybeSingle()
      if (cancelled) return

      if (!t) { handleFinalized(); setLoading(false); return }

      const ticket = t as Ticket
      setTicket(ticket)
      if (ticket.status === 'ready' && !notifiedRef.current) {
        notifiedRef.current = true; setIsReady(true)
      }
      setLoading(false)
    }

    init()

    // Realtime: UPDATE + DELETE
    const channel = supabase
      .channel(`waiting:${businessSlug}:${ticketCode}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tickets',
        filter: `ticket_code=eq.${ticketCode}`,
      }, (payload) => handleTicketUpdate(payload.new as Ticket))
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'tickets',
      }, (payload) => {
        const deletedId = (payload.old as Partial<Ticket>).id
        if (deletedId && deletedId === ticketRef.current?.id) handleFinalized()
      })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [businessSlug, ticketCode, navigate, handleTicketUpdate, handleFinalized])

  // Elapsed timer
  useEffect(() => {
    if (!ticket) return
    const origin = new Date(ticket.created_at).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - origin) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [ticket])

  const handleAcknowledge = async () => {
    if (!ticket) return
    await supabase.from('tickets').update({ status: 'waiting' }).eq('id', ticket.id)
    notifiedRef.current = false
    setIsReady(false)
  }

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-5xl animate-spin">⏳</div>
      </div>
    )
  }

  const Header = () => (
    <header className="bg-[#2A2A2A] py-4 px-6 flex items-center gap-3 border-b border-[#F5C100]/20">
      <button onClick={() => navigate('/cliente/mis-tickets')} className="text-white/40 hover:text-white transition-colors text-xl">
        ‹
      </button>
      <span className="text-3xl">{business?.logo_emoji ?? '🍕'}</span>
      <h1 className="text-[#F5C100] font-black text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>
        {business?.name}
      </h1>
    </header>
  )

  /* ── Finalized ───────────────────────────────────────────── */
  if (isFinalized) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="text-7xl mb-6 select-none">🎉</div>
          <h2 className="text-white font-black text-2xl mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
            ¡Pedido completado!
          </h2>
          <p className="text-white/50 text-sm mb-10">Tu ticket fue cerrado. ¡Que lo disfrutes!</p>
          <button
            onClick={() => navigate('/cliente/mis-tickets')}
            className="bg-[#2A2A2A] border-2 border-[#F5C100]/40 text-white/60 font-bold px-8 py-4 rounded-2xl active:scale-95 transition-all"
          >
            ← Mis tickets
          </button>
        </main>
      </div>
    )
  }

  /* ── Called (READY) ──────────────────────────────────────── */
  if (isReady) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="text-8xl mb-6 animate-bounce select-none">🍕</div>
          <div className="bg-[#F5C100] text-[#1A1A1A] rounded-3xl px-8 py-7 mb-6 w-full max-w-xs shadow-[0_0_50px_rgba(245,193,0,0.35)] animate-fade-in-up">
            <p className="font-black text-3xl mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
              ¡Tu pedido está listo!
            </p>
            <p className="font-bold text-base opacity-70 mb-3">Pasa a recogerlo en el mostrador</p>
            <div className="bg-[#1A1A1A]/15 rounded-2xl px-4 py-2 inline-block">
              <span className="font-black text-4xl tracking-[0.2em]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {ticketCode}
              </span>
            </div>
          </div>
          <p className="text-white/50 text-sm mb-8">🏃 ¡Date prisa antes de que se enfríe!</p>
          <button
            onClick={handleAcknowledge}
            className="w-full max-w-xs bg-[#2A2A2A] border-2 border-[#E87722] text-[#E87722] font-black text-xl py-5 rounded-2xl active:scale-95 transition-all shadow-lg"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            📞 Ya voy, ahora voy
          </button>
        </main>
      </div>
    )
  }

  /* ── Waiting ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-[#F5C100]/20 border-t-[#F5C100] animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-[#F5C100]/10 border-b-[#E87722]/60 animate-spin [animation-direction:reverse] [animation-duration:2s]" />
          <span className="text-5xl select-none">{business?.logo_emoji ?? '🍕'}</span>
        </div>
        <div className="bg-[#2A2A2A] rounded-3xl px-8 py-5 mb-6 w-full max-w-xs border border-[#3A3A3A]">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Tu ticket</p>
          <p className="text-[#F5C100] font-black text-5xl tracking-[0.2em]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {ticketCode}
          </p>
        </div>
        <h2 className="text-white font-black text-2xl mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Preparando tu pedido...
        </h2>
        <p className="text-white/45 text-sm mb-8">Te avisaremos cuando esté listo</p>
        <div className="flex items-center gap-2 bg-[#2A2A2A] px-4 py-2 rounded-full">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C100] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F5C100]" />
          </span>
          <span className="text-white/50 text-sm font-medium">En preparación · {formatElapsed(elapsed)}</span>
        </div>
        {!pushSupported.current && (
          <div className="mt-4 bg-[#E87722]/15 border border-[#E87722]/40 text-[#E87722] text-xs px-4 py-2.5 rounded-xl">
            📡 Actualizando cada 4 segundos
          </div>
        )}
      </main>
    </div>
  )
}
