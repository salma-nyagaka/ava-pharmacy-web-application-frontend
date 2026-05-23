import './ConfirmActionModal.css'

interface ConfirmActionModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!open) return null

  return (
    <div className="confirm-modal" role="presentation" onMouseDown={() => { if (!loading) onCancel() }}>
      <div
        className="confirm-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-modal__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
        </div>
        <div className="confirm-modal__body">
          <h2 id="confirm-modal-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="confirm-modal__actions">
          <button className="confirm-modal__cancel" type="button" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className="confirm-modal__confirm" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmActionModal
