import { type FormEvent, useRef, useState } from 'react'
import { saveItem } from '../data/items'
import type { RecordUndo } from '../data/undo'
import type { Category, Item } from '../data/database'
import { BottomSheet, type BottomSheetHandle } from './BottomSheet'
import { Button } from './ui/button'

export function ItemEditor({ item, categories, recordUndo, onClose, onSave }: {
  item: Item | null
  categories: Category[]
  recordUndo: RecordUndo
  onClose: () => void
  onSave: (id: string) => void
}) {
  const sheet = useRef<BottomSheetHandle>(null)
  const [name, setName] = useState(item?.name ?? '')
  const [quantity, setQuantity] = useState(item?.quantity ?? '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!name.trim()) {
      setError('Saisissez un nom.')
      return
    }
    setSaving(true)
    try {
      const id = await saveItem(name, quantity, categoryId || null, item?.id, recordUndo)
      sheet.current?.dismiss(() => onSave(id))
    } catch {
      setError('Impossible d’enregistrer cet article. Réessayez.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet ref={sheet} titleId="item-editor-title" busy={saving} onClose={onClose}>
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
        <label className="grid gap-1">
          Catégorie
          <select className="pani-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Sans catégorie</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={saving} onClick={() => sheet.current?.dismiss()}>Annuler</Button>
          <Button type="submit" disabled={saving}>Enregistrer</Button>
        </div>
      </form>
    </BottomSheet>
  )
}
