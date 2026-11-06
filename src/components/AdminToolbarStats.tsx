export default function AdminToolbarStats({ items }: { items: { label: string; value: number | string; tone?: string }[] }) {
  return <div className="cm-toolbar-stats" aria-label="Record totals">{items.map(item => <div className={`cm-toolbar-stat cm-toolbar-stat--${item.tone ?? 'neutral'}`} key={item.label}><span>{item.label}</span><strong>{typeof item.value === 'number' ? item.value.toLocaleString('en-KE') : item.value}</strong></div>)}</div>
}
