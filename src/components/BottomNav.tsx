import { List, ShoppingCart, Tags } from 'lucide-react'
import type { Mode } from '../data/database'

const tabs = [
  { mode: 'list', label: 'Liste', Icon: List },
  { mode: 'shopping', label: 'Courses', Icon: ShoppingCart },
  { mode: 'categories', label: 'Catégories', Icon: Tags },
] as const

export function BottomNav({ mode, disabled, onNavigate }: {
  mode: Mode
  disabled: boolean
  onNavigate: (mode: Mode) => void
}) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <div className="bottom-nav-inner">
        {tabs.map(({ mode: value, label, Icon }) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={mode === value}
            onClick={() => onNavigate(value)}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
