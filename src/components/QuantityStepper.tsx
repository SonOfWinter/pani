import { useLayoutEffect, useRef, useState } from 'react'
import { animateCounter } from '../lib/list-motion'
import { Minus, Plus } from 'lucide-react'
import type { Item } from '../data/database'
import { formatQuantityCount, parseQuantityCount, quantityParts, type QuantityChange } from '../data/items'

export function QuantityStepper({ item, onChange }: {
  item: Item
  onChange: (change: QuantityChange) => void
}) {
  const { count } = quantityParts(item.quantity)
  const [draft, setDraft] = useState<string | null>(null)
  const output = useRef<HTMLOutputElement>(null)
  const previous = useRef(count)
  useLayoutEffect(() => {
    const direction = count - previous.current
    previous.current = count
    const animation = output.current && animateCounter(output.current, direction)
    return () => { animation?.cancel() }
  }, [count])
  return (
    <div className="quantity-stepper" role="group" aria-label={`Quantité de ${item.name}`}>
      <button type="button" aria-label={`Diminuer la quantité de ${item.name}`} disabled={count <= 1} onClick={() => onChange(-1)}>
        <Minus size={15} />
      </button>
      <div className="quantity-value">
        <output ref={output} aria-live="polite">{item.quantity || '1'}</output>
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={`Saisir la quantité de ${item.name}`}
          autoComplete="off"
          value={draft ?? formatQuantityCount(count)}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={() => {
            const next = draft === null ? null : parseQuantityCount(draft)
            setDraft(null)
            if (next !== null && next !== count) onChange({ count: next })
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              setDraft(null)
            }
          }}
        />
      </div>
      <button type="button" aria-label={`Augmenter la quantité de ${item.name}`} disabled={count >= Number.MAX_SAFE_INTEGER} onClick={() => onChange(1)}>
        <Plus size={15} />
      </button>
    </div>
  )
}
