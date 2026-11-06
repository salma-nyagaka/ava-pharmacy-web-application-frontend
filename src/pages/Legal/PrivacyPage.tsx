import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { apiClient } from '../../lib/apiClient'
export default function PrivacyPage() {
  const { user } = useAuth(); const { settings } = useSiteSettings()
  const [loadedFor, setLoadedFor] = useState<number | null>(null)
  const [requests, setRequests] = useState<any[]>([]); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  const load = async () => { const res = await apiClient.get('/privacy/requests/'); const v = res.data?.data ?? res.data; setRequests(Array.isArray(v) ? v : v?.results ?? []); setLoadedFor(user?.id ?? null) }
  useEffect(() => { if (user) void load().catch(() => setMessage('Unable to load requests. Please retry.')) }, [user?.id])
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true)
    try { await apiClient.post('/privacy/requests/', Object.fromEntries(data)); await load(); form.reset(); setMessage('Request saved. We may need to verify your identity before responding.') }
    catch { setMessage('Unable to save the request. Please retry or contact support.') } finally { setBusy(false) }
  }
  return <div><PageHeader title="Privacy and your information" subtitle="How the service uses information and how to exercise your rights." badge="Privacy" /><section className="page"><div className="container">
    <h2>Information and purposes</h2><p>Ava Pharmacy uses account/contact details, delivery details, payment references and information you provide for prescriptions, consultations and lab services to provide the requested care, assess medicine suitability, fulfil orders, maintain required records, prevent fraud and respond to support requests. Avoid supplying unrelated personal information. Child records require an authorized guardian.</p>
    <p>Authorized clinicians, pharmacy and laboratory staff access records needed for their role. Delivery and payment providers receive information required for their service. Clinical records are readable by authorized service staff; this service does not claim end-to-end encryption or HIPAA certification.</p>
    <h2>Retention and requests</h2><p>Clinical records are subject to minimum retention and prescription-preservation obligations. Closing an account disables access and does not automatically erase retained clinical records. A privacy administrator must assess each request, document its lawful basis and explain any retention restriction. Infrastructure location, processor agreements and security certificates require operational verification.</p>
    <p>You can request access, correction, erasure, restriction, objection or portability below. We verify identity before releasing or changing sensitive information. Contact {settings.supportEmail}, {settings.supportPhone}, or write to {settings.postalAddress || settings.supportAddress}. You may complain to the Office of the Data Protection Commissioner in Kenya.</p>
    <p>The privacy owner must approve and maintain the processing register, applicable lawful bases, processor list, transfer safeguards and retention schedule before production use. This page does not certify those operational arrangements.</p>
    <h2>Submit a private request</h2>{!user ? <p><Link to="/login">Sign in</Link> to submit and track a request, or contact support.</p> : <form onSubmit={submit} className="form-card"><label>Request type<select name="request_type" required>{['access','correction','erasure','restriction','objection','portability'].map(t => <option key={t}>{t}</option>)}</select></label><label>What would you like us to review?<textarea name="details" required minLength={5} maxLength={3000} /></label><button disabled={busy}>Submit request</button></form>}
    <p role="status">{message}</p>{(loadedFor === user?.id ? requests : []).map(r => <div key={r.id}><p>{r.request_type}: {r.status}</p><p>{r.response}</p></div>)}
  </div></section></div>
}
