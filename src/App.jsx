import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import NavBar from './components/NavBar.jsx'
import RiskDecisioning from './pages/RiskDecisioning.jsx'
import Configuration from './pages/Configuration.jsx'
import CreditModel from './pages/CreditModel.jsx'

function AppShell() {
  const navigate = useNavigate()
  const [showConfig, setShowConfig] = useState(false)
  const [showCreditModel, setShowCreditModel] = useState(false)

  return (
    <div className="min-h-screen bg-abwab-bg text-white font-sans">
      <NavBar
        onConfigClick={() => {
          setShowCreditModel(false)
          setShowConfig(true)
          navigate('/configuration')
        }}
        onCreditModelClick={() => {
          setShowConfig(false)
          setShowCreditModel(true)
          navigate('/credit-model')
        }}
      />
      <Routes>
        <Route path="/" element={<RiskDecisioning />} />
        <Route path="/configuration" element={<Configuration onBack={() => navigate('/')} />} />
        <Route path="/credit-model" element={<CreditModel onBack={() => navigate('/')} />} />
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
