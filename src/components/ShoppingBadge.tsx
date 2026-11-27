import { useLayoutEffect, useRef } from 'react'

export type ShoppingOrigin = { x: number; y: number }

export function shoppingOrigin(element: Element): ShoppingOrigin {
  const bounds = element.getBoundingClientRect()
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

export function PaniBasket({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 9 12 3.5 16.5 9 M2 9h20 M3 9l2.5 11h13L21 9 M9 12l1 5 M15 12l-1 5" />
    </svg>
  )
}

const sparks = [
  [-26, -11], [-20, 17], [-7, -19], [8, -17], [22, -7], [21, 15], [2, 22],
]

export function ShoppingBadge({ id, arrival }: {
  id: string
  arrival?: { kind: 'added' | 'already'; origin: ShoppingOrigin }
}) {
  const badge = useRef<HTMLSpanElement>(null)
  const flight = useRef<HTMLSpanElement>(null)
  const impact = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const target = badge.current
    if (!arrival || !target || !impact.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const animations: Animation[] = []
    const duration = 260
    if (arrival.kind === 'added' && flight.current) {
      const anchor = shoppingOrigin(target)
      const x = arrival.origin.x - anchor.x
      const y = arrival.origin.y - anchor.y
      animations.push(
        flight.current.animate([
          { transform: `translate(${x}px, ${y}px) rotate(-18deg) scale(1.15)`, opacity: 1 },
          { transform: `translate(${x * 0.46}px, ${y * 0.46 - 16}px) rotate(11deg) scale(1.35)`, opacity: 1, offset: 0.58 },
          { transform: 'translate(0, 0) rotate(0) scale(0.9)', opacity: 1, offset: 0.96 },
          { transform: 'translate(0, 0) scale(0.9)', opacity: 0 },
        ], { duration, easing: 'cubic-bezier(.25,.6,.4,1)' }),
        target.animate([
          { scale: '0.78', opacity: 0 },
          { scale: '1.24', opacity: 1, offset: 0.28 },
          { scale: '1', opacity: 1 },
        ], { duration: 220, delay: duration - 12, fill: 'backwards' }),
      )
    }
    if (arrival.kind === 'already') {
      animations.push(target.animate([
        { scale: '1' },
        { scale: '1.12', offset: 0.28 },
        { scale: '0.98', offset: 0.72 },
        { scale: '1' },
      ], { duration: 200, delay: duration - 8, easing: 'ease-out' }))
    }

    impact.current.dataset.effect = 'particules'
    sparks.forEach(([dx, dy], index) => {
      const particle = impact.current?.children[index]
      if (!particle) return
      animations.push(particle.animate([
        { transform: 'translate(0, 0) scale(1.15)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(.25)`, opacity: 0 },
      ], { duration: 300 + index * 12, delay: duration - 8, easing: 'cubic-bezier(.1,.65,.35,1)' }))
    })
    return () => animations.forEach((animation) => animation.cancel())
  }, [arrival])

  return (
    <span id={id} className="relative grid size-6 shrink-0 place-items-center">
      <span ref={badge} className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
        <span className="sr-only">Dans Courses</span>
        <PaniBasket />
      </span>
      {arrival && (
        <>
          {arrival.kind === 'added' && (
            <span ref={flight} className="shopping-flight" aria-hidden="true"><PaniBasket size={19} /></span>
          )}
          <span ref={impact} className="shopping-impact" aria-hidden="true">
            {sparks.map((_, index) => <span className="shopping-spark" key={index} />)}
          </span>
        </>
      )}
    </span>
  )
}
