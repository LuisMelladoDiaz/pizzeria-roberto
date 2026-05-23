import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { addStoredTicket, getStoredTickets } from '../lib/storage'
import { usePushNotifications } from '../hooks/usePushNotifications'
import type { Business } from '../lib/supabase'

function todayStart(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
}

export default function ClientView() {
  const { businessSlug } = useParams<{ businessSlug: string }>()
  const navigate = useNavigate()
  const { isSupported, subscribe } = usePushNotifications()

  const [business, setBusiness] = useState<Business | null>(null)
  const [ticketCode, setTicketCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load business by slug
  useEffect(() => {
    if (!businessSlug) { navigate('/cliente/negocios'); return }

    supabase
      .from('businesses')
      .select('*')
      .eq('slug', businessSlug)
      .eq('active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { navigate('/cliente/negocios'); return }
        setBusiness(data as Business)
        setLoading(false)
      })
  }, [businessSlug, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    const code = ticketCode.trim().toUpperCase()
    if (!code) return

    setSubmitting(true)
    setError('')

    try {
      // Check if this code already exists today for this business
      const { data: existing } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('ticket_code', code)
        .eq('business_id', business.id)
        .gte('created_at', todayStart())
        .maybeSingle()

      if (existing) {
        // If it's our own saved ticket, redirect back
        const mine = getStoredTickets().find(
          (t) => t.businessId === business.id && t.ticketCode === code,
        )
        if (mine) { navigate(`/cliente/espera/${businessSlug}/${code}`); return }
        setError('Este código ya está en uso hoy en este establecimiento. Verifica tu ticket.')
        return
      }

      // Create ticket
      const { error: insertErr } = await supabase
        .from('tickets')
        .insert({ ticket_code: code, business_id: business.id, status: 'waiting' })
      if (insertErr) throw insertErr

      // Try to subscribe to push notifications
      if (isSupported) {
        const sub = await subscribe()
        if (sub) {
          await supabase
            .from('tickets')
            .update({ push_subscription: sub })
            .eq('ticket_code', code)
            .eq('business_id', business.id)
        }
      }

      // Save to localStorage (no personal data)
      addStoredTicket({
        businessId: business.id,
        businessSlug: business.slug,
        businessName: business.name,
        businessEmoji: business.logo_emoji,
        ticketCode: code,
      })

      navigate(`/cliente/espera/${businessSlug}/${code}`)
    } catch (err) {
      console.error(err)
      setError('No se pudo registrar el ticket. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
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
      <header className="bg-[#2A2A2A] py-4 px-6 flex items-center gap-3 border-b border-[#F5C100]/20">
        <button onClick={() => navigate('/cliente/negocios')} className="text-white/40 hover:text-white transition-colors text-xl">
          ‹
        </button>
        <span className="text-3xl">{business?.logo_emoji}</span>
        <div>
          <h1 className="text-[#F5C100] font-black text-lg leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {business?.name}
          </h1>
          <p className="text-white/40 text-xs">Introduce tu número de ticket</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-10">
            <div className="text-7xl mb-4 select-none">🎫</div>
            <h2 className="text-white font-black text-2xl mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
              ¡Introduce tu ticket!
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Escribe el código de tu ticket y te avisamos cuando tu pedido esté listo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => { setTicketCode(e.target.value.toUpperCase()); setError('') }}
              placeholder="Ej: A23"
              maxLength={10}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full bg-[#2A2A2A] text-white text-5xl font-black text-center py-6 px-4 rounded-2xl border-2 border-[#3A3A3A] focus:border-[#F5C100] focus:outline-none transition-colors tracking-widest uppercase placeholder:text-white/20 placeholder:text-3xl"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            />

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-xl text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !ticketCode.trim()}
              className="w-full bg-[#F5C100] text-[#1A1A1A] font-black text-lg py-5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 hover:bg-[#E8B800] shadow-lg shadow-[#F5C100]/20"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {submitting ? '⏳ Registrando...' : '🎫 Introducir ticket'}
            </button>
          </form>

          {!isSupported && (
            <div className="mt-4 bg-[#E87722]/15 border border-[#E87722]/40 text-[#E87722] text-xs px-4 py-3 rounded-xl text-center">
              💡 Para recibir notificaciones, abre esta web en <strong>Chrome para Android</strong>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
