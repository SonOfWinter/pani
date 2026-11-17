import { useLayoutEffect, useRef, useState } from 'react'
import type { Category, Item } from '../data/database'
import { Undo2 } from 'lucide-react'
import { QuantityStepper } from './QuantityStepper'
import { CategoryLabel } from './CategoryLabel'
import { changeQuantity, deleteCheckedItems, setItemChecked } from '../data/items'
import { Button } from './ui/button'

function ShoppingRow({ item, onToggle, onQuantity }: {
  item: Item
  onToggle: (item: Item) => void
  onQuantity: (id: string, delta: -1 | 1) => void
}) {
  return (
    <li className="flex items-center gap-2 py-1 pr-2">
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 pl-3">
        <input
          id={`purchase-${item.id}`}
          type="checkbox"
          className="size-5 shrink-0 accent-primary"
          checked={item.checkedAt !== null}
          onChange={() => onToggle(item)}
        />
        <span className="min-w-0 flex-1 break-words">
          {item.name}
        </span>
      </label>
      <QuantityStepper item={item} onChange={(delta) => onQuantity(item.id, delta)} />
    </li>
  )
}

export function ShoppingView({ items, categories }: { items: Item[]; categories: Category[] }) {
  const focusAfterChange = useRef<{ id: string; destination: string } | null>(null)
  const [lastCheck, setLastCheck] = useState<{ id: string; name: string; checkedAt: string }>()
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const pending = items.filter((item) => item.checkedAt === null)
  const checked = items.filter((item) => item.checkedAt !== null)
  const groups = [...categories, null].map((category) => ({
    category,
    items: pending.filter((item) => item.categoryId === (category?.id ?? null)),
  })).filter((group) => group.items.length > 0)

  useLayoutEffect(() => {
    const target = focusAfterChange.current
    if (!target || !items.some((item) => item.id === target.id && Boolean(item.checkedAt) !==
      (target.destination === `purchase-${target.id}`))) return
    focusAfterChange.current = null
    document.getElementById(target.destination)?.focus()
  }, [items])

  async function toggle(item: Item) {
    const next = pending[pending.findIndex((entry) => entry.id === item.id) + 1]
    if (document.activeElement?.id === `purchase-${item.id}`) {
      const destination = item.checkedAt
        ? `purchase-${item.id}`
        : next ? `purchase-${next.id}` : 'checked-items'
      focusAfterChange.current = { id: item.id, destination }
    }
    try {
      const checkedAt = await setItemChecked(item.id, item.checkedAt === null, item.checkedAt)
      if (checkedAt && !item.checkedAt) setLastCheck({ id: item.id, name: item.name, checkedAt })
      else setLastCheck((last) => last?.id === item.id ? undefined : last)
      setError('')
      setAnnouncement(`${item.name} : achat ${item.checkedAt ? 'décoché' : 'coché'}.`)
    } catch {
      focusAfterChange.current = null
      setError('Impossible de modifier cet achat.')
    }
  }

  async function adjustQuantity(id: string, delta: -1 | 1) {
    try {
      await changeQuantity(id, delta)
      setError('')
    } catch {
      setError('Impossible de modifier la quantité.')
    }
  }

  async function clearChecked() {
    if (!window.confirm('Retirer les articles pris de la liste ?')) return
    try {
      await deleteCheckedItems(checked.map((item) => item.id))
      setLastCheck(undefined)
      setError('')
      setAnnouncement('Articles pris retirés.')
    } catch {
      setError('Impossible de retirer les articles pris.')
    }
  }

  const undoable = lastCheck && checked.some((item) => item.id === lastCheck.id && item.checkedAt === lastCheck.checkedAt)

  async function undo() {
    if (!lastCheck) return
    try {
      const result = await setItemChecked(lastCheck.id, false, lastCheck.checkedAt)
      if (result !== null) throw new Error('Cet article a changé.')
      setLastCheck(undefined)
      setError('')
      setAnnouncement(`${lastCheck.name} est de nouveau à acheter.`)
      requestAnimationFrame(() => document.getElementById(`purchase-${lastCheck.id}`)?.focus())
    } catch {
      setError('Impossible d’annuler cette coche.')
    }
  }

  return (
    <div>
      <p role="status" className="sr-only">{announcement}</p>
      {undoable && (
        <div className="undo-bar">
          <p>{lastCheck.name} coché.</p>
          <Button variant="ghost" onClick={() => void undo()}><Undo2 size={17} /> Annuler</Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {pending.length === 0 && <p className="rounded-lg bg-card p-5">
        {checked.length ? 'Courses terminées.' : 'Aucun article à acheter.'}
      </p>}
      {groups.map(({ category, items }) => (
        <section key={category?.id ?? 'none'} className="list-group">
          <h2 className="category-heading"><CategoryLabel category={category} /></h2>
          <ul className="divide-y divide-border">
            {items.map((item) => <ShoppingRow key={item.id} item={item} onToggle={(value) => void toggle(value)} onQuantity={(id, delta) => void adjustQuantity(id, delta)} />)}
          </ul>
        </section>
      ))}
      {checked.length > 0 && (
        <details className="mt-6 rounded-lg bg-card p-3">
          <summary id="checked-items" className="min-h-11 cursor-pointer py-2 font-semibold">Articles pris ({checked.length})</summary>
          <ul className="mb-3 divide-y divide-muted">
            {checked.map((item) => <ShoppingRow key={item.id} item={item} onToggle={(value) => void toggle(value)} onQuantity={(id, delta) => void adjustQuantity(id, delta)} />)}
          </ul>
          <Button variant="outline" onClick={() => void clearChecked()}>Retirer les articles pris</Button>
        </details>
      )}
    </div>
  )
}
