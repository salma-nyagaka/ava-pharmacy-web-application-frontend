import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../lib/apiClient'
import { useAuth } from '../../context/AuthContext'
import { rows } from '../../services/notificationService'
import '../../styles/pages/AccountTools.css'
type Evidence = { id:number; title:string; evidence_type_display:string; reference_number:string; file:string|null; status:string }
export default function AccountCompliancePage(){
 const {user}=useAuth();const [items,setItems]=useState<Evidence[]>([]),[title,setTitle]=useState(''),[file,setFile]=useState<File|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const load=useCallback(async()=>{try{setItems(rows<Evidence>((await apiClient.get('/compliance/evidence/')).data));setError('')}catch{setError('Compliance evidence is unavailable to this account.')}},[])
 useEffect(()=>{void load()},[load])
 const save=async()=>{if(!file)return;setBusy(true);try{const body=new FormData();body.append('title',title);body.append('evidence_type','qa_audit_report');body.append('file',file);await apiClient.post('/compliance/evidence/',body);setTitle('');await load()}catch{setError('Upload failed. Use a PDF, JPEG or PNG up to 10 MB.')}finally{setBusy(false)}}
 const download=async(item:Evidence)=>{try{const response=await apiClient.get(`/compliance/evidence/${item.id}/download/`,{responseType:'blob'});const url=URL.createObjectURL(response.data as Blob);const link=document.createElement('a');link.href=url;link.download=`evidence-${item.id}`;link.click();URL.revokeObjectURL(url)}catch{setError('The protected document could not be downloaded.')}}
 return <section className="account-tools"><h1>Restricted compliance evidence</h1><p>Authorized administrators can add evidence. Inspectors have read-only access.</p>{error&&<p role="alert">{error}</p>}{user?.role==='admin'&&<form className="account-tools__card" onSubmit={e=>{e.preventDefault();void save()}}><h2>Add QA audit evidence</h2><label>Evidence title<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Evidence file<input type="file" required accept="application/pdf,image/png,image/jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button disabled={busy||!title.trim()||!file}>Save evidence</button></form>}{items.map(item=><article key={item.id} className="account-tools__card"><h2>{item.title}</h2><p>{item.evidence_type_display} · {item.status} · {item.reference_number}</p>{item.file&&<button onClick={()=>void download(item)}>Download protected evidence</button>}</article>)}</section>
}
