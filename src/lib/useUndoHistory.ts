import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Mode } from '../data/database'
import type { UndoAction } from '../data/undo'

function emptyHistory(): Record<Mode, UndoAction[]> {
  return { list: [], shopping: [], categories: [] }
}

export function useUndoHistory() {
  const [history, setHistory] = useState(emptyHistory)
  const [busy, setBusy] = useState(false)
  const undoing = useRef(false)

  function record(mode: Mode, action: UndoAction) {
    setHistory((current) => ({ ...current, [mode]: [...current[mode], action].slice(-5) }))
  }

  async function undo(mode: Mode) {
    const action = history[mode].at(-1)
    if (!action || undoing.current) return
    undoing.current = true
    setBusy(true)
    try {
      const restored = await action()
      setHistory((current) => ({ ...current, [mode]: current[mode].filter((entry) => entry !== action) }))
      if (restored) toast.success('Action annulée.')
      else toast.info('Cette action ne peut plus être annulée.')
    } catch {
      toast.error('Impossible d’annuler cette action. Réessayez.')
    } finally {
      undoing.current = false
      setBusy(false)
    }
  }

  return { history, busy, record, undo, clear: () => setHistory(emptyHistory()) }
}
