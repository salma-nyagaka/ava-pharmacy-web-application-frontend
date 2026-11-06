import LowStockThresholdInput from '../../components/LowStockThresholdInput'
import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Dialog from '../../components/Dialog/Dialog'
import AdminKpiStats from '../../components/AdminKpiStats'
import { apiClient } from '../../lib/apiClient'
import { adminProductService } from '../../services/adminProductService'
import { unwrap } from '../../services/credentialService'
import StockRecordHistory from './StockRecordHistory'
import '../../styles/admin/ProductStockRecords.css'
type StockRow = { id:number; product_id:number; product_name:string; sku:string; strength:string; pack_size:string; store:string; store_id:number|null; batch_number:string; expiry_date:string|null; quantity:number; low_stock_threshold:number; status:string; created_at:string; added_by:string|null; updated_by:string|null; updated_at:string; read_only:boolean }
type StockData = { name:string; sku:string; total_quantity:number; records:StockRow[]; total_records?:number; page?:number; pages?:number; stats?:{total:number;units:number;products:number;stores:number} }
const dateText = (value:string) => value ? new Date(value).toLocaleString('en-KE') : 'Not recorded'
export default function ProductStockRecords({ productId }: { productId?:number }) {
  const [,setParams] = useSearchParams()
  const [data,setData] = useState<StockData|null>(null)
  const [stores,setStores] = useState<{id:number;name:string}[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')
  const [storeFilter,setStoreFilter] = useState('')
  const [rx,setRx] = useState('')
  const [status,setStatus] = useState('')
  const [page,setPage] = useState(1)
  const [expanded,setExpanded] = useState<number|null>(null)
  const [showForm,setShowForm] = useState(false)
  const [editing,setEditing] = useState<StockRow|null>(null)
  const [targetProduct,setTargetProduct] = useState<number|undefined>(productId)
  const [productQuery,setProductQuery] = useState('')
  const [options,setOptions] = useState<{id:number;name:string}[]>([])
  const [busy,setBusy] = useState(false)
  const [fieldErrors,setFieldErrors] = useState<Record<string,string>>({})
  const [form,setForm] = useState({store_id:'',batch_number:'',expiry_date:'',quantity:'',low_stock_threshold:'5',reason:''})
  const base = productId ? `/admin/products/${productId}/stock-records/` : '/admin/stock-records/'
  const query = {page,search,store:storeFilter,requires_prescription:rx,status}
  const load = async () => setData(unwrap<StockData>(await apiClient.get(base,{params:query})))
  useEffect(() => { setPage(1) },[search,storeFilter,rx,status,productId])
  useEffect(() => {
    const refresh=()=>{void adminProductService.listStores().then(setStores).catch(()=>setError('Unable to load stores.'))}
    refresh();window.addEventListener('ava:stores-updated',refresh)
    return()=>window.removeEventListener('ava:stores-updated',refresh)
  },[])
  useEffect(() => {
    let cancelled=false
    const timer=window.setTimeout(()=>{
      setLoading(true);setError('')
      void apiClient.get(base,{params:query}).then(response=>{if(!cancelled)setData(unwrap<StockData>(response))}).catch(()=>{if(!cancelled)setError('Unable to load stock records. Please retry.')}).finally(()=>{if(!cancelled)setLoading(false)})
    },150)
    return()=>{cancelled=true;window.clearTimeout(timer)}
  },[productId,page,search,storeFilter,rx,status])
  useEffect(()=>{setShowForm(false);setExpanded(null);setData(null)},[productId])
  useEffect(()=>{
    if(!showForm||targetProduct)return
    let cancelled=false
    const timer=window.setTimeout(()=>{void adminProductService.listProductOptions(productQuery).then(items=>{if(!cancelled)setOptions(items)}).catch(()=>setFieldErrors({product_id:'Unable to load products. Please retry.'}))},200)
    return()=>{cancelled=true;window.clearTimeout(timer)}
  },[showForm,productQuery,targetProduct])
  function open(row:StockRow|null,receive=false) {
    setEditing(receive?null:row);setTargetProduct(row?.product_id||productId);setFieldErrors({});setError('');setProductQuery('')
    setForm({store_id:row?.store_id?String(row.store_id):'',batch_number:row?.batch_number||'',expiry_date:row?.expiry_date||'',quantity:row&&!receive?String(row.quantity):'',low_stock_threshold:String(row?.low_stock_threshold??5),reason:''});setShowForm(true)
  }
  async function save(event:FormEvent) {
    event.preventDefault();const errors:Record<string,string>={}
    if(!targetProduct)errors.product_id='Select a product.'
    if(!editing&&!form.store_id)errors.store_id='Select a store.'
    if(!editing&&!form.batch_number.trim())errors.batch_number='Batch number is required.'
    if(form.quantity===''||!Number.isInteger(Number(form.quantity))||Number(form.quantity)<(editing?0:1))errors.quantity=editing?'Enter a total quantity of zero or more.':'Enter a received quantity greater than zero.'
    if(form.low_stock_threshold===''||!Number.isInteger(Number(form.low_stock_threshold))||Number(form.low_stock_threshold)<0)errors.low_stock_threshold='Enter a threshold of zero or more.'
    setFieldErrors(errors);if(Object.keys(errors).length)return
    setBusy(true)
    try {
      const payload={quantity:Number(form.quantity),low_stock_threshold:Number(form.low_stock_threshold),expiry_date:form.expiry_date||null,reason:form.reason,...(!editing?{store_id:Number(form.store_id),batch_number:form.batch_number.trim()}:{})}
      const target=`/admin/products/${targetProduct}/stock-records/`
      if(editing)await apiClient.patch(`${target}${editing.id}/`,payload);else await apiClient.post(target,payload)
      setShowForm(false);await load();setExpanded(null);window.dispatchEvent(new Event('ava:catalog-updated'))
    } catch(error:any) {
      const details=error.response?.data?.error?.details||error.response?.data
      if(details&&typeof details==='object')setFieldErrors(Object.fromEntries(Object.entries(details).map(([key,value])=>[key,Array.isArray(value)?value.join(' '):String(value)])))
      else setFieldErrors({general:'Unable to save stock. Please retry.'})
    }finally{setBusy(false)}
  }
  const field=(name:keyof typeof form,label:string,type='text')=>{const Input = name === 'low_stock_threshold' ? LowStockThresholdInput : 'input';return <label>{label}<Input type={type} required={name === 'batch_number'} value={form[name]} aria-invalid={Boolean(fieldErrors[name])} onChange={event=>{setForm(value=>({...value,[name]:event.target.value}));setFieldErrors(value=>({...value,[name]:''}))}} />{fieldErrors[name]&&<span role="alert" className="sr-error">{fieldErrors[name]}</span>}</label>}
  return <section className="stock-records">
    <div className="sr-heading"><div><h2>{productId?(data?.name||'Product stock'):'Stock by store & batch'}</h2><p>{productId?`${data?.sku||''} · ${data?.records.length||0} stock records · ${data?.total_quantity.toLocaleString()||0} units on hand`:'Each row is an individual stock record, with its store, batch and attribution.'}</p></div><div className="sr-actions"><button type="button" className="btn btn--primary btn--sm" disabled={loading} onClick={()=>open(null)}>Add stock</button>{productId&&<button type="button" className="btn btn--outline btn--sm" onClick={()=>setParams({view:'stock'})}>All stock records</button>}</div></div>
    {!productId&&<AdminKpiStats items={[{label:'Stock records',value:data?.stats?.total??'—'},{label:'Units on hand',value:data?.stats?.units??'—'},{label:'Products',value:data?.stats?.products??'—'},{label:'Stores',value:data?.stats?.stores??'—'}]} />}
    {!productId&&<div className="cm-toolbar"><input className="ps-search" type="search" aria-label="Search stock records" placeholder="Search product, SKU, store or batch…" value={search} onChange={event=>setSearch(event.target.value)} /><div className="sr-actions"><select className="cm-filter-select" aria-label="Filter by store" value={storeFilter} onChange={event=>setStoreFilter(event.target.value)}><option value="">All stores</option>{stores.map(store=><option key={store.id} value={store.id}>{store.name}</option>)}</select><select className="cm-filter-select" aria-label="Filter by prescription requirement" value={rx} onChange={event=>setRx(event.target.value)}><option value="">All prescription types</option><option value="true">Prescription required</option><option value="false">No prescription required</option></select><select className="cm-filter-select" aria-label="Filter stock status" value={status} onChange={event=>setStatus(event.target.value)}><option value="">All quantities</option><option value="in_stock">Above threshold</option><option value="low_stock">Low stock</option><option value="out_of_stock">Zero stock</option></select></div></div>}
    {error&&<p role="alert" className="sr-error">{error}<button onClick={()=>void load().then(()=>setError('')).catch(()=>setError('Unable to load stock records.'))}>Retry</button></p>}
    <div className="cm-panel"><div className="cm-table-wrap sr-table-scroll" role="region" aria-label="Stock records table, scroll horizontally for more columns" tabIndex={0}><table className="cm-table"><thead><tr>{!productId&&<th>Product / SKU</th>}<th>Strength</th><th>Pack size</th><th>Store</th><th>Batch</th><th>Expiry</th><th>Quantity</th><th>Threshold</th><th>Status</th><th>Added by</th><th>Date added</th><th>Actions</th></tr></thead><tbody>
      {loading?<tr><td colSpan={productId?11:12}>Loading stock records…</td></tr>:data?.records.length?data.records.map(row=><Fragment key={row.id}><tr>{!productId&&<td><button type="button" className="sr-product-link" onClick={()=>setParams({view:'stock',product:String(row.product_id)})}>{row.product_name}</button><small className="sr-sku">{row.sku}</small></td>}<td>{row.strength||'Not recorded'}</td><td>{row.pack_size||'Not recorded'}</td><td>{row.store}</td><td>{row.batch_number||'Not recorded'}</td><td>{row.expiry_date||'Not recorded'}</td><td><strong>{row.quantity.toLocaleString()}</strong></td><td>{row.low_stock_threshold}</td><td>{row.status.replace(/_/g,' ')}</td><td>{row.added_by||'Not recorded'}</td><td>{dateText(row.created_at)}</td><td><div className="cm-row-actions"><button className="cm-row-btn cm-row-btn--edit" disabled={row.read_only} onClick={()=>open(row)}>Edit</button><button className="cm-row-btn" disabled={row.read_only} onClick={()=>open(row,true)}>Receive more</button><button id={`stock-changes-trigger-${row.id}`} className="cm-row-btn" aria-expanded={expanded===row.id} onClick={()=>setExpanded(expanded===row.id?null:row.id)}>Changes</button></div>{row.read_only&&<small>POS-synced</small>}</td></tr>{expanded===row.id&&<tr><td colSpan={productId?11:12}><StockRecordHistory key={row.id} stockRecordId={row.id} onClose={()=>{setExpanded(null);document.getElementById(`stock-changes-trigger-${row.id}`)?.focus()}} /></td></tr>}</Fragment>):<tr><td colSpan={productId?11:12}>No stock records found. Use Add stock to record a delivery.</td></tr>}
    </tbody></table></div></div>
    {!productId&&data&&<div className="cm-pagination"><span>{data.total_records?.toLocaleString()} matching records · Page {data.page} of {data.pages}</span><div className="sr-actions"><button className="btn btn--outline btn--sm" disabled={loading||page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button><button className="btn btn--outline btn--sm" disabled={loading||page>=(data.pages||1)} onClick={()=>setPage(value=>value+1)}>Next</button></div></div>}
    {showForm&&<div className="modal-overlay"><Dialog className="modal sr-modal" busy={busy} role="dialog" aria-modal="true" aria-label={editing?'Edit stock record':'Add stock'} onClose={()=>setShowForm(false)}><div className="modal__header"><h2>{editing?'Edit stock record':'Add stock'}</h2><button className="modal__close" type="button" disabled={busy} aria-label="Close stock form" onClick={()=>setShowForm(false)}>×</button></div><form onSubmit={save} noValidate><div className="modal__content"><p className="sr-hint">{editing?'Enter the total quantity currently on hand.':'Enter the quantity received. It will be added to the matching store/batch or create a new record.'}</p>{fieldErrors.general&&<p role="alert" className="sr-error">{fieldErrors.general}</p>}<fieldset disabled={busy} className="sr-grid">
      {!targetProduct&&<label className="sr-full">Find product<input type="search" value={productQuery} placeholder="Search product name or SKU…" onChange={event=>setProductQuery(event.target.value)} /><select aria-label="Select product for stock" value="" onChange={event=>setTargetProduct(Number(event.target.value))}><option value="">Select a product…</option>{options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select>{fieldErrors.product_id&&<span className="sr-error">{fieldErrors.product_id}</span>}</label>}
      {!productId&&!editing&&targetProduct&&<div className="sr-full"><strong>{options.find(option=>option.id===targetProduct)?.name||data?.records.find(row=>row.product_id===targetProduct)?.product_name||`Product #${targetProduct}`}</strong><button type="button" className="cm-row-btn" onClick={()=>setTargetProduct(undefined)}>Change product</button></div>}
      {editing?<div><strong>{editing.store}</strong><p>Batch: {editing.batch_number||'Not recorded'}</p></div>:<><label>Store<select value={form.store_id} aria-invalid={Boolean(fieldErrors.store_id)} onChange={event=>setForm(value=>({...value,store_id:event.target.value}))}><option value="">Select store…</option>{stores.map(store=><option key={store.id} value={store.id}>{store.name}</option>)}</select>{fieldErrors.store_id&&<span role="alert" className="sr-error">{fieldErrors.store_id}</span>}</label>{field('batch_number','Batch number *')}</>}
      {field('expiry_date','Expiry date','date')}{field('quantity',editing?'Total quantity on hand':'Quantity received','number')}{field('low_stock_threshold','Low stock threshold','number')}{field('reason','Note / reason')}
    </fieldset></div><div className="modal__footer"><button type="button" className="btn btn--outline" disabled={busy} onClick={()=>setShowForm(false)}>Cancel</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Add stock'}</button></div></form></Dialog></div>}
  </section>
}
