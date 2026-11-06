import { useSearchParams } from 'react-router-dom'
import { formatStatus } from '../../utils/formatStatus'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supportService } from '../../services/supportService'
import type { SupportTicket } from '../../data/support'
import '../../styles/pages/AccountTools.css'
export default function AccountSupportPage() {
 const pending=useRef(false)
 const [tickets,setTickets]=useState<SupportTicket[]>([])
 const [params,setParams]=useSearchParams()
 const selected=Number(params.get('ticket'))||null
 const setSelected=(id:number)=>setParams(current=>{const next=new URLSearchParams(current);next.set('ticket',String(id));return next})
 const [subject,setSubject]=useState(''),[channel,setChannel]=useState('other'),[reference,setReference]=useState(''),[reply,setReply]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false)
 const load=useCallback(async()=>{try{setTickets((await supportService.list()).data);setError('')}catch{setError('Unable to load support history. Please try again.')}finally{setLoaded(true)}},[])
 useEffect(()=>{void load()},[load]);const ticket=tickets.find(t=>t.backendId===selected)
 const create=async()=>{if(pending.current)return;pending.current=true;setError('');setBusy(true);try{const t=await supportService.create({subject:subject.trim(),channel,reference_id:reference.trim()});await load();setSelected(t.backendId);setSubject('');setReference('')}catch{setError('Please check your ticket details and try again.')}finally{pending.current=false;setBusy(false)}}
 const send=async()=>{if(!ticket||pending.current)return;pending.current=true;setError('');setBusy(true);try{await supportService.appendNote(ticket.backendId,{message:reply.trim()});setReply('');await load()}catch{setError('Your reply was not saved. Please try again.')}finally{pending.current=false;setBusy(false)}}
 return <section className="account-tools"><h1>Support requests</h1><p>Create a ticket and keep your replies and resolution history together.</p><button disabled={busy} onClick={()=>void load()}>Refresh support history</button>{error&&<p role="alert">{error}</p>}
 <form aria-busy={busy} className="account-tools__card" onSubmit={e=>{e.preventDefault();void create()}}><h2>New support request</h2><label>Subject<textarea readOnly={busy} required maxLength={500} value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Topic<select disabled={busy} value={channel} onChange={e=>setChannel(e.target.value)}><option value="other">General</option><option value="order">Order</option><option value="prescription">Prescription</option><option value="consultation">Consultation</option></select></label><label>Related reference (optional)<input readOnly={busy} maxLength={50} value={reference} onChange={e=>setReference(e.target.value)}/></label><button disabled={busy||!subject.trim()}>Create ticket</button></form>
 <section className="account-tools__card"><h2>Your tickets</h2>{tickets.map(t=><button key={t.id} aria-pressed={selected===t.backendId} onClick={()=>setSelected(t.backendId)}>{t.id} · {t.subject} · {formatStatus(t.status)}</button>)}{loaded&&!tickets.length&&<p>No support tickets yet.</p>}{selected&&loaded&&!ticket&&<p role="alert">This ticket is unavailable to your account.</p>}</section>
 {ticket&&<section className="account-tools__card"><h2>{ticket.id}: {ticket.subject}</h2><p>Status: {formatStatus(ticket.status)}</p>{ticket.notes.map((n,i)=><article key={i}><strong>{n.author}</strong><small> · {n.time}</small><p>{n.message}</p></article>)}<form aria-busy={busy} onSubmit={e=>{e.preventDefault();void send()}}><label>Your reply<textarea readOnly={busy} maxLength={10000} required value={reply} onChange={e=>setReply(e.target.value)}/></label><button disabled={busy||!reply.trim()}>Send reply</button></form></section>}</section>
}
