import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getStoredTickets } from '../lib/storage'
import type { Business } from '../lib/supabase'

export default function BusinessListView() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const hasActiveTickets = getStoredTickets().length > 0

  useEffect(() => {
    supabase
      .from('businesses')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setBusinesses((data ?? []) as Business[])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <header className="bg-[#2A2A2A] py-4 px-6 flex items-center justify-between border-b border-[#F5C100]/20">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎫</span>
          <div>
            <h1 className="text-white font-black text-lg leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
              ServiCall
            </h1>
            <p className="text-white/40 text-xs">Elige dónde estás</p>
          </div>
        </div>
        {hasActiveTickets && (
          <button
            onClick={() => navigate('/cliente/mis-tickets')}
            className="text-[#F5C100] text-sm font-bold border border-[#F5C100]/40 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
          >
            Mis tickets →
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <h2
          className="text-white font-black text-2xl mb-1"
          style={{ fontFamily: 'Nunito, sans-serif' }}
        >
          ¿Dónde estás?
        </h2>
        <p className="text-white/40 text-sm mb-6">Elige el establecimiento donde tienes tu ticket</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-4xl animate-spin">⏳</div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <div className="text-5xl mb-3">🏪</div>
            <p>No hay negocios disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((biz) => (
              <button
                key={biz.id}
                onClick={() => navigate(`/cliente/negocio/${biz.slug}`)}
                className="w-full bg-[#2A2A2A] border-2 border-[#3A3A3A] hover:border-[#F5C100]/50 rounded-2xl p-5 text-left transition-all active:scale-95 flex items-center gap-4"
              >
                <span className="text-4xl flex-shrink-0">{biz.logo_emoji}</span>
                <div className="min-w-0">
                  <p
                    className="text-white font-black text-lg leading-tight truncate"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    {biz.name}
                  </p>
                  {biz.description && (
                    <p className="text-white/45 text-sm mt-0.5 truncate">{biz.description}</p>
                  )}
                </div>
                <span className="text-white/25 text-xl ml-auto flex-shrink-0">›</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
