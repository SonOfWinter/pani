import { useLayoutEffect, useRef, useState } from 'react'
import type { Category, Item } from '../data/database'
import { colors, icons } from '../data/categories'
import { deleteCheckedItems, toggleItem } from '../data/items'
import { Button } from './ui/button'

function ShoppingRow({ item, onToggle }: { item: Item; onToggle: (item: Item) => void }) {
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2">
        <input
          id={`purchase-${item.id}`}
          type="checkbox"
          className="size-5 shrink-0 accent-primary"
          checked={item.checkedAt !== null}
          onChange={() => onToggle(item)}
        />
        <span className="min-w-0 break-words">
          {item.name}
          {item.quantity && <span className="ml-2 text-sm text-muted-foreground">{item.quantity}</span>}
        </span>
      </label>
    </li>
  )
}

export function ShoppingView({ items, categories }: { items: Item[]; categories: Category[] }) {
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

  async function toggle(item: Item) {
    const next = pending[pending.findIndex((entry) => entry.id === item.id) + 1]
    if (document.activeElement?.id === `purchase-${item.id}`) {
      const destination = item.checkedAt
        ? `purchase-${item.id}`
        : next ? `purchase-${next.id}` : 'checked-items'
      focusAfterChange.current = { id: item.id, destination }
    }
    try {
      await toggleItem(item.id)
      setError('')
      setAnnouncement(`${item.name} : achat ${item.checkedAt ? 'décoché' : 'coché'}.`)
    } catch {
      focusAfterChange.current = null
      setError('Impossible de modifier cet achat.')
    }
  }

  async function clearChecked() {
    if (!window.confirm('Retirer les articles pris de la liste ?')) return
    try {
      await deleteCheckedItems(checked.map((item) => item.id))
      setError('')
      setAnnouncement('Articles pris retirés.')
    } catch {
      setError('Impossible de retirer les articles pris.')
    }
  }

  return (
    <div>
      <p role="status" className="sr-only">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {pending.length === 0 && <p className="rounded-lg bg-card p-5">
        {checked.length ? 'Courses terminées.' : 'Aucun article à acheter.'}
      </p>}
      {groups.map(({ category, items }) => (
        <section key={category?.id ?? 'none'} className="mb-6">
          <h2 className={`mb-2 rounded-lg px-2 py-1 font-semibold ${category ? colors[category.color].style : ''}`}>
            {category && <span aria-hidden="true" className="mr-2">{icons[category.icon].symbol}</span>}
            {category?.name ?? 'Sans catégorie'}
          </h2>
          <ul className="divide-y divide-muted rounded-lg bg-card">
            {items.map((item) => <ShoppingRow key={item.id} item={item} onToggle={(value) => void toggle(value)} />)}
          </ul>
        </section>
      ))}
      {checked.length > 0 && (
        <details className="mt-6 rounded-lg bg-card p-3">
          <summary id="checked-items" className="min-h-11 cursor-pointer py-2 font-semibold">Articles pris ({checked.length})</summary>
          <ul className="mb-3 divide-y divide-muted">
            {checked.map((item) => <ShoppingRow key={item.id} item={item} onToggle={(value) => void toggle(value)} />)}
          </ul>
          <Button variant="outline" onClick={() => void clearChecked()}>Retirer les articles pris</Button>
        </details>
      )}
    </div>
  )
}
