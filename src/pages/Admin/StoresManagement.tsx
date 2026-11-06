import { useEffect, useMemo, useState } from 'react'
import { adminProductService } from '../../services/adminProductService'
import CreateStoreModal from './CreateStoreModal'
type Store = {id:number;name:string;code:string;city?:string;is_active:boolean;created_at?:string}
export default function StoresManagement() {
  const [stores,setStores]=useState<Store[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [search,setSearch]=useState('')
  const [page,setPage]=useState(1)
  const [showModal,setShowModal]=useState(false)
  const [editing,setEditing]=useState<Store|undefined>()
  async function load(){setLoading(true);setError('');try{setStores(await adminProductService.listStores(true))}catch{setError('Unable to load stores. Please retry.')}finally{setLoading(false)}}
  useEffect(()=>{void load()},[])
  useEffect(()=>{setPage(1)},[search])
  const filtered=useMemo(()=>stores.filter(store=>[store.name,store.code,store.city||''].some(value=>value.toLowerCase().includes(search.trim().toLowerCase()))).sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0)||b.id-a.id),[stores,search])
  const pages=Math.max(1,Math.ceil(filtered.length/20));const current=Math.min(page,pages)
  return <section className="stores-management">
    <div className="sr-heading"><div><h2>Stores</h2><p>Create and manage the locations that hold your stock.</p></div><button className="btn btn--primary btn--sm" type="button" onClick={()=>{setEditing(undefined);setShowModal(true)}}>Add store</button></div>
    {message&&<p role="status" className="sr-hint">{message}</p>}
    <div className="cm-toolbar"><input type="search" className="ps-search" aria-label="Search stores" placeholder="Search store name, code or city…" value={search} onChange={event=>setSearch(event.target.value)} /><span>{filtered.length} stores</span></div>
    {error&&<p role="alert" className="sr-error">{error} <button onClick={()=>void load()}>Retry</button></p>}
    <div className="cm-panel"><div className="cm-table-wrap"><table className="cm-table"><thead><tr><th>Store name</th><th>Code</th><th>City</th><th>Status</th><th>Date added</th><th>Actions</th></tr></thead><tbody>
      {loading?<tr><td colSpan={6}>Loading stores…</td></tr>:filtered.length?filtered.slice((current-1)*20,current*20).map(store=><tr key={store.id}><td><strong>{store.name}</strong></td><td>{store.code}</td><td>{store.city||'Not recorded'}</td><td><span className={`cm-status ${store.is_active?'cm-status--active':'cm-status--inactive'}`}>{store.is_active?'Active':'Inactive'}</span></td><td>{store.created_at?new Date(store.created_at).toLocaleString('en-KE'):'Not recorded'}</td><td><button type="button" className="cm-row-btn cm-row-btn--edit" onClick={()=>{setEditing(store);setShowModal(true)}}>Edit</button></td></tr>):<tr><td colSpan={6}>No stores found.</td></tr>}
    </tbody></table></div></div>
    {pages>1&&<div className="cm-pagination"><span>Page {current} of {pages}</span><div className="sr-actions"><button type="button" className="btn btn--outline btn--sm" disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><button type="button" className="btn btn--outline btn--sm" disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div></div>}
    {showModal&&<CreateStoreModal store={editing} onClose={()=>setShowModal(false)} onCreated={name=>{setShowModal(false);setMessage(`${name} ${editing?'updated':'created'}.`);void load()}} />}
  </section>
}
