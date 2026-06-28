import { useNavigate, useLocation } from 'react-router-dom'

export default function NavBar({ onConfigClick, onCreditModelClick, onECLReportClick }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bg-abwab-bg border-b border-abwab-border sticky top-0 z-50">
      <div className="flex items-center h-12 px-6">

        {/* Brand */}
        <div className="flex items-center gap-2 mr-8">
          <div className="w-2.5 h-2.5 rounded-full bg-abwab-purple" />
          <span className="text-sm font-semibold text-white">Abwab</span>
          <span className="text-xs text-abwab-muted ml-2 pl-2 border-l border-abwab-border">
            Decisioning Engine
          </span>
        </div>

        {/* Nav items */}
        <div className="flex items-center h-12">
          <button
            onClick={() => navigate('/')}
            className={`h-12 px-4 text-sm border-b-2 transition-colors ${
              location.pathname === '/'
                ? 'text-abwab-purple border-abwab-purple bg-abwab-purple-dim font-medium'
                : 'text-abwab-muted border-transparent hover:text-white'
            }`}
          >
            Risk Decisioning
          </button>
        </div>

        {/* Right side shortcuts */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onECLReportClick}
            className="text-xs text-abwab-muted border border-abwab-border rounded px-3 py-1.5 hover:border-abwab-purple hover:text-white transition-colors"
          >
            ECL Report
          </button>
          <button
            onClick={onCreditModelClick}
            className="text-xs text-abwab-muted border border-abwab-border rounded px-3 py-1.5 hover:border-abwab-purple hover:text-white transition-colors"
          >
            Credit Model
          </button>
          <button
            onClick={onConfigClick}
            className="text-xs text-abwab-muted border border-abwab-border rounded px-3 py-1.5 hover:border-abwab-purple hover:text-white transition-colors"
          >
            Product Configuration
          </button>
        </div>

      </div>
    </nav>
  )
}
