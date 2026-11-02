import { useState } from 'react'
import { subscribeToNewsletter } from '../../services/newsletterService'
export default function NewsletterForm(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 return <form onSubmit={e=>{e.preventDefault();setBusy(true);setError('');void subscribeToNewsletter(email,'footer').then(setMessage).catch(e=>setError(e instanceof Error?e.message:'Unable to subscribe.')).finally(()=>setBusy(false))}} style={{padding:'24px 0',borderBottom:'1px solid #71828a'}}><label style={{display:'block',color:'white',marginBottom:10}}>Newsletter email<input aria-label="Newsletter email" type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{marginLeft:12,padding:10,borderRadius:6,color:'#19323d',background:'white'}}/></label><span>Optional news and offers. </span><button type="submit" disabled={busy} className="btn btn--outline">{busy?'Subscribing…':'Subscribe to newsletter'}</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</form>
}
