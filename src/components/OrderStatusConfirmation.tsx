import { useState } from 'react'
import type { DeliveryConfirmation } from '../services/adminOrderService'
import Dialog from './Dialog/Dialog'
import './OrderStatusConfirmation.css'

interface Props {
  orderNumber: string
  status: string
  busy: boolean
  error?: string
  onClose: () => void
  onConfirm: (delivery?: DeliveryConfirmation) => void
}

export default function OrderStatusConfirmation({ orderNumber, status, busy, error, onClose, onConfirm }: Props) {
  const [delivery, setDelivery] = useState<DeliveryConfirmation>({ recipient_name: '', recipient_verified: false, package_condition: '', temperature_sensitive: false, cold_chain_intact: false })
  const isDelivery = status.toLowerCase() === 'delivered'
  const invalidDelivery = isDelivery && (!delivery.recipient_name.trim() || !delivery.recipient_verified || (delivery.temperature_sensitive && (!delivery.cold_chain_intact || delivery.temperature_reading_c === undefined)))
  const close = () => { if (!busy) onClose() }
  return <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) close() }}>
    <Dialog className="order-status-confirmation" role="alertdialog" aria-modal="true" busy={busy} onClose={close}>
      <header><h2>Confirm order status</h2><button type="button" aria-label="Close confirmation" disabled={busy} onClick={close}>×</button></header>
      <div className="order-status-confirmation__body">
        <p>Are you sure you want to mark order <strong>{orderNumber}</strong> as <strong>{status}</strong>?</p>
        {isDelivery && <fieldset className="order-delivery-fields" disabled={busy}>
          <legend>Delivery confirmation</legend>
          <label>Recipient name *<input required value={delivery.recipient_name} onChange={e => setDelivery({ ...delivery, recipient_name: e.target.value })} /></label>
          <label><input type="checkbox" checked={delivery.recipient_verified} onChange={e => setDelivery({ ...delivery, recipient_verified: e.target.checked })} /> I verified the recipient’s identity *</label>
          <label><input type="checkbox" checked={delivery.temperature_sensitive} onChange={e => setDelivery({ ...delivery, temperature_sensitive: e.target.checked })} /> Temperature-sensitive delivery</label>
          {delivery.temperature_sensitive && <>
            <label>Temperature on arrival (°C) *<input required type="number" step="0.1" value={delivery.temperature_reading_c ?? ''} onChange={e => setDelivery({ ...delivery, temperature_reading_c: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
            <label><input type="checkbox" checked={delivery.cold_chain_intact} onChange={e => setDelivery({ ...delivery, cold_chain_intact: e.target.checked })} /> Cold chain remained intact *</label>
          </>}
        </fieldset>}
        {error && <p role="alert" className="order-status-confirmation__error">{error}</p>}
      </div>
      <footer><button type="button" className="btn btn--outline btn--sm" disabled={busy} onClick={close}>Cancel</button><button type="button" className="btn btn--primary btn--sm" disabled={busy || invalidDelivery} onClick={() => onConfirm(isDelivery ? delivery : undefined)}>{busy ? 'Updating…' : `Mark as ${status}`}</button></footer>
    </Dialog>
  </div>
}
