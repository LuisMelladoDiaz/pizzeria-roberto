import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { getStoredTickets } from './lib/storage'
import BusinessListView from './views/BusinessListView'
import ClientView from './views/ClientView'
import MyTicketsView from './views/MyTicketsView'
import WaitingView from './views/WaitingView'
import BusinessView from './views/BusinessView'

// Smart entry point: routes client to tickets list or business list
function ClientRoot() {
  const navigate = useNavigate()
  useEffect(() => {
    const stored = getStoredTickets()
    navigate(stored.length > 0 ? '/cliente/mis-tickets' : '/cliente/negocios', { replace: true })
  }, [navigate])
  return <div className="min-h-screen bg-[#1A1A1A]" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        <Route path="/cliente" element={<ClientRoot />} />
        <Route path="/cliente/negocios" element={<BusinessListView />} />
        <Route path="/cliente/negocio/:businessSlug" element={<ClientView />} />
        <Route path="/cliente/mis-tickets" element={<MyTicketsView />} />
        <Route path="/cliente/espera/:businessSlug/:ticketCode" element={<WaitingView />} />
        <Route path="/negocio" element={<BusinessView />} />
        <Route path="*" element={<Navigate to="/cliente" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
