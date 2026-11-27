import { useLayoutEffect, useRef } from 'react'
import { animateCounter } from '../lib/list-motion'
import { Minus, Plus } from 'lucide-react'
import type { Item } from '../data/database'
import { quantityParts } from '../data/items'

export function QuantityStepper({ item, onChange }: {
  item: Item
  onChange: (delta: -1 | 1) => void
}) {
  const { count } = quantityParts(item.quantity)
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
      <output ref={output} aria-live="polite">{item.quantity || '1'}</output>
      <button type="button" aria-label={`Augmenter la quantité de ${item.name}`} disabled={count >= Number.MAX_SAFE_INTEGER} onClick={() => onChange(1)}>
        <Plus size={15} />
      </button>
    </div>
  )
}
