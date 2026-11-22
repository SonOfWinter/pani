import { Toaster as Sonner } from 'sonner'
import type { CSSProperties } from 'react'

const bottomOffset = { bottom: 'calc(var(--bottom-nav-height) + 0.5rem)' }

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      className="pani-toaster"
      containerAriaLabel="Notifications"
      offset={bottomOffset}
      mobileOffset={bottomOffset}
      style={{
        '--normal-bg': 'var(--card)',
        '--normal-text': 'var(--foreground)',
        '--normal-border': 'var(--border)',
      } as CSSProperties}
    />
  )
}
