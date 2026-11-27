const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export async function animateRemoval(rows: Array<HTMLElement | null>) {
  if (reducedMotion()) return
  const animations = rows.flatMap((row) => row ? [row.animate(
    [{ opacity: 1 }, { opacity: 0, transform: 'translateX(8px)' }],
    { duration: 135, easing: 'ease-in' },
  )] : [])
  await Promise.allSettled(animations.map((animation) => animation.finished))
}

export function animateSavedRow(id: string, created: boolean, fromTop?: number) {
  if (reducedMotion()) return
  requestAnimationFrame(() => {
    const row = document.getElementById(`reorder-row-${id}`)
    const content = row?.querySelector<HTMLElement>('.row-content')
    if (!row || !content || row.closest('[inert]')) return
    const bounds = row.getBoundingClientRect()
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
    if (created) {
      row.animate([{ scale: '.98', opacity: 0.35 }, { scale: '1', opacity: 1 }],
        { duration: 220, easing: 'ease-out' })
    } else if (fromTop !== undefined && fromTop >= 0 && fromTop < window.innerHeight) {
      animateDrop(row, fromTop - bounds.top)
    }
    content.animate([
      { boxShadow: 'inset 0 0 0 1px var(--ring), inset 0 0 24px color-mix(in srgb, var(--primary) 70%, transparent)' },
      { boxShadow: 'inset 0 0 0 1px transparent, inset 0 0 0 transparent' },
    ], { duration: created ? 460 : 330, easing: 'ease-out' })
  })
}

export async function animateRowRemoval(row: HTMLElement | null) {
  if (!row || reducedMotion()) return
  const bounds = row.getBoundingClientRect()
  if (bounds.height <= 0 || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
  const animation = row.animate([
    { height: `${bounds.height}px`, opacity: 1, overflow: 'hidden' },
    { height: '0px', opacity: 0, overflow: 'hidden', borderWidth: '0px' },
  ], { duration: 200, easing: 'cubic-bezier(.5,0,.65,.35)', fill: 'forwards' })
  await Promise.allSettled([animation.finished])
  return animation
}

export function animateModeChange(title: HTMLElement, content: HTMLElement, direction: number) {
  if (reducedMotion()) return
  const options = { duration: 260, easing: 'cubic-bezier(.2,.8,.25,1)' }
  const animations = [title, content].map((element, index) => element.animate([
    { transform: `translateX(${direction * (index ? 8 : 14)}px)`, opacity: 0.35 },
    { transform: 'translateX(0)', opacity: 1 },
  ], options))
  return () => animations.forEach((animation) => animation.cancel())
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

export function animateCounter(element: HTMLElement, direction: number) {
  if (reducedMotion() || !direction) return
  return element.animate(
    [{ transform: `translateY(${Math.sign(direction) * 8}px)`, opacity: 0.35 }, { transform: 'translateY(0)', opacity: 1 }],
    { duration: 170, easing: 'ease-out' },
  )
}

export async function animateCheck(id: string, checking: boolean, lastInCategory: boolean) {
  const row = document.getElementById(`shopping-row-${id}`)
  const check = row?.querySelector('.shopping-check-effect')
  if (reducedMotion() || !row || !check) return
  const drawn = { opacity: 1, scale: '1', strokeDashoffset: '0' }
  const erased = { opacity: 0, scale: '.65', strokeDashoffset: '24' }
  const mark = check.animate(checking
    ? [erased, { opacity: 1, scale: '1.25', strokeDashoffset: '0' }, drawn]
    : [drawn, erased], { duration: 140, fill: 'forwards', easing: 'ease-out' })
  if (!checking) {
    await Promise.allSettled([mark.finished])
    return () => mark.cancel()
  }
  const section = lastInCategory ? row.closest<HTMLElement>('.list-group') : null
  const target = section ?? row
  const fold = target.animate([
    { height: `${target.getBoundingClientRect().height}px`, opacity: 1, overflow: 'hidden' },
    { height: '0px', paddingBlock: '0px', marginBottom: '0px', opacity: 0, overflow: 'hidden' },
  ], { delay: 90, duration: section ? 170 : 135, fill: 'forwards', easing: 'ease-in-out' })
  await Promise.allSettled([mark.finished, fold.finished])
  return () => { mark.cancel(); fold.cancel() }
}

export function animateRowArrival(row: HTMLElement) {
  if (reducedMotion()) return
  return row.animate([
    { clipPath: 'inset(0 0 100% 0)', opacity: 0.35 },
    { clipPath: 'inset(0)', opacity: 1 },
  ], { duration: 220, easing: 'ease-out' })
}

export function animateCelebration(element: HTMLElement) {
  if (reducedMotion()) return
  element.animate([
    { scale: '.88', opacity: 0.45 },
    { scale: '1.06', opacity: 1, offset: 0.42 },
    { scale: '1', opacity: 1 },
  ], { duration: 380, easing: 'ease-out' })
  for (const [index, spark] of Array.from(element.querySelectorAll('.completion-spark')).entries()) {
    const angle = index * Math.PI / 4
    spark.animate([
      { opacity: 1, transform: 'translate(0, 0) scale(1.5)' },
      { opacity: 0, transform: `translate(${Math.cos(angle) * 37}px, ${Math.sin(angle) * 25}px) scale(.25)` },
    ], { duration: 430 + index * 12, easing: 'ease-out' })
  }
}

const undoRows = '[id^="reorder-row-"], [id^="shopping-row-"]'
const shoppingBadges = '[id^="in-shopping-"]'

function visiblePositions(selector: string) {
  const positions = new Map<string, DOMRect>()
  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    if (element.closest('[inert], details:not([open])')) continue
    const bounds = element.getBoundingClientRect()
    if (bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight) positions.set(element.id, bounds)
  }
  return positions
}

export function captureUndoMotion() {
  if (reducedMotion()) return
  return { rows: visiblePositions(undoRows), badges: visiblePositions(shoppingBadges) }
}

export function animateUndo(before: NonNullable<ReturnType<typeof captureUndoMotion>>) {
  if (reducedMotion()) return
  for (const [id, bounds] of visiblePositions(undoRows)) {
    const row = document.getElementById(id)
    if (!row) continue
    const previous = before.rows.get(id)
    if (previous) animateDrop(row, previous.top - bounds.top)
    else animateRowArrival(row)
  }
  for (const [id, bounds] of before.badges) {
    if (document.getElementById(id)) continue
    const effect = document.createElement('span')
    effect.className = 'undo-sparks'
    effect.setAttribute('aria-hidden', 'true')
    effect.style.left = `${bounds.x + bounds.width / 2}px`
    effect.style.top = `${bounds.y + bounds.height / 2}px`
    document.body.append(effect)
    const particles = Array.from({ length: 6 }, (_, index) => {
      const spark = document.createElement('span')
      spark.className = 'completion-spark'
      effect.append(spark)
      const angle = index * Math.PI / 3
      return spark.animate([
        { transform: `translate(${Math.cos(angle) * 23}px, ${Math.sin(angle) * 23}px)`, opacity: 1 },
        { transform: 'scale(.2)', opacity: 0 },
      ], { duration: 230, easing: 'ease-in' })
    })
    void Promise.allSettled(particles.map((animation) => animation.finished)).then(() => effect.remove())
  }
}
