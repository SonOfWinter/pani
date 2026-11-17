import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './button'

interface Confirmation {
  title: string
  action: string
  description?: string
}

type Confirm = (message: Confirmation) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('Le fournisseur de confirmation est absent.')
  return confirm
}

function ConfirmationDialog({ message, onDecision }: { message: Confirmation; onDecision: (confirmed: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const pointerOutside = useRef(false)
  const title = useId()
  const description = useId()

  useLayoutEffect(() => {
    const node = dialog.current
    const previousFocus = document.activeElement
    node?.showModal()
    cancel.current?.focus({ preventScroll: true })
    return () => {
      node?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-labelledby={title}
      aria-describedby={message.description ? description : undefined}
      className="pani-modal pani-confirm"
      onCancel={(event) => { event.preventDefault(); onDecision(false) }}
      onPointerDown={(event) => { pointerOutside.current = event.target === event.currentTarget }}
      onClick={(event) => {
        if (pointerOutside.current && event.target === event.currentTarget) onDecision(false)
        pointerOutside.current = false
      }}
    >
      <div className="pani-confirm-card">
        <h2 id={title} className="break-words text-lg font-semibold">{message.title}</h2>
        {message.description && <p id={description} className="mt-2 text-sm text-muted-foreground">{message.description}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={cancel} variant="ghost" onClick={() => onDecision(false)}>Annuler</Button>
          <Button variant="destructive" onClick={() => onDecision(true)}>{message.action}</Button>
        </div>
      </div>
    </dialog>
  )
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const resolve = useRef<((confirmed: boolean) => void) | null>(null)
  const [message, setMessage] = useState<Confirmation | null>(null)

  function confirm(next: Confirmation) {
    if (resolve.current) return Promise.resolve(false)
    return new Promise<boolean>((callback) => {
      resolve.current = callback
      setMessage(next)
    })
  }

  function finish(confirmed: boolean) {
    const callback = resolve.current
    resolve.current = null
    setMessage(null)
    callback?.(confirmed)
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      {message && <ConfirmationDialog message={message} onDecision={finish} />}
    </ConfirmContext>
  )
}
