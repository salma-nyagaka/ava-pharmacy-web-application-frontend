import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminLabPartnerService,
  type AdminLabApprovalQueueApi,
  type AdminLabPartnerApi,
  type AdminLaboratoryFacilityApi,
} from '../../services/adminLabPartnerService'

type ApprovalTab = 'partners' | 'laboratories'
type ReviewAction = 'verify' | 'request_docs' | 'reject' | 'request_changes' | 'suspend'

const formatDate = (value?: string | null) => {
  if (!value) return 'Not supplied'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-KE', { dateStyle: 'medium' })
}

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'The review action could not be completed.'

export default function LabApprovalQueue() {
  const [queue, setQueue] = useState<AdminLabApprovalQueueApi>({ partner_applications: [], laboratory_applications: [], counts: { partners: 0, laboratories: 0 } })
  const [tab, setTab] = useState<ApprovalTab>('partners')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [noteAction, setNoteAction] = useState<ReviewAction | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setQueue(await adminLabPartnerService.getApprovalQueue())
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const records = tab === 'partners' ? queue.partner_applications : queue.laboratory_applications
  const selected = useMemo(() => records.find((item) => Number(item.id) === selectedId) ?? records[0] ?? null, [records, selectedId])
  const isPartner = tab === 'partners'
  const selectedPartner = isPartner ? selected as AdminLabPartnerApi | null : null
  const selectedLaboratory = !isPartner ? selected as AdminLaboratoryFacilityApi | null : null

  const changeTab = (nextTab: ApprovalTab) => {
    setTab(nextTab)
    setSelectedId(null)
    setNoteAction(null)
    setNote('')
    setFeedback('')
  }

  const review = async (action: ReviewAction, reason?: string) => {
    if (!selected?.id) return
    setSaving(true)
    setError('')
    setFeedback('')
    try {
      if (isPartner) {
        await adminLabPartnerService.actionPartner(selected.id, { action: action as 'verify' | 'request_docs' | 'reject', note: reason })
      } else {
        await adminLabPartnerService.actionFacility(selected.id, { action: action as 'verify' | 'request_changes' | 'suspend', note: reason })
      }
      setNoteAction(null)
      setNote('')
      setFeedback(action === 'verify' ? `${isPartner ? 'Partner' : 'Laboratory'} approved and moved out of the review queue.` : 'Review outcome saved.')
      await load()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const startNote = (action: ReviewAction) => {
    setNoteAction(action)
    setNote('')
  }

  return <section className="lap-page" aria-label="Laboratory approval applications">
    <div className="lap-intro">
      <div><p className="lap-eyebrow">Approval workflow</p><h2>Applications</h2><p>Review the legal partner first. After approval, review each laboratory separately. Tests and technicians are enabled only after the laboratory is approved.</p></div>
      <button className="btn btn--outline btn--sm" type="button" onClick={() => void load()} disabled={loading}>Refresh queue</button>
    </div>

    <div className="lap-tabs" role="tablist" aria-label="Application type">
      <button type="button" role="tab" aria-selected={tab === 'partners'} className={tab === 'partners' ? 'lap-tabs__tab lap-tabs__tab--active' : 'lap-tabs__tab'} onClick={() => changeTab('partners')}>Partner applications <span>{queue.counts.partners}</span></button>
      <button type="button" role="tab" aria-selected={tab === 'laboratories'} className={tab === 'laboratories' ? 'lap-tabs__tab lap-tabs__tab--active' : 'lap-tabs__tab'} onClick={() => changeTab('laboratories')}>Laboratory applications <span>{queue.counts.laboratories}</span></button>
    </div>

    {error && <div className="cm-inline-error">{error}</div>}
    {feedback && <div className="cm-inline-success">{feedback}</div>}

    <div className="lap-layout">
      <aside className="lap-queue" aria-label={`${isPartner ? 'Partner' : 'Laboratory'} applications`}>
        <div className="lap-queue__heading"><h3>{isPartner ? 'Awaiting partner review' : 'Awaiting laboratory review'}</h3><span>{records.length}</span></div>
        {loading ? <p className="lap-empty">Loading applications…</p> : records.length === 0 ? <p className="lap-empty">No {isPartner ? 'partner' : 'laboratory'} applications are awaiting review.</p> : records.map((record) => {
          const active = Number(record.id) === Number(selected?.id)
          const title = isPartner ? (record as AdminLabPartnerApi).name : (record as AdminLaboratoryFacilityApi).name
          const subtitle = isPartner ? (record as AdminLabPartnerApi).reference : `${(record as AdminLaboratoryFacilityApi).partner_name} · ${(record as AdminLaboratoryFacilityApi).county}`
          const documents = isPartner ? (record as AdminLabPartnerApi).documents?.length ?? 0 : (record as AdminLaboratoryFacilityApi).documents?.length ?? 0
          return <button key={record.id} className={active ? 'lap-queue__item lap-queue__item--active' : 'lap-queue__item'} type="button" onClick={() => { setSelectedId(Number(record.id)); setNoteAction(null); setNote('') }}><strong>{title || 'Unnamed application'}</strong><span>{subtitle || 'Reference pending'}</span><small>{documents} document{documents === 1 ? '' : 's'} submitted</small></button>
        })}
      </aside>

      <article className="lap-review">
        {!selected ? <div className="lap-empty lap-empty--large">Choose an application to begin review.</div> : isPartner && selectedPartner ? <>
          <header className="lap-review__header"><div><p className="lap-eyebrow">Step 1 of 2 - legal partner</p><h2>{selectedPartner.name}</h2><p>{selectedPartner.reference} · Submitted {formatDate(selectedPartner.submitted_at)}</p></div><span className="status-pill status-pill--warning">Awaiting review</span></header>
          <div className="lap-review__grid"><section><h3>Organisation details</h3><dl className="lap-details"><div><dt>Primary contact</dt><dd>{selectedPartner.contact_name || 'Not supplied'}</dd></div><div><dt>Licence</dt><dd>{selectedPartner.license_number || 'Not supplied'}</dd></div><div><dt>Accreditation</dt><dd>{selectedPartner.accreditation || 'Not supplied'}</dd></div><div><dt>Contact</dt><dd>{selectedPartner.email || 'No email'}<br />{selectedPartner.phone || 'No phone'}</dd></div></dl></section><section><h3>Submitted documents</h3><DocumentList documents={selectedPartner.documents} /></section></div>
          <ReviewActions saving={saving} noteAction={noteAction} note={note} onNoteChange={setNote} onApprove={() => void review('verify')} onRequest={() => startNote('request_docs')} onReject={() => startNote('reject')} onCancel={() => setNoteAction(null)} onSubmitNote={() => void review(noteAction!, note.trim())} />
        </> : selectedLaboratory && <>
          <header className="lap-review__header"><div><p className="lap-eyebrow">Step 2 of 2 - laboratory</p><h2>{selectedLaboratory.name}</h2><p>{selectedLaboratory.reference} · {selectedLaboratory.partner_name} · Submitted {formatDate(selectedLaboratory.submitted_at)}</p></div><span className="status-pill status-pill--warning">Awaiting review</span></header>
          <div className="lap-review__grid"><section><h3>Facility readiness</h3><dl className="lap-details"><div><dt>Licence</dt><dd>{selectedLaboratory.license_number || 'Not supplied'}<br />Expires {formatDate(selectedLaboratory.license_expiry)}</dd></div><div><dt>Accreditation</dt><dd>{selectedLaboratory.accreditation || 'Not supplied'}</dd></div><div><dt>Collection</dt><dd>{selectedLaboratory.home_collection_enabled ? 'Home sample collection' : 'Facility visits only'}<br />{selectedLaboratory.physical_result_pickup_enabled ? 'Physical result pickup available' : 'Digital result delivery'}</dd></div><div><dt>Location</dt><dd>{selectedLaboratory.address || 'Not supplied'}<br />{selectedLaboratory.county || ''}</dd></div></dl></section><section><h3>Facility documents</h3><DocumentList documents={selectedLaboratory.documents} /></section></div>
          <p className="lap-gate">Approving this laboratory activates its operational workspace. The partner can then configure the test catalogue and assign technicians.</p>
          <ReviewActions saving={saving} noteAction={noteAction} note={note} onNoteChange={setNote} onApprove={() => void review('verify')} onRequest={() => startNote('request_changes')} onReject={() => startNote('suspend')} onCancel={() => setNoteAction(null)} onSubmitNote={() => void review(noteAction!, note.trim())} requestLabel="Request changes" rejectLabel="Suspend application" />
        </>}
      </article>
    </div>
  </section>
}

function DocumentList({ documents }: { documents?: Array<{ id?: number; name?: string; download_url?: string }> }) {
  if (!documents?.length) return <p className="lap-empty">No documents submitted.</p>
  return <div className="lap-documents">{documents.map((document) => document.download_url ? <a key={document.id} href={document.download_url} target="_blank" rel="noreferrer"><span>PDF</span>{document.name || 'View document'}</a> : <span key={document.id}>{document.name || 'Document uploaded'}</span>)}</div>
}

function ReviewActions({ saving, noteAction, note, onNoteChange, onApprove, onRequest, onReject, onCancel, onSubmitNote, requestLabel = 'Request documents', rejectLabel = 'Reject application' }: { saving: boolean; noteAction: ReviewAction | null; note: string; onNoteChange: (value: string) => void; onApprove: () => void; onRequest: () => void; onReject: () => void; onCancel: () => void; onSubmitNote: () => void; requestLabel?: string; rejectLabel?: string }) {
  if (noteAction) return <div className="lap-note"><label>{noteAction === 'request_docs' || noteAction === 'request_changes' ? 'Required changes' : 'Reason'}<textarea autoFocus value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Give the applicant clear next steps…" /></label><div className="cm-row-actions"><button className="btn btn--ghost btn--sm" type="button" onClick={onCancel}>Cancel</button><button className="btn btn--primary btn--sm" type="button" disabled={saving || !note.trim()} onClick={onSubmitNote}>{saving ? 'Saving…' : 'Send outcome'}</button></div></div>
  return <div className="lap-actions"><button className="btn btn--primary btn--sm" disabled={saving} type="button" onClick={onApprove}>Approve</button><button className="btn btn--outline btn--sm" disabled={saving} type="button" onClick={onRequest}>{requestLabel}</button><button className="btn btn--ghost btn--sm" disabled={saving} type="button" onClick={onReject}>{rejectLabel}</button></div>
}
