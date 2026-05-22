import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ClientView from './views/ClientView'
import WaitingView from './views/WaitingView'
import BusinessView from './views/BusinessView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        <Route path="/cliente" element={<ClientView />} />
        <Route path="/cliente/espera/:ticketCode" element={<WaitingView />} />
        <Route path="/negocio" element={<BusinessView />} />
        <Route path="*" element={<Navigate to="/cliente" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
