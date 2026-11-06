import { isAxiosError } from 'axios'
import '../../styles/admin/FAQManagement.css'
import Dialog from '../../components/Dialog/Dialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { faqService, type FAQ, type FAQPayload } from '../../services/faqService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

const FAQ_CATEGORIES = [
  'Ordering & Prescriptions',
  'Delivery & Collection',
  'Payments & Pricing',
  'Quality & Safety',
  'Support',
] as const

const EMPTY_FORM: FAQPayload = {
  category: FAQ_CATEGORIES[0],
  question: '',
  answer: '',
  is_published: true,
  sort_order: 10,
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FAQPayload, string>>>({})

  const updateField = <K extends keyof FAQPayload>(field: K, value: FAQPayload[K]) => {
    setForm(current => ({ ...current, [field]: value }))
    setFieldErrors(current => ({ ...current, [field]: undefined }))
    setFormError('')
  }

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
    return faqs.filter(faq => !query || [faq.category, faq.question, faq.answer].join(' ').toLowerCase().includes(query))
      .sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || b.id - a.id)
  }, [faqs, search])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFieldErrors({})
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
    setFieldErrors({})
    setShowModal(true)
  }

  const closeModal = () => {
    if (!saving) setShowModal(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const errors: Partial<Record<keyof FAQPayload, string>> = {}
    if (!form.category.trim()) errors.category = 'Select a category.'
    if (!form.question.trim()) errors.question = 'Enter a question.'
    if (!form.answer.trim()) errors.answer = 'Enter an answer.'
    if (!Number.isInteger(form.sort_order) || form.sort_order < 0) errors.sort_order = 'Enter a whole number of 0 or more.'
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length) {
      document.getElementById(`faq-${Object.keys(errors)[0]}`)?.focus()
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
        : [saved, ...current])
      setShowModal(false)
    } catch (error) {
      const data = isAxiosError(error) ? error.response?.data : undefined
      const details = data?.error?.details ?? data?.errors ?? data
      const errors: Partial<Record<keyof FAQPayload, string>> = {}
      for (const field of ['category', 'question', 'answer', 'sort_order', 'is_published'] as const) {
        const message = details?.[field]
        if (typeof message === 'string') errors[field] = message
        else if (Array.isArray(message)) errors[field] = message.join(' ')
      }
      setFieldErrors(errors)
      if (Object.keys(errors).length) document.getElementById(`faq-${Object.keys(errors)[0]}`)?.focus()
      else setFormError('Unable to save this FAQ. Check your connection and try again.')
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
          <p>Create, order, and publish answers shown on the storefront.</p>
        </div>
        <div className="admin-page__actions">
          <button className="btn btn--primary" type="button" onClick={openCreate}>Add FAQ</button>
        </div>
      </div>

      {error && <div className="cm-error-banner">{error}</div>}

      <div className="admin-page__filters">
        <input aria-label="Search questions, answers, or categories"
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
          <Dialog busy={saving} onClose={closeModal} className="cm-modal" role="dialog" aria-modal="true" aria-labelledby="faq-form-title" onClick={(event) => event.stopPropagation()}>
            <div className="cm-modal__header">
              <div><h2 id="faq-form-title">{editing ? 'Edit FAQ' : 'Add FAQ'}</h2><p>Only published entries appear on the website.</p></div>
              <button className="cm-modal__close" type="button" aria-label="Close" onClick={closeModal}>×</button>
            </div>
            <form className="cm-form faq-form" onSubmit={submit} noValidate>
              {formError && <p role="alert" className="cm-form__error">{formError}</p>}
              <label className="cm-field">
                <span>Category *</span>
                <select className="admin-select" id="faq-category" aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? 'faq-category-error' : undefined} required value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                  {FAQ_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                {fieldErrors.category && <span id="faq-category-error" role="alert" className="faq-field-error">{fieldErrors.category}</span>}
              </label>
              <label className="cm-field">
                <span>Question *</span>
                <input className="admin-input" maxLength={255} id="faq-question" aria-invalid={Boolean(fieldErrors.question)} aria-describedby={fieldErrors.question ? 'faq-question-error' : undefined} required value={form.question} onChange={(event) => updateField('question', event.target.value)} />
                {fieldErrors.question && <span id="faq-question-error" role="alert" className="faq-field-error">{fieldErrors.question}</span>}
              </label>
              <label className="cm-field">
                <span>Answer *</span>
                <textarea className="admin-textarea" rows={7} id="faq-answer" aria-invalid={Boolean(fieldErrors.answer)} aria-describedby={fieldErrors.answer ? 'faq-answer-error' : undefined} required value={form.answer} onChange={(event) => updateField('answer', event.target.value)} />
                {fieldErrors.answer && <span id="faq-answer-error" role="alert" className="faq-field-error">{fieldErrors.answer}</span>}
              </label>
              <div className="cm-form-grid">
                <label className="cm-field">
                  <span>Sort order</span>
                  <input className="admin-input" min="0" type="number" id="faq-sort_order" aria-invalid={Boolean(fieldErrors.sort_order)} aria-describedby={fieldErrors.sort_order ? 'faq-sort_order-error' : undefined} value={form.sort_order} onChange={(event) => updateField('sort_order', Number(event.target.value))} />
                  {fieldErrors.sort_order && <span id="faq-sort_order-error" role="alert" className="faq-field-error">{fieldErrors.sort_order}</span>}
                </label>
                <label className="cm-field">
                  <span>Status</span>
                  <select className="admin-select" id="faq-is_published" aria-invalid={Boolean(fieldErrors.is_published)} aria-describedby={fieldErrors.is_published ? 'faq-is_published-error' : undefined} value={form.is_published ? 'published' : 'draft'} onChange={(event) => updateField('is_published', event.target.value === 'published')}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                  {fieldErrors.is_published && <span id="faq-is_published-error" role="alert" className="faq-field-error">{fieldErrors.is_published}</span>}
                </label>
              </div>
              <div className="cm-modal__actions">
                <button className="btn btn--outline" type="button" onClick={closeModal}>Cancel</button>
                <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save FAQ'}</button>
              </div>
            </form>
          </Dialog>
        </div>
      )}
    </div>
  )
}

export default FAQManagement
