import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTicketPolling } from '../hooks/useTicketPolling'
import type { Ticket } from '../lib/supabase'

// Generates a cheerful 3-note chime using Web Audio API
function playReadySound() {
  try {
    const ctx = new AudioContext()
    const notes = [
      { freq: 880, start: 0 },
      { freq: 1108.73, start: 0.18 },
      { freq: 1318.51, start: 0.36 },
    ]
    notes.forEach(({ freq, start }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.55)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.6)
    })
  } catch {
    // AudioContext not available (e.g., server-side or restricted)
  }
}

function vibrateDevice() {
  if ('vibrate' in navigator) {
    navigator.vibrate([300, 100, 300, 100, 300, 100, 600])
  }
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

export default function WaitingView() {
  const { ticketCode } = useParams<{ ticketCode: string }>()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const notifiedRef = useRef(false)
  const pushSupported = useRef('serviceWorker' in navigator && 'PushManager' in window)

  const handleTicketUpdate = useCallback((updated: Ticket) => {
    setTicket(updated)
    if (updated.status === 'ready' && !notifiedRef.current) {
      notifiedRef.current = true
      setIsReady(true)
      playReadySound()
      vibrateDevice()
    }
  }, [])

  // Polling fallback — active when push is not supported
  useTicketPolling(
    !pushSupported.current ? (ticketCode ?? null) : null,
    handleTicketUpdate,
    4000,
  )

  // Initial load + Supabase Realtime
  useEffect(() => {
    if (!ticketCode) {
      navigate('/cliente')
      return
    }

    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_code', ticketCode)
        .maybeSingle()

      if (cancelled) return

      if (!data) {
        navigate('/cliente')
        return
      }

      const t = data as Ticket
      setTicket(t)
      if (t.status === 'ready' && !notifiedRef.current) {
        notifiedRef.current = true
        setIsReady(true)
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`ticket:${ticketCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `ticket_code=eq.${ticketCode}`,
        },
        (payload) => handleTicketUpdate(payload.new as Ticket),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [ticketCode, navigate, handleTicketUpdate])

  // Elapsed time counter
  useEffect(() => {
    if (!ticket) return
    const origin = new Date(ticket.created_at).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - origin) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [ticket])

  // Cliente reconoce la llamada pero aún no ha recogido → vuelve a espera
  // El negocio puede llamarle de nuevo si hace falta
  const handleAcknowledge = async () => {
    if (!ticket) return
    await supabase
      .from('tickets')
      .update({ status: 'waiting' })
      .eq('id', ticket.id)
    notifiedRef.current = false // permite recibir la siguiente llamada
    setIsReady(false)
  }

  const handleCollected = async () => {
    if (!ticket) return
    await supabase
      .from('tickets')
      .update({ status: 'collected', collected_at: new Date().toISOString() })
      .eq('id', ticket.id)
    navigate('/cliente')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl animate-spin">⏳</div>
          <p className="text-white/40 text-sm">Cargando tu pedido...</p>
        </div>
      </div>
    )
  }

  /* ── READY STATE ─────────────────────────────────────────── */
  if (isReady) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
        <header className="bg-[#2A2A2A] py-4 px-6 flex items-center justify-center border-b border-[#F5C100]/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍕</span>
            <h1
              className="text-[#F5C100] font-black text-xl"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              Pizzería Roberto
            </h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          {/* Bouncing pizza */}
          <div className="text-8xl mb-6 animate-bounce select-none">🍕</div>

          {/* Ready card */}
          <div className="bg-[#F5C100] text-[#1A1A1A] rounded-3xl px-8 py-7 mb-6 w-full max-w-xs shadow-[0_0_50px_rgba(245,193,0,0.35)] animate-fade-in-up">
            <p className="font-black text-3xl mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
              ¡Tu pedido está listo!
            </p>
            <p className="font-bold text-base opacity-70 mb-3">Pasa a recogerlo en el mostrador</p>
            <div className="bg-[#1A1A1A]/15 rounded-2xl px-4 py-2 inline-block">
              <span
                className="font-black text-4xl tracking-[0.2em]"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {ticketCode}
              </span>
            </div>
          </div>

          <p className="text-white/50 text-sm mb-8">🏃 ¡Date prisa antes de que se enfríe!</p>

          <div className="w-full max-w-xs space-y-3">
            {/* Reconoce la llamada pero no ha recogido aún */}
            <button
              onClick={handleAcknowledge}
              className="w-full bg-[#2A2A2A] border-2 border-[#E87722] text-[#E87722] font-black text-lg py-4 rounded-2xl active:scale-95 transition-all"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              📞 Ya voy, ahora voy
            </button>

            {/* Finaliza el ticket */}
            <button
              onClick={handleCollected}
              className="w-full bg-[#2A2A2A] border-2 border-[#F5C100] text-[#F5C100] font-black text-lg py-4 rounded-2xl active:scale-95 transition-all"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              ✅ Ya lo recogí
            </button>
          </div>
        </main>
      </div>
    )
  }

  /* ── WAITING STATE ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <header className="bg-[#2A2A2A] py-4 px-6 flex items-center justify-center border-b border-[#F5C100]/20">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍕</span>
          <h1
            className="text-[#F5C100] font-black text-xl"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Pizzería Roberto
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        {/* Spinner around pizza */}
        <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-[#F5C100]/20 border-t-[#F5C100] animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-[#F5C100]/10 border-b-[#E87722]/60 animate-spin [animation-direction:reverse] [animation-duration:2s]" />
          <span className="text-5xl select-none">🍕</span>
        </div>

        {/* Ticket code */}
        <div className="bg-[#2A2A2A] rounded-3xl px-8 py-5 mb-6 w-full max-w-xs border border-[#3A3A3A]">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Tu ticket</p>
          <p
            className="text-[#F5C100] font-black text-5xl tracking-[0.2em]"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {ticketCode}
          </p>
        </div>

        <h2
          className="text-white font-black text-2xl mb-2"
          style={{ fontFamily: 'Nunito, sans-serif' }}
        >
          Preparando tu pedido...
        </h2>
        <p className="text-white/45 text-sm mb-8">
          Te avisaremos cuando esté listo. ¡No cierres esta pantalla!
        </p>

        {/* Status indicator */}
        <div className="flex items-center gap-2 bg-[#2A2A2A] px-4 py-2 rounded-full">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C100] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F5C100]" />
          </span>
          <span className="text-white/50 text-sm font-medium">
            En preparación · {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Polling indicator */}
        {!pushSupported.current && (
          <div className="mt-4 bg-[#E87722]/15 border border-[#E87722]/40 text-[#E87722] text-xs px-4 py-2.5 rounded-xl">
            📡 Actualizando estado cada 4 segundos
          </div>
        )}
      </main>

      <div className="px-6 pb-8">
        <button
          onClick={() => navigate('/cliente')}
          className="w-full text-white/25 text-sm py-3 hover:text-white/50 transition-colors"
        >
          ← Ingresar otro ticket
        </button>
      </div>
    </div>
  )
}
