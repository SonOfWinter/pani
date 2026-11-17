import { type FormEvent, useEffect, useRef, useState } from 'react'
import { saveItem } from '../data/items'
import type { Item } from '../data/database'
import { Button } from './ui/button'

export function ItemEditor({ item, onClose, onSave }: {
  item: Item | null
  onClose: () => void
  onSave: (id: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(item?.name ?? '')
  const [quantity, setQuantity] = useState(item?.quantity ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Saisissez un nom.')
      return
    }
    setSaving(true)
    try {
      onSave(await saveItem(name, quantity, item?.id))
    } catch {
      setError('Impossible d’enregistrer cet article. Réessayez.')
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="item-editor-title"
      className="pani-sheet"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form onSubmit={(event) => void submit(event)} className="grid gap-4">
        <h2 id="item-editor-title" className="text-xl font-semibold">
          {item ? 'Modifier l’article' : 'Ajouter un article'}
        </h2>
        <label className="grid gap-1">
          Nom
          <input className="pani-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1">
          Quantité (facultatif)
          <input className="pani-input" placeholder="500 g" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={saving} onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={saving}>Enregistrer</Button>
        </div>
      </form>
    </dialog>
  )
}
