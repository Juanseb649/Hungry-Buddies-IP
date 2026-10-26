import { useEffect, useRef, type ReactNode } from 'react'
import { formatQuantity } from '../utils/format'
import { MAX_QUANTITY } from '../../features/matches/domain/rules'

export function Stepper({
  value,
  onStep,
  label,
  min = 0,
}: {
  value: number
  /** Cuánto sumar o restar: ±1 con los botones, ±½ tocando el número. */
  onStep: (delta: number) => void
  /** Qué se está contando, para lectores de pantalla. */
  label: string
  min?: number
}) {
  const hasHalf = value % 1 !== 0
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        aria-label={`Quitar una porción de ${label}`}
        disabled={value <= min}
        onClick={() => onStep(-1)}
      >
        −
      </button>
      <button
        type="button"
        className="stepper__value"
        data-empty={value === 0 || undefined}
        aria-label={`${formatQuantity(value)} porciones de ${label}. ${hasHalf ? 'Quitar' : 'Sumar'} media porción`}
        onClick={() => onStep(hasHalf ? -0.5 : 0.5)}
      >
        {formatQuantity(value)}
      </button>
      <button
        type="button"
        className="stepper__btn"
        aria-label={`Sumar una porción de ${label}`}
        disabled={value + 1 > MAX_QUANTITY}
        onClick={() => onStep(1)}
      >
        +
      </button>
    </div>
  )
}

export function BottomBar({ children }: { children: ReactNode }) {
  return <div className="bottom-bar">{children}</div>
}

export function ErrorNote({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null
  return (
    <div className="error-note" role="alert">
      <p>{message}</p>
      {onDismiss && (
        <button type="button" className="link-btn" onClick={onDismiss}>
          Entendido
        </button>
      )}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog ref={ref} className="dialog" onCancel={onCancel} onClose={onCancel} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog__body">{body}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className={danger ? 'btn btn--danger' : 'btn btn--primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export function Loading() {
  return (
    <p className="loading" aria-live="polite">
      Poniendo la mesa…
    </p>
  )
}
