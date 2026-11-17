import { Toaster as Sonner } from 'sonner'
import type { CSSProperties } from 'react'

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="pani-toaster"
      containerAriaLabel="Notifications"
      mobileOffset={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      style={{
        '--normal-bg': 'var(--card)',
        '--normal-text': 'var(--foreground)',
        '--normal-border': 'var(--border)',
      } as CSSProperties}
    />
  )
}
