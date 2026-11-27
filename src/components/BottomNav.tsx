import { List, ShoppingCart, Tags } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Mode } from '../data/database'
import { navigation, navigationIndex } from '../lib/navigation'

const icons = { list: List, shopping: ShoppingCart, categories: Tags } satisfies Record<Mode, typeof List>

export function BottomNav({ mode, disabled, onNavigate }: {
  mode: Mode
  disabled: boolean
  onNavigate: (mode: Mode) => void
}) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <div className="bottom-nav-inner">
        <div
          className="bottom-nav-indicator-track"
          aria-hidden="true"
          style={{ '--active-tab': navigationIndex(mode) } as CSSProperties}
        >
          <div className="bottom-nav-indicator" />
        </div>
        {navigation.map(({ mode: value, label }) => {
          const Icon = icons[value]
          return (
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
          )
        })}
      </div>
    </nav>
  )
}
