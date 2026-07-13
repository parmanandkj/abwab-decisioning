import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import NavBar from './components/NavBar.jsx'
import RiskDecisioning from './pages/RiskDecisioning.jsx'
import Configuration from './pages/Configuration.jsx'
import CreditModel from './pages/CreditModel.jsx'
import ECLReport from './pages/ECLReport.jsx'
import ECLSimulation from './pages/ECLSimulation.jsx'

function AppShell() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-abwab-bg text-white font-sans">
      <NavBar
        onConfigClick={() => navigate('/configuration')}
        onCreditModelClick={() => navigate('/credit-model')}
        onECLReportClick={() => navigate('/ecl-report')}
      />
      <Routes>
        <Route path="/" element={<RiskDecisioning />} />
        <Route path="/configuration" element={<Configuration onBack={() => navigate('/')} />} />
        <Route path="/credit-model" element={<CreditModel onBack={() => navigate('/')} />} />
        <Route path="/ecl-report" element={<ECLReport onBack={() => navigate('/')} />} />
        <Route path="/ecl-simulation" element={<ECLSimulation onBack={() => navigate('/')} />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
