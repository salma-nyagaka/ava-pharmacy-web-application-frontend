import { useCallback, useEffect, useRef, useState } from 'react'
import './ConsultationAttachments.css'
import { apiClient } from '../lib/apiClient'

interface SharedFile { id: number; name: string; sender: string }
interface Props { consultationId: number; refreshKey?: number }

export default function ConsultationAttachments({ consultationId, refreshKey }: Props) {
  const [files, setFiles] = useState<SharedFile[]>([])
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const load = useCallback(async () => {
    const response = await apiClient.get(`/consultations/${consultationId}/`)
    const record = response.data?.data ?? response.data
    return (record.messages ?? []).filter((message: Record<string, unknown>) => message.attachment_url).map((message: Record<string, unknown>) => ({
      id: Number(message.id), name: String(message.message || 'Consultation attachment'), sender: String(message.sender_name || 'Participant'),
    })) as SharedFile[]
  }, [consultationId])
  useEffect(() => {
    let active = true
    setFiles([])
    setError('')
    void load().then((items) => { if (active) setFiles(items) }).catch(() => { if (active) setError('Unable to load shared files.') })
    return () => { active = false }
  }, [load, refreshKey])
  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError('Choose a file smaller than 10 MB.'); return }
    setBusy(true)
    setError('')
    try {
      const data = new FormData()
      data.append('attachment', file)
      data.append('message', file.name)
      data.append('message_type', file.type.startsWith('image/') ? 'image' : 'file')
      await apiClient.post(`/consultations/${consultationId}/messages/`, data)
      setFiles(await load())
    } catch { setError('Unable to share this file. Please try again.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  const download = async (file: SharedFile) => {
    setDownloading(file.id)
    setError('')
    try {
      const response = await apiClient.get(`/consultations/messages/${file.id}/attachment/`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name.replace(/[\\/]/g, '_')
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setError('Unable to download this file. Check your consultation access and try again.') }
    finally { setDownloading(null) }
  }
  return <section aria-label="Consultation shared files" className="consultation-files">
    <header className="consultation-files__header">
      <div><h3>Shared files <span>{files.length}</span></h3><p>Photos & documents · Up to 10 MB per file.</p></div>
      <button className="consultation-files__upload" type="button" disabled={busy} onClick={() => input.current?.click()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></svg>
        {busy ? 'Uploading…' : 'Upload file'}
      </button>
      <input ref={input} type="file" aria-label="Choose consultation attachment" hidden disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} />
    </header>
    {busy && <p className="consultation-files__status" role="status">Sharing your file securely…</p>}
    {files.length > 0 ? <ul className="consultation-files__list">{files.map((file) => <li key={file.id}>
      <span className="consultation-files__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h5"/></svg></span>
      <div className="consultation-files__info"><strong title={file.name}>{file.name}</strong><small>Shared by {file.sender}</small></div>
      <button type="button" className="consultation-files__download" disabled={downloading !== null} aria-label={`Download ${file.name}`} onClick={() => { void download(file) }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/></svg>
        {downloading === file.id ? 'Downloading…' : 'Download'}
      </button>
    </li>)}</ul> : <p className="consultation-files__empty">No files shared yet.</p>}
    {error && <p role="alert" className="consultation-files__error">{error}</p>}
  </section>
}
