import { useLayoutEffect, useRef, useState } from 'react'
import type { Category, Item } from '../data/database'
import { toast } from 'sonner'
import { animateCelebration, animateCheck, animateRemoval, animateRowArrival } from '../lib/list-motion'
import { QuantityStepper } from './QuantityStepper'
import { CategoryDisclosure } from './CategoryDisclosure'
import { changeQuantity, clearShopping, setItemChecked, uncheckAll } from '../data/items'
import type { RecordUndo } from '../data/undo'
import { useConfirm } from './ui/confirm'
import { Button } from './ui/button'

type ShoppingItem = Item & { checkedAt: string | null }

function focusShoppingControl(id: string) {
  const control = document.getElementById(id)
  if (control?.closest('[inert]')) {
    control.closest('section')?.querySelector<HTMLButtonElement>('.category-heading-toggle button')?.focus()
  } else {
    control?.focus()
  }
}

function ShoppingRow({ item, onToggle, onQuantity }: {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onQuantity: (id: string, delta: -1 | 1) => void
}) {
  return (
    <li id={`shopping-row-${item.id}`} className="shopping-row flex items-center gap-2 py-1 pr-2">
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 pl-3">
        <span className="shopping-checkbox">
          <input
            id={`purchase-${item.id}`}
            type="checkbox"
            className="absolute inset-0 size-5 opacity-0"
            checked={item.checkedAt !== null}
            onChange={() => onToggle(item)}
          />
          <svg aria-hidden="true" className="shopping-check-effect" viewBox="0 0 24 24" fill="none">
            <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
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
  const previousCounts = useRef<{ pending: number; checked: number } | undefined>(undefined)
  const returning = useRef(new Set<string>())
  const checking = useRef(new Set<string>())
  const finishedChecks = useRef(new Map<string, () => void>())
  const completion = useRef<HTMLDivElement>(null)
  const checkedCount = useRef<HTMLSpanElement>(null)
  const [visibleChecks, setVisibleChecks] = useState<Record<string, string | null>>({})
  const [collapsedCategories, setCollapsedCategories] = useState(new Set<string | null>())
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const displayed = Object.keys(visibleChecks).length
    ? items.map((item) => Object.hasOwn(visibleChecks, item.id) ? { ...item, checkedAt: visibleChecks[item.id] } : item)
    : items
  const pending = displayed.filter((item) => item.checkedAt === null)
  const checked = displayed.filter((item) => item.checkedAt !== null)
  const groups = [...categories, null].map((category) => ({
    category,
    items: pending.filter((item) => item.categoryId === (category?.id ?? null)),
  })).filter((group) => group.items.length > 0)

  useLayoutEffect(() => {
    const target = focusAfterChange.current
    if (!target || !displayed.some((item) => item.id === target.id && Boolean(item.checkedAt) !==
      (target.destination === `purchase-${target.id}`))) return
    focusAfterChange.current = null
    focusShoppingControl(target.destination)
  }, [displayed])

  useLayoutEffect(() => {
    for (const [id, cancel] of finishedChecks.current) {
      if (Object.hasOwn(visibleChecks, id)) continue
      cancel()
      finishedChecks.current.delete(id)
    }
  }, [visibleChecks])

  useLayoutEffect(() => {
    for (const item of pending) {
      if (!returning.current.delete(item.id)) continue
      const row = document.getElementById(`shopping-row-${item.id}`)
      if (row && !row.closest('[inert]')) animateRowArrival(row)
    }
    const previous = previousCounts.current
    previousCounts.current = { pending: pending.length, checked: checked.length }
    if (!previous) return
    if (previous.pending > 0 && pending.length === 0 && checked.length > previous.checked && completion.current) {
      animateCelebration(completion.current)
    }
    const count = checkedCount.current
    if (count && previous.checked !== checked.length && !count.closest('details')?.open &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      count.getAnimations().forEach((animation) => animation.cancel())
      count.animate([{ scale: '1' }, { scale: '1.2', offset: 0.35 }, { scale: '1' }],
        { duration: 240, easing: 'ease-out' })
    }
  }, [pending, checked.length])

  async function toggle(item: ShoppingItem) {
    if (checking.current.has(item.id)) return
    checking.current.add(item.id)
    const checkingItem = item.checkedAt === null
    const lastInCategory = checkingItem && !items.some((entry) =>
      entry.id !== item.id && entry.categoryId === item.categoryId &&
      entry.checkedAt === null && !checking.current.has(entry.id),
    )
    const visible = pending.filter((entry) => !collapsedCategories.has(entry.categoryId))
    const next = visible[visible.findIndex((entry) => entry.id === item.id) + 1]
    if (document.activeElement?.id === `purchase-${item.id}`) {
      const destination = item.checkedAt
        ? `purchase-${item.id}`
        : next ? `purchase-${next.id}` : 'checked-items'
      focusAfterChange.current = { id: item.id, destination }
    }
    if (item.checkedAt) returning.current.add(item.id)
    setVisibleChecks((current) => ({ ...current, [item.id]: item.checkedAt }))
    try {
      const [motion, write] = await Promise.allSettled([
        animateCheck(item.id, checkingItem, lastInCategory),
        setItemChecked(item.id, checkingItem, item.checkedAt, recordUndo),
      ])
      if (motion.status === 'fulfilled' && motion.value) finishedChecks.current.set(item.id, motion.value)
      if (write.status === 'rejected') throw write.reason
      setError('')
      setAnnouncement(`${item.name} : achat ${item.checkedAt ? 'décoché' : 'coché'}.`)
    } catch {
      focusAfterChange.current = null
      returning.current.delete(item.id)
      setError('Impossible de modifier cet achat.')
    } finally {
      checking.current.delete(item.id)
      setVisibleChecks((current) => {
        const next = { ...current }
        delete next[item.id]
        return next
      })
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
    const first = checked[0]
    if (!first) return
    focusAfterChange.current = { id: first.id, destination: `purchase-${first.id}` }
    try {
      if (await uncheckAll(recordUndo)) {
        setAnnouncement('Tous les articles sont de nouveau à acheter.')
      } else {
        focusAfterChange.current = null
      }
      setError('')
    } catch {
      focusAfterChange.current = null
      setError('Impossible de tout décocher.')
    }
  }

  return (
    <div>
      <p role="status" className="sr-only">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {pending.length === 0 && (
        checked.length ? (
          <div ref={completion} className="shopping-complete" role="status">
            <span className="completion-mark" aria-hidden="true">
              ✓
              {Array.from({ length: 8 }, (_, index) => <span className="completion-spark" key={index} />)}
            </span>
            <p>Courses terminées.</p>
          </div>
        ) : <p className="empty-group">Aucun article à acheter.</p>
      )}
      {groups.map(({ category, items }) => {
        const categoryId = category?.id ?? null
        return (
          <section key={categoryId ?? 'none'} className="list-group">
            <CategoryDisclosure category={category} count={items.length} expanded={!collapsedCategories.has(categoryId)}
              onToggle={() => setCollapsedCategories((current) => {
                const next = new Set(current)
                if (!next.delete(categoryId)) next.add(categoryId)
                return next
              })}>
              <ul className="divide-y divide-border">
                {items.map((item) => <ShoppingRow key={item.id} item={item} onToggle={(value) => void toggle(value)} onQuantity={(id, delta) => void adjustQuantity(id, delta)} />)}
              </ul>
            </CategoryDisclosure>
          </section>
        )
      })}
      {checked.length > 0 && (
        <details className="mt-6 px-3">
          <summary id="checked-items" className="min-h-11 cursor-pointer py-2 font-semibold">
            Articles pris (<span ref={checkedCount} className="shopping-count">{checked.length}</span>)
          </summary>
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
