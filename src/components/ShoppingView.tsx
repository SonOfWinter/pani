import { useLayoutEffect, useRef, useState } from 'react'
import type { Category, Item } from '../data/database'
import { toast } from 'sonner'
import { animateRemoval } from '../lib/list-motion'
import { QuantityStepper } from './QuantityStepper'
import { categoryBackground, CategoryLabel } from './CategoryLabel'
import { changeQuantity, clearShopping, setItemChecked, uncheckAll } from '../data/items'
import type { RecordUndo } from '../data/undo'
import { useConfirm } from './ui/confirm'
import { Button } from './ui/button'

type ShoppingItem = Item & { checkedAt: string | null }

function ShoppingRow({ item, onToggle, onQuantity }: {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onQuantity: (id: string, delta: -1 | 1) => void
}) {
  return (
    <li id={`shopping-row-${item.id}`} className="shopping-row flex items-center gap-2 py-1 pr-2">
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

export function ShoppingView({ items, categories, recordUndo }: { items: ShoppingItem[]; categories: Category[]; recordUndo: RecordUndo }) {
  const confirm = useConfirm()
  const focusAfterChange = useRef<{ id: string; destination: string } | null>(null)
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

  async function toggle(item: ShoppingItem) {
    const next = pending[pending.findIndex((entry) => entry.id === item.id) + 1]
    if (document.activeElement?.id === `purchase-${item.id}`) {
      const destination = item.checkedAt
        ? `purchase-${item.id}`
        : next ? `purchase-${next.id}` : 'checked-items'
      focusAfterChange.current = { id: item.id, destination }
    }
    try {
      await setItemChecked(item.id, item.checkedAt === null, item.checkedAt, recordUndo)
      setError('')
      setAnnouncement(`${item.name} : achat ${item.checkedAt ? 'décoché' : 'coché'}.`)
    } catch {
      focusAfterChange.current = null
      setError('Impossible de modifier cet achat.')
    }
  }

  async function adjustQuantity(id: string, delta: -1 | 1) {
    try {
      await changeQuantity(id, delta, true)
      setError('')
    } catch {
      setError('Impossible de modifier la quantité.')
    }
  }

  async function clearChecked() {
    if (!await confirm({ title: 'Retirer les articles pris de la liste ?', action: 'Retirer les articles pris' })) return
    try {
      await animateRemoval(checked.map((item) => document.getElementById(`shopping-row-${item.id}`)))
      await clearShopping(checked.map((item) => item.id))
      setError('')
      toast.success('Articles pris retirés.')
    } catch {
      setError('Impossible de retirer les articles pris.')
    }
  }

  async function resetChecks() {
    try {
      if (await uncheckAll(recordUndo)) {
        setAnnouncement('Tous les articles sont de nouveau à acheter.')
        requestAnimationFrame(() => document.getElementById(`purchase-${checked[0]?.id}`)?.focus())
      }
      setError('')
    } catch {
      setError('Impossible de tout décocher.')
    }
  }

  return (
    <div>
      <p role="status" className="sr-only">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {pending.length === 0 && <p className="empty-group">
        {checked.length ? 'Courses terminées.' : 'Aucun article à acheter.'}
      </p>}
      {groups.map(({ category, items }) => (
        <section key={category?.id ?? 'none'} className="list-group">
          <h2 className="category-heading" style={categoryBackground(category)}><CategoryLabel category={category} /></h2>
          <ul className="divide-y divide-border">
            {items.map((item) => <ShoppingRow key={item.id} item={item} onToggle={(value) => void toggle(value)} onQuantity={(id, delta) => void adjustQuantity(id, delta)} />)}
          </ul>
        </section>
      ))}
      {checked.length > 0 && (
        <details className="mt-6 px-3">
          <summary id="checked-items" className="min-h-11 cursor-pointer py-2 font-semibold">Articles pris ({checked.length})</summary>
          <ul className="mb-3 divide-y divide-muted">
            {checked.map((item) => <ShoppingRow key={item.id} item={item} onToggle={(value) => void toggle(value)} onQuantity={(id, delta) => void adjustQuantity(id, delta)} />)}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void resetChecks()}>Tout décocher</Button>
            <Button variant="outline" onClick={() => void clearChecked()}>Retirer les articles pris</Button>
          </div>
        </details>
      )}
    </div>
  )
}
