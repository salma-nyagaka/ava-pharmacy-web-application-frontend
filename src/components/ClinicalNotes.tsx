import { useEffect, useState } from 'react'
import { apiClient } from '../lib/apiClient'
import './ClinicalNotes.css'

const fields = [
  ['complaint', 'Presenting complaint'], ['history', 'History of present illness'],
  ['exam', 'Examination findings'], ['diagnosis', 'Diagnosis / assessment'],
  ['plan', 'Treatment plan'], ['followUp', 'Follow-up instructions'],
  ['assessment', 'Additional clinical notes'],
] as const
type Notes = Record<string, string>
type Payload = { notes: Notes; updated_at: string | null }
const unwrap = (data: Payload | { data: Payload }): Payload => 'data' in data ? data.data : data

export default function ClinicalNotes({ consultationId, editable = false }: { consultationId?: number | null; editable?: boolean }) {
  const [notes, setNotes] = useState<Notes>({})
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!consultationId) return
    let cancelled = false
    const load = async () => {
      try {
        const response = await apiClient.get(`/consultations/${consultationId}/clinical-notes/`)
        if (!cancelled) {
          const data = unwrap(response.data)
          setNotes(data.notes); setUpdatedAt(data.updated_at); setError('')
        }
      } catch {
        if (!cancelled) setError('Unable to load clinical notes. Please reopen this consultation to retry.')
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    const timer = editable ? undefined : window.setInterval(() => void load(), 15000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [consultationId, editable])
  const save = async () => {
    if (busy || loading || !consultationId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await apiClient.put(`/consultations/${consultationId}/clinical-notes/`, { notes })
      const data = unwrap(response.data)
      setNotes(data.notes); setUpdatedAt(data.updated_at); setNotice('Clinical notes saved and shared.')
    } catch { setError('Unable to save clinical notes. Your changes are still here; please try again.') }
    finally { setBusy(false) }
  }
  if (!consultationId) return null
  return <section className={`clinical-notes${editable ? ' clinical-notes--editable' : ''}`} aria-label="Clinical notes">
    <h3>Clinical notes</h3>
    <p>{editable ? 'Saved notes are shared with the patient or guardian. Changes remain unsaved until you select Save and share.' : 'Notes shared by your clinician.'}</p>
    {loading ? <p role="status">Loading clinical notes…</p> : <>
      {fields.map(([key, label]) => editable ? <label key={key}><span>{label}</span><textarea rows={3} maxLength={10000} value={notes[key] || ''} disabled={busy || (!!error && !updatedAt && Object.keys(notes).length === 0)} onChange={event => { setNotes({ ...notes, [key]: event.target.value }); setNotice('Unsaved changes') }} /></label> : notes[key] ? <div key={key}><h4>{label}</h4><p className="clinical-notes__text">{notes[key]}</p></div> : null)}
      {!editable && !Object.values(notes).some(Boolean) && !error && <p>No clinical notes have been shared yet.</p>}
      {updatedAt && <p>Last saved: {new Date(updatedAt).toLocaleString()}</p>}
      {editable && <button type="button" className="btn btn--primary btn--sm" disabled={busy || loading || (!!error && !updatedAt && Object.keys(notes).length === 0)} onClick={() => void save()}>{busy ? 'Saving…' : 'Save and share notes'}</button>}
    </>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>
}
