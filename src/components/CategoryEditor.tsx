import { CategoryLabel } from './CategoryLabel'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Reorder, SortableRow } from './Reorder'
import { moveCategory } from '../data/order'
import { useState, type FormEvent } from 'react'
import type { Category } from '../data/database'
import { categoryColor, deleteCategory, icons, saveCategory } from '../data/categories'
import { Button } from './ui/button'

export function CategoryEditor({ categories }: { categories: Category[] }) {
  const [id, setId] = useState<string>()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7d9b92')
  const [emoji, setEmoji] = useState('🧺')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function edit(category?: Category) {
    setId(category?.id)
    setName(category?.name ?? '')
    setColor(category ? categoryColor(category) : '#7d9b92')
    setEmoji(category ? category.emoji ?? icons[category.icon].symbol : '🧺')
    setError('')
  }

  async function run(operation: () => Promise<void>, reset = true) {
    setBusy(true)
    try {
      await operation()
      if (reset) edit()
      else setError('')
    } catch (reason) {
      setError(reason instanceof Error && reason.message
        ? reason.message
        : 'Impossible d’enregistrer cette catégorie.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void run(() => saveCategory(name, color, emoji, id))
  }

  return (
    <section aria-label="Gérer les catégories">
      <Reorder onDrop={({ active, over }) => {
        if (over && active.id !== over.id) {
          void run(() => moveCategory(String(active.id), String(over.id)), false)
        }
      }}>
        <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
          <ul className="mb-4 grid gap-2">
            {categories.map((category, index) => (
              <SortableRow key={category.id} id={category.id} label={category.name} disabled={busy}>
                <Button variant="ghost" className="min-w-0 flex-1 justify-start px-1 text-left" disabled={busy} onClick={() => edit(category)}>
                  <CategoryLabel category={category} />
                  <span className="sr-only">, modifier</span>
                </Button>
                <Button variant="ghost" disabled={busy || index === 0} aria-label={`Monter ${category.name}`} onClick={() => void run(() => moveCategory(category.id, -1), false)}>↑</Button>
                <Button variant="ghost" disabled={busy || index === categories.length - 1} aria-label={`Descendre ${category.name}`} onClick={() => void run(() => moveCategory(category.id, 1), false)}>↓</Button>
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </Reorder>
      <form className="grid gap-4 rounded-lg border border-border bg-card p-4" onSubmit={submit}>
        <h3 className="font-semibold">{id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
        <label className="grid gap-1">
          Nom
          <input className="pani-input" value={name} required onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="grid gap-1">
            Couleur
            <input className="color-picker" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <label className="grid flex-1 gap-1">
            Emoji
            <input className="pani-input" value={emoji} maxLength={32} onChange={(event) => setEmoji(event.target.value)} />
          </label>
        </div>
        <div role="group" aria-label="Suggestions d’emojis" className="flex flex-wrap gap-1">
          {['🧺', '🍎', '🥦', '🥖', '🥛', '🧀', '🥩', '🐟', '🧴', '🧊', '🐾', '📦'].map((symbol) => (
            <Button key={symbol} variant="ghost" aria-pressed={emoji === symbol} className="px-1.5 text-lg" onClick={() => setEmoji(symbol)}>{symbol}</Button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>Enregistrer</Button>
          {id && (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => edit()}>Annuler la modification</Button>
              <Button variant="destructive" disabled={busy} onClick={() => {
                if (window.confirm('Supprimer cette catégorie ? Ses articles iront dans « Sans catégorie ».')) {
                  void run(() => deleteCategory(id))
                }
              }}>Supprimer la catégorie</Button>
            </>
          )}
        </div>
      </form>
    </section>
  )
}
