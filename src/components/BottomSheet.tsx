import { useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react'

export interface BottomSheetHandle {
  dismiss(after?: () => void): void
}

export function BottomSheet({ titleId, busy = false, onClose, children, ref }: {
  titleId: string
  busy?: boolean
  onClose: () => void
  children: ReactNode
  ref?: Ref<BottomSheetHandle>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const outsidePress = useRef(false)
  const closeTimer = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    const node = dialog.current
    if (!node) return
    const previousFocus = document.activeElement
    const { scrollX, scrollY } = window
    const body = document.body
    const previous = { position: body.style.position, top: body.style.top, insetInline: body.style.insetInline }
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, insetInline: '0' })
    node.showModal()
    return () => {
      window.clearTimeout(closeTimer.current)
      node.close()
      Object.assign(body.style, previous)
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [])

  function dismiss(after = onClose) {
    if (closing.current) return
    closing.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      after()
      return
    }
    if (dialog.current) dialog.current.dataset.closing = 'true'
    panel.current?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }],
      { duration: 175, easing: 'ease-in', fill: 'forwards' },
    )
    closeTimer.current = window.setTimeout(after, 175)
  }

  useImperativeHandle(ref, () => ({ dismiss }))

  return (
    <dialog
      ref={dialog}
      className="pani-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) dismiss()
      }}
      onPointerDown={(event) => {
        const bounds = panel.current?.getBoundingClientRect()
        outsidePress.current = event.target === event.currentTarget && Boolean(bounds &&
          (event.clientY < bounds.top || event.clientX < bounds.left || event.clientX > bounds.right))
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && outsidePress.current && !busy) dismiss()
        outsidePress.current = false
      }}
    >
      <div ref={panel} className="pani-sheet">
        {children}
      </div>
    </dialog>
  )
}
