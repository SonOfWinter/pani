import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { database } from '../data/database'
import { Button } from './ui/button'

export function UpdateNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function apply() {
    setBusy(true)
    setError(false)
    try {
      await database.readList()
      if (document.querySelector('dialog[open]')) throw new Error('Une saisie est en cours.')
      await updateServiceWorker(true)
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  if (!needRefresh) return null
  return (
    <aside className="update-notice" aria-label="Mise à jour">
      <p role="status">Une mise à jour de Pani est prête.</p>
      {error && <p role="alert">Impossible d’appliquer la mise à jour. Terminez votre saisie et réessayez.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void apply()}>Mettre à jour</Button>
        <Button variant="ghost" disabled={busy} onClick={() => setNeedRefresh(false)}>Plus tard</Button>
      </div>
    </aside>
  )
}
