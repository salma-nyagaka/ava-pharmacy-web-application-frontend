import { FormEvent, useEffect, useMemo, useState } from 'react'
import { faqService, type FAQ, type FAQPayload } from '../../services/faqService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

const EMPTY_FORM: FAQPayload = {
  category: '',
  question: '',
  answer: '',
  is_published: true,
  sort_order: 0,
}

function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<FAQ | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FAQPayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setFaqs(await faqService.listAdmin())
    } catch {
      setError('Unable to load FAQs. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return faqs
    return faqs.filter((faq) => [faq.category, faq.question, faq.answer].join(' ').toLowerCase().includes(query))
  }, [faqs, search])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (faq: FAQ) => {
    setEditing(faq)
    setForm({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      is_published: faq.is_published,
      sort_order: faq.sort_order,
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (!saving) setShowModal(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.category.trim() || !form.question.trim() || !form.answer.trim()) {
      setFormError('Category, question, and answer are required.')
      return
    }

    setSaving(true)
    setFormError('')
    const payload = {
      ...form,
      category: form.category.trim(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      sort_order: Math.max(0, Number(form.sort_order) || 0),
    }
    try {
      const saved = editing
        ? await faqService.update(editing.id, payload)
        : await faqService.create(payload)
      setFaqs((current) => editing
        ? current.map((faq) => faq.id === saved.id ? saved : faq)
        : [...current, saved])
      setShowModal(false)
    } catch {
      setFormError('Unable to save this FAQ. Please review the fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (faq: FAQ) => {
    if (!window.confirm(`Delete FAQ "${faq.question}"?`)) return
    try {
      await faqService.remove(faq.id)
      setFaqs((current) => current.filter((item) => item.id !== faq.id))
    } catch {
      setError('Unable to delete the FAQ. Please try again.')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div className="admin-page__title">
          <h1>Frequently Asked Questions</h1>
          <p>Create, categorize, order, and publish the answers shown on the storefront.</p>
        </div>
        <div className="admin-page__actions">
          <button className="btn btn--primary" type="button" onClick={openCreate}>Add FAQ</button>
        </div>
      </div>

      {error && <div className="cm-error-banner">{error}</div>}

      <div className="admin-page__filters">
        <input
          className="admin-input"
          placeholder="Search questions, answers, or categories…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="cm-panel">
        {loading ? (
          <div className="cm-empty-state"><h2 className="cm-empty-state__title">Loading FAQs…</h2></div>
        ) : filtered.length === 0 ? (
          <div className="cm-empty-state">
            <h2 className="cm-empty-state__title">No FAQs found</h2>
            <p>Create a published FAQ to make the storefront FAQ page and navbar link appear.</p>
          </div>
        ) : (
          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead><tr><th>Question</th><th>Category</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((faq) => (
                  <tr key={faq.id}>
                    <td><strong>{faq.question}</strong></td>
                    <td>{faq.category}</td>
                    <td><span className={faq.is_published ? 'cm-status cm-status--active' : 'cm-status cm-status--inactive'}>{faq.is_published ? 'Published' : 'Draft'}</span></td>
                    <td>{faq.sort_order}</td>
                    <td>
                      <div className="cm-row-actions">
                        <button className="cm-row-btn btn--sm" type="button" onClick={() => openEdit(faq)}>Edit</button>
                        <button className="cm-row-btn cm-row-btn--delete btn--sm" type="button" onClick={() => void remove(faq)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="cm-overlay" onClick={closeModal}>
          <div className="cm-modal" role="dialog" aria-modal="true" aria-labelledby="faq-form-title" onClick={(event) => event.stopPropagation()}>
            <div className="cm-modal__header">
              <div><h2 id="faq-form-title">{editing ? 'Edit FAQ' : 'Add FAQ'}</h2><p>Only published entries appear on the website.</p></div>
              <button className="cm-modal__close" type="button" aria-label="Close" onClick={closeModal}>×</button>
            </div>
            <form className="cm-form" onSubmit={submit}>
              {formError && <p className="cm-form__error">{formError}</p>}
              <label className="cm-field">
                <span>Category *</span>
                <input className="admin-input" maxLength={100} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="e.g. Delivery" />
              </label>
              <label className="cm-field">
                <span>Question *</span>
                <input className="admin-input" maxLength={255} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} />
              </label>
              <label className="cm-field">
                <span>Answer *</span>
                <textarea className="admin-textarea" rows={7} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} />
              </label>
              <div className="cm-form-grid">
                <label className="cm-field">
                  <span>Sort order</span>
                  <input className="admin-input" min="0" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
                </label>
                <label className="cm-field">
                  <span>Status</span>
                  <select className="admin-select" value={form.is_published ? 'published' : 'draft'} onChange={(event) => setForm({ ...form, is_published: event.target.value === 'published' })}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
              </div>
              <div className="cm-modal__actions">
                <button className="btn btn--outline" type="button" onClick={closeModal}>Cancel</button>
                <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save FAQ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FAQManagement
