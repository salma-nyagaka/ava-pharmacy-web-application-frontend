import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '../lib/apiClient'

interface SharedFile { id: number; name: string; sender: string }
interface Props { consultationId: number; refreshKey?: number }

export default function ConsultationAttachments({ consultationId, refreshKey }: Props) {
  const [files, setFiles] = useState<SharedFile[]>([])
  const [busy, setBusy] = useState(false)
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
  }
  return <section aria-label="Consultation shared files" style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
    <strong>Shared files</strong>
    <input ref={input} type="file" aria-label="Choose consultation attachment" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} style={{ display: 'block', maxWidth: '100%', marginTop: 8 }} />
    <small>{busy ? 'Sharing file…' : 'Up to 10 MB per file.'}</small>
    {files.length > 0 && <ul>{files.map((file) => <li key={file.id}><button type="button" onClick={() => { void download(file) }}>{file.name}</button> <small>— {file.sender}</small></li>)}</ul>}
    {error && <p role="alert">{error}</p>}
  </section>
}
