import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getStoredTickets, removeStoredTicket } from '../lib/storage'
import { usePushNotifications } from '../hooks/usePushNotifications'
import type { Ticket } from '../lib/supabase'
import type { StoredTicket } from '../lib/storage'

interface TicketItem {
  stored: StoredTicket
  ticket: Ticket
}

function playCallSound() {
  try {
    const ctx = new AudioContext()
    ;[880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.55)
      osc.start(ctx.currentTime + i * 0.18)
      osc.stop(ctx.currentTime + i * 0.18 + 0.6)
    })
  } catch { /* no AudioContext */ }
}

function elapsedLabel(createdAt: string): string {
  const s = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function MyTicketsView() {
  const navigate = useNavigate()
  const { isSupported, permission, subscribe } = usePushNotifications()
  const [items, setItems] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())
  const readySet = useRef<Set<string>>(new Set())
  const subscriptionDone = useRef(false)

  const refresh = useCallback(async () => {
    const stored = getStoredTickets()
    if (stored.length === 0) { navigate('/cliente/negocios', { replace: true }); return }

    const results = await Promise.all(
      stored.map(async (st) => {
        const { data } = await supabase
          .from('tickets')
          .select('*')
          .eq('ticket_code', st.ticketCode)
          .eq('business_id', st.businessId)
          .maybeSingle()
        return { stored: st, ticket: data as Ticket | null }
      }),
    )

    results.filter((r) => !r.ticket).forEach((r) => {
      removeStoredTicket(r.stored.businessId, r.stored.ticketCode)
    })

    const active = results.filter((r) => r.ticket !== null) as TicketItem[]
    if (active.length === 0) { navigate('/cliente/negocios', { replace: true }); return }

    active.forEach((item) => {
      const key = `${item.stored.businessId}-${item.stored.ticketCode}`
      if (item.ticket.status === 'ready' && !readySet.current.has(key)) {
        readySet.current.add(key)
        playCallSound()
        if ('vibrate' in navigator) navigator.vibrate([300, 100, 300])
      }
      if (item.ticket.status === 'waiting') readySet.current.delete(key)
    })

    setItems(active)
    setLoading(false)
  }, [navigate])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    return () => clearInterval(id)
  }, [refresh])

  // Warn before closing the tab/app while tickets are active
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Looping alarm while any ticket is ready — only restarts when anyReady toggles
  const anyReady = items.some((i) => i.ticket.status === 'ready')
  useEffect(() => {
    if (!anyReady) return
    const id = window.setInterval(() => {
      playCallSound()
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300])
    }, 4000)
    return () => window.clearInterval(id)
  }, [anyReady])

  // Ensure all active tickets have a push subscription (attempted once after first load)
  useEffect(() => {
    if (loading || !isSupported || subscriptionDone.current) return
    subscriptionDone.current = true
    subscribe().then((sub) => {
      if (!sub) return
      items.forEach((item) => {
        if (!item.ticket.push_subscription) {
          supabase
            .from('tickets')
            .update({ push_subscription: sub })
            .eq('id', item.ticket.id)
            .then(() => {/* silent */})
        }
      })
    })
  }, [loading, isSupported, items, subscribe])

  const handleAcknowledge = async (item: TicketItem) => {
    const key = `${item.stored.businessId}-${item.stored.ticketCode}`
    setAcknowledging((prev) => new Set(prev).add(key))
    try {
      await supabase.from('tickets').update({ status: 'waiting' }).eq('id', item.ticket.id)
      readySet.current.delete(key)
      setItems((prev) =>
        prev.map((i) =>
          i.stored.businessId === item.stored.businessId && i.stored.ticketCode === item.stored.ticketCode
            ? { ...i, ticket: { ...i.ticket, status: 'waiting' } }
            : i,
        ),
      )
    } finally {
      setAcknowledging((prev) => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-5xl animate-spin">⏳</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <header className="bg-[#2A2A2A] py-4 px-5 border-b border-[#F5C100]/20 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎫</span>
            <div>
              <h1 className="text-white font-black text-base leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Mis tickets
              </h1>
              <p className="text-white/40 text-xs">{items.length} activo{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/cliente/negocios')}
            className="bg-[#F5C100] text-[#1A1A1A] font-black text-sm px-4 py-2 rounded-xl active:scale-95 transition-all"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            + Añadir
          </button>
        </div>
      </header>

      {/* Keep-app-open warning */}
      <div className={`px-4 py-2.5 text-xs text-center font-medium ${
        permission === 'granted'
          ? 'bg-emerald-900/40 text-emerald-400/80'
          : 'bg-[#E87722]/10 text-[#E87722]/80'
      }`}>
        {permission === 'granted'
          ? '🔔 Notificaciones activas — te avisaremos aunque cierres la app'
          : '⚠️ Mantén YaVoy abierto — si cierras la app podrías perderte la llamada'}
      </div>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-3">
        {items.map((item) => {
          const isReady = item.ticket.status === 'ready'
          const key = `${item.stored.businessId}-${item.stored.ticketCode}`
          const isBusy = acknowledging.has(key)

          return (
            <div
              key={key}
              className={`rounded-2xl p-5 border-2 transition-all ${
                isReady
                  ? 'bg-[#F5C100] border-[#F5C100] shadow-[0_0_32px_rgba(245,193,0,0.3)]'
                  : 'bg-[#2A2A2A] border-[#3A3A3A]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{item.stored.businessEmoji}</span>
                <div className="min-w-0">
                  <p className={`font-bold text-sm truncate ${isReady ? 'text-[#1A1A1A]/70' : 'text-white/50'}`}>
                    {item.stored.businessName}
                  </p>
                  <p
                    className={`font-black text-3xl tracking-[0.15em] leading-tight ${isReady ? 'text-[#1A1A1A]' : 'text-[#F5C100]'}`}
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    {item.stored.ticketCode}
                  </p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  {isReady ? (
                    <span
                      className="bg-[#1A1A1A]/20 text-[#1A1A1A] text-xs font-black px-2.5 py-1 rounded-full animate-pulse"
                      style={{ fontFamily: 'Nunito, sans-serif' }}
                    >
                      ¡LISTO!
                    </span>
                  ) : (
                    <span className="text-white/30 text-xs">{elapsedLabel(item.ticket.created_at)}</span>
                  )}
                </div>
              </div>

              {isReady ? (
                <button
                  onClick={() => handleAcknowledge(item)}
                  disabled={isBusy}
                  className="w-full bg-[#1A1A1A] text-[#F5C100] font-black text-base py-3.5 rounded-xl active:scale-95 disabled:opacity-50 transition-all"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  {isBusy ? '⏳...' : '📞 Ya voy, ahora voy'}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-white/30 animate-pulse" />
                  <span>En preparación…</span>
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
