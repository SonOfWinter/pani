const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export async function animateRemoval(rows: Array<HTMLElement | null>) {
  if (reducedMotion()) return
  const animations = rows.flatMap((row) => row ? [row.animate(
    [{ opacity: 1 }, { opacity: 0, transform: 'translateX(8px)' }],
    { duration: 135, easing: 'ease-in' },
  )] : [])
  await Promise.allSettled(animations.map((animation) => animation.finished))
}

export function animateSavedItem(id: string) {
  if (reducedMotion()) return
  requestAnimationFrame(() => {
    document.getElementById(`reorder-row-${id}`)?.querySelector('.row-content')?.animate(
      [{ backgroundColor: 'color-mix(in srgb, var(--primary) 35%, var(--background))' }, { backgroundColor: 'var(--background)' }],
      { duration: 370, easing: 'ease-out' },
    )
  })
}

export function animateDrop(element: HTMLElement, offset: number, fade = false) {
  if (reducedMotion() || (!fade && Math.abs(offset) < 1)) return
  return element.animate(
    [
      { transform: `translateY(${offset}px)`, opacity: 1 },
      { transform: 'translateY(0)', opacity: fade ? 0 : 1 },
    ],
    { duration: 220, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
  )
}
