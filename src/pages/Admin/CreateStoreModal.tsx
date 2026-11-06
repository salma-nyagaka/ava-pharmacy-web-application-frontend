import { useState, type FormEvent } from 'react'
import Dialog from '../../components/Dialog/Dialog'
import { apiClient } from '../../lib/apiClient'
import { unwrap } from '../../services/credentialService'
export default function CreateStoreModal({onClose,onCreated,store}:{onClose:()=>void;onCreated:(name:string)=>void;store?:{id:number;name:string;city?:string;code:string;is_active:boolean}}) {
  const [form,setForm]=useState({name:store?.name||'',city:store?.city||'',code:store?.code||''})
  const [active,setActive]=useState(store?.is_active??true)
  const [errors,setErrors]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  async function save(event:FormEvent) {
    event.preventDefault()
    const requiredErrors:Record<string,string>={}
    if(!form.name.trim())requiredErrors.name='Store name is required.'
    if(!form.city.trim())requiredErrors.city='City is required.'
    if(!form.code.trim())requiredErrors.code='Store code is required.'
    if(Object.keys(requiredErrors).length){setErrors(requiredErrors);return}
    setErrors({});setBusy(true)
    try {
      const payload={name:form.name.trim(),city:form.city.trim(),...(form.code.trim()?{code:form.code.trim()}:{}),is_active:active}
      const saved=unwrap<{name:string}>(await (store?apiClient.patch(`/admin/stores/${store.id}/`,payload):apiClient.post('/admin/stores/',payload)))
      window.dispatchEvent(new Event('ava:stores-updated'));onCreated(saved.name)
    }catch(error:any){
      const details=error.response?.data?.error?.details||error.response?.data
      const messages:Record<string,string>={}
      if(details&&typeof details==='object')Object.entries(details).forEach(([key,value])=>{messages[key]=Array.isArray(value)?value.join(' '):String(value)})
      setErrors(Object.keys(messages).length?messages:{general:'Unable to create store. Please try again.'})
    }finally{setBusy(false)}
  }
  return <div className="modal-overlay"><Dialog className="modal sr-modal" role="dialog" aria-modal="true" aria-label={store?'Edit store':'Add store'} busy={busy} onClose={onClose}><div className="modal__header"><h2>{store?'Edit store':'Add store'}</h2><button className="modal__close" type="button" disabled={busy} aria-label="Close store form" onClick={onClose}>×</button></div><form onSubmit={save} noValidate><div className="modal__content"><p className="sr-hint">{store?'Update this store’s details and availability.':'Create a stock location. It becomes available when adding stock or selecting a store.'}</p>{errors.general&&<p className="sr-error" role="alert">{errors.general}</p>}<fieldset disabled={busy} className="sr-grid">{([['name','Store name *'],['city','City *'],['code','Store code *']] as const).map(([key,label])=><label key={key}>{label}<input required autoFocus={key==='name'} maxLength={key==='name'?120:key==='code'?50:100} value={form[key]} aria-invalid={Boolean(errors[key])} onChange={event=>{setForm(value=>({...value,[key]:event.target.value}));setErrors(value=>({...value,[key]:''}))}} />{errors[key]&&<span className="sr-error" role="alert">{errors[key]}</span>}</label>)}</fieldset>{store&&<label className="store-active-toggle"><input type="checkbox" checked={active} disabled={busy} onChange={event=>setActive(event.target.checked)} /> Active store</label>}<p className="sr-hint">All fields marked * are required. Use a unique store code, for example gtc-westlands.</p></div><div className="modal__footer"><button type="button" className="btn btn--outline" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy?'Saving…':store?'Save changes':'Create store'}</button></div></form></Dialog></div>
}
