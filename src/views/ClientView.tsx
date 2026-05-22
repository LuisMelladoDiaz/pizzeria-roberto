import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function ClientView() {
  const [ticketCode, setTicketCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const navigate = useNavigate()
  const { isSupported, subscribe } = usePushNotifications()

  useEffect(() => {
    // Show install banner on Android Chrome if not already installed
    const isAndroid = /android/i.test(navigator.userAgent)
    const isChrome = /chrome/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setShowInstallBanner(isAndroid && isChrome && !isStandalone)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = ticketCode.trim().toUpperCase()
    if (!code) return

    setLoading(true)
    setError('')

    try {
      // Get existing ticket or create one
      const { data: existing } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_code', code)
        .maybeSingle()

      if (!existing) {
        const { error: insertErr } = await supabase
          .from('tickets')
          .insert({ ticket_code: code, status: 'waiting' })
        if (insertErr) throw insertErr
      }

      // Try to subscribe to push notifications
      if (isSupported) {
        const subscription = await subscribe()
        if (subscription) {
          await supabase
            .from('tickets')
            .update({ push_subscription: subscription })
            .eq('ticket_code', code)
        }
      }

      navigate(`/cliente/espera/${code}`)
    } catch (err) {
      console.error(err)
      setError('No se pudo registrar el ticket. Verifica el código e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      {/* Header */}
      <header className="bg-[#2A2A2A] py-4 px-6 flex items-center justify-center border-b border-[#F5C100]/20">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🍕</span>
          <div>
            <h1
              className="text-[#F5C100] font-black text-xl tracking-wide leading-tight"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              Pizzería Roberto
            </h1>
            <p className="text-white/40 text-xs">Sistema de llamada de pedidos</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="text-7xl mb-4 select-none">🎫</div>
            <h2
              className="text-white font-black text-2xl mb-2"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              ¡Ingresa tu ticket!
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Escribe el código de tu ticket y te avisamos cuando tu pedido esté listo
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
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
              disabled={loading || !ticketCode.trim()}
              className="w-full bg-[#F5C100] text-[#1A1A1A] font-black text-lg py-5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 hover:bg-[#E8B800] shadow-lg shadow-[#F5C100]/20"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {loading ? '⏳ Registrando...' : '✅ Esperar mi pedido'}
            </button>
          </form>

          {/* No push support warning */}
          {!isSupported && (
            <div className="mt-4 bg-[#E87722]/15 border border-[#E87722]/40 text-[#E87722] text-xs px-4 py-3 rounded-xl text-center">
              💡 Para recibir notificaciones, abre esta web en <strong>Chrome para Android</strong>
            </div>
          )}
        </div>
      </main>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="px-4 pb-6">
          <div className="bg-[#2A2A2A] border border-[#F5C100]/25 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-3xl flex-shrink-0">📲</span>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold leading-tight">
                Añade a tu pantalla de inicio
              </p>
              <p className="text-white/45 text-xs mt-0.5">
                Menú ··· → "Añadir a pantalla de inicio" para recibir notificaciones siempre
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
