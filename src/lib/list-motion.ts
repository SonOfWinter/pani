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
