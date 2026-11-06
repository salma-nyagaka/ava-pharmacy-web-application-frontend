import './AdminKpiStats.css'
type KpiItem = { label: string; value: number | string }
const tones = ['blue','green','purple','red','teal','amber']
export default function AdminKpiStats({items}:{items:KpiItem[]}) {
  return <div className="cm-kpi-grid store-kpis" role="group" aria-label="Record totals">
    {items.map((item,index)=>{
      const label=item.label.toLowerCase()
      const inactive=/inactive|out of stock|suspended|expired/.test(label)
      const active=!inactive&&/active|in stock/.test(label)
      const warning=/low stock|pending|backorder/.test(label)
      const tone=inactive?'red':active?'green':warning?'amber':tones[index%tones.length]
      return <div className="cm-kpi-card" key={item.label}>
        <div className={`cm-kpi-card__icon cm-kpi-card__icon--${tone}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
            {inactive?<><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>:active?<><path d="M21 11v1a9 9 0 1 1-5.3-8.2"/><path d="m9 11 3 3L22 4"/></>:warning?<><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/></>:/stores/.test(label)?<><path d="M3 10h18l-2-7H5l-2 7Zm2 0v11h14V10M9 21v-7h6v7"/></>:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}
          </svg>
        </div>
        <div className="cm-kpi-card__body"><span className="cm-kpi-card__label">{item.label}</span><strong className="cm-kpi-card__value">{typeof item.value==='number'?item.value.toLocaleString('en-KE'):item.value}</strong></div>
      </div>
    })}
  </div>
}
