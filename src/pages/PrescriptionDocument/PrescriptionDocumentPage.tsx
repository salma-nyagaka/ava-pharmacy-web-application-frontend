import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resolveMediaUrl } from '../../lib/apiClient'
import '../../styles/pages/PrescriptionDocumentPage.css'

const isImageFile = (value: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(value)
const isPdfFile = (value: string) => /\.pdf($|\?)/i.test(value)
const isTextFile = (value: string) => /\.(txt|text)($|\?)/i.test(value)

function fileNameFromUrl(value: string) {
  try {
    const parsed = new URL(value)
    return decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || 'Prescription document')
  } catch {
    return decodeURIComponent(value.split('/').filter(Boolean).pop() || 'Prescription document')
  }
}

export default function PrescriptionDocumentPage() {
  const [params] = useSearchParams()
  const rawSrc = params.get('src') || ''
  const src = useMemo(() => resolveMediaUrl(rawSrc) || rawSrc, [rawSrc])
  const fileName = useMemo(() => fileNameFromUrl(src), [src])
  const [textContent, setTextContent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setTextContent('')
    setError('')
    if (!src || !isTextFile(src)) return

    fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load document.')
        return response.text()
      })
      .then(setTextContent)
      .catch(() => setError('Unable to load this document right now.'))
  }, [src])

  return (
    <main className="rx-document-page">
      <section className="rx-document-page__shell">
        <header className="rx-document-page__header">
          <div>
            <span className="rx-document-page__eyebrow">Prescription document</span>
            <h1>{fileName}</h1>
          </div>
          <div className="rx-document-page__actions">
            <Link to="/pharmacist/dashboard" className="rx-document-page__btn rx-document-page__btn--secondary">
              Back to dashboard
            </Link>
            {src && (
              <a href={src} download className="rx-document-page__btn rx-document-page__btn--primary">
                Download
              </a>
            )}
          </div>
        </header>

        <div className="rx-document-page__meta">
          <span>Source: uploaded prescription</span>
          <span>{fileName}</span>
        </div>

        <section className="rx-document-page__viewer">
          {!src ? (
            <div className="rx-document-page__empty">No document selected.</div>
          ) : isImageFile(src) ? (
            <img src={src} alt={fileName} className="rx-document-page__image" />
          ) : isPdfFile(src) ? (
            <iframe src={src} title={fileName} className="rx-document-page__frame" />
          ) : isTextFile(src) ? (
            error ? (
              <div className="rx-document-page__empty">{error}</div>
            ) : (
              <pre className="rx-document-page__text">{textContent || 'Loading document...'}</pre>
            )
          ) : (
            <div className="rx-document-page__empty">
              <p>This document type cannot be previewed here.</p>
              <a href={src} className="rx-document-page__btn rx-document-page__btn--primary">Open file</a>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
