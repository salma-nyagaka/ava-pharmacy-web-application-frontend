import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Dialog from '../src/components/Dialog/Dialog'
import { SearchableSelect } from '../src/components/SearchableSelect/SearchableSelect'
import { SearchableMultiSelect } from '../src/components/SearchableMultiSelect/SearchableMultiSelect'
import '../src/styles/index.css'
import '../src/styles/shared.css'

export default function Fixture() {
  const [open, setOpen] = useState(false)
  const [nested, setNested] = useState(false)
  const [busy, setBusy] = useState(false)
  const [value, setValue] = useState<number | string | ''>('')
  const [values, setValues] = useState<Array<number | string>>([])
  const options = [{ value: 1, label: 'First medicine variant' }, { value: 2, label: 'Second medicine variant with a deliberately long name' }, { value: 3, label: 'Third medicine variant' }]
  return <main className="container" style={{ paddingBlock: 24 }}>
    <h1>UI interaction regression fixture</h1><p>Local development only. No API calls or business records.</p>
    <button className="btn btn--primary" onClick={() => setOpen(true)}>Open test dialog</button>
    <button className="btn btn--outline">Outside dialog</button>
    <p role="status">Selected variant: {value || 'none'}; Categories: {values.join(', ') || 'none'}</p>
    {open && <div className="modal-overlay" onClick={() => setOpen(false)}>
      <Dialog className="modal" onClose={() => setOpen(false)} busy={busy} onClick={(event) => event.stopPropagation()}>
        <div className="modal__header"><h2>Test dialog</h2><button className="modal__close" aria-label="Close test dialog" onClick={() => setOpen(false)}>×</button></div>
        <div className="modal__content">
          <label><input type="checkbox" checked={busy} onChange={(event) => setBusy(event.target.checked)} /> Simulate saving</label>
          <SearchableSelect ariaLabel="Medicine variant" options={options} value={value} onChange={setValue} />
          <SearchableMultiSelect ariaLabel="Categories" options={options} value={values} onChange={setValues} />
          <button className="btn btn--outline" onClick={() => setNested(true)}>Open nested dialog</button>
        </div>
        <div className="modal__footer"><button className="btn btn--outline" onClick={() => setOpen(false)}>Cancel</button></div>
        {nested && <div className="modal-overlay" onClick={(event) => { event.stopPropagation(); setNested(false) }}>
          <Dialog className="modal" onClose={() => setNested(false)} onClick={(event) => event.stopPropagation()}>
            <div className="modal__header"><h2>Nested dialog</h2></div>
            <div className="modal__content"><button className="btn btn--outline" onClick={() => setNested(false)}>Close nested dialog</button></div>
          </Dialog>
        </div>}
      </Dialog>
    </div>}
  </main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>)
