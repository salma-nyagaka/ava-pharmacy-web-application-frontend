import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LabCategory, LabTest, loadLabTests, saveLabTests } from '../../data/labs'
import { logAdminAction } from '../../data/adminAudit'
import './AdminShared.css'
import './LabTestManagement.css'

const PAGE_SIZE = 8

const categoryOptions: LabCategory[] = ['Blood', 'Cardiac', 'Infectious', 'Wellness', 'Metabolic']

type TestDraft = {
  name: string
  category: LabCategory
  price: string
  turnaround: string
  sampleType: string
  description: string
}

const createDraft = (test?: LabTest): TestDraft => ({
  name: test?.name ?? '',
  category: test?.category ?? 'Blood',
  price: test ? String(test.price) : '',
  turnaround: test?.turnaround ?? '',
  sampleType: test?.sampleType ?? '',
  description: test?.description ?? '',
})

const nextLabTestId = (tests: LabTest[]) => {
  const maxId = tests.reduce((max, test) => {
    const value = Number.parseInt(test.id.replace('LAB-T-', ''), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `LAB-T-${String(maxId + 1).padStart(3, '0')}`
}

function LabTestManagement() {
  const navigate = useNavigate()
  const [tests, setTests] = useState<LabTest[]>(() => loadLabTests())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | LabCategory>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TestDraft>(() => createDraft())
  const [formError, setFormError] = useState('')

  useEffect(() => {
    saveLabTests(tests)
  }, [tests])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  const filteredTests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return tests.filter((test) => {
      const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory
      if (!query) return matchesCategory
      const matchesQuery = [test.id, test.name, test.description, test.sampleType]
        .some((value) => value.toLowerCase().includes(query))
      return matchesCategory && matchesQuery
    })
  }, [tests, searchTerm, selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * PAGE_SIZE
  const pagedTests = filteredTests.slice(startIndex, startIndex + PAGE_SIZE)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

  const openCreate = () => {
    setEditingId(null)
    setDraft(createDraft())
    setFormError('')
    setIsModalOpen(true)
  }

  const openEdit = (test: LabTest) => {
    setEditingId(test.id)
    setDraft(createDraft(test))
    setFormError('')
    setIsModalOpen(true)
  }

  const handleSave = () => {
    const name = draft.name.trim()
    const turnaround = draft.turnaround.trim()
    const sampleType = draft.sampleType.trim()
    const description = draft.description.trim()
    const price = Number.parseFloat(draft.price)

    if (!name || !turnaround || !sampleType || !description || !Number.isFinite(price) || price <= 0) {
      setFormError('Name, price, turnaround, sample type, and description are required.')
      return
    }

    const payload: LabTest = {
      id: editingId ?? nextLabTestId(tests),
      name,
      category: draft.category,
      price,
      turnaround,
      sampleType,
      description,
    }

    if (editingId) {
      setTests((prev) => prev.map((test) => (test.id === editingId ? payload : test)))
      logAdminAction({
        action: 'Edit lab test',
        entity: 'Lab Test',
        entityId: editingId,
        detail: `${payload.name} (${payload.category})`,
      })
    } else {
      setTests((prev) => [payload, ...prev])
      logAdminAction({
        action: 'Create lab test',
        entity: 'Lab Test',
        entityId: payload.id,
        detail: `${payload.name} (${payload.category})`,
      })
    }

    setIsModalOpen(false)
  }

  const handleDelete = (test: LabTest) => {
    setTests((prev) => prev.filter((item) => item.id !== test.id))
    logAdminAction({
      action: 'Delete lab test',
      entity: 'Lab Test',
      entityId: test.id,
      detail: test.name,
    })
  }

  return (
    <div className="admin-page lab-test-management">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Lab Test Management</h1>
          <p className="lab-test-management__subtitle">
            Admin controls which tests appear in laboratory and patient booking pages.
          </p>
        </div>
        <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
          Add lab test
        </button>
      </div>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search by test ID, name, sample type..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value as 'all' | LabCategory)}
        >
          <option value="all">All categories</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Test ID</th>
              <th>Test</th>
              <th>Category</th>
              <th>Sample</th>
              <th>Turnaround</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedTests.map((test) => (
              <tr key={test.id}>
                <td>{test.id}</td>
                <td>
                  <div className="lab-test-name">{test.name}</div>
                  <div className="lab-test-description">{test.description}</div>
                </td>
                <td>{test.category}</td>
                <td>{test.sampleType}</td>
                <td>{test.turnaround}</td>
                <td>KSh {test.price.toLocaleString()}</td>
                <td>
                  <div className="lab-test-actions">
                    <button className="btn-sm btn--outline" type="button" onClick={() => openEdit(test)}>
                      Edit
                    </button>
                    <button className="btn-sm btn--danger" type="button" onClick={() => handleDelete(test)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pagedTests.length === 0 && (
              <tr>
                <td colSpan={7} className="lab-tests-empty">
                  No lab tests match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredTests.length > 0 && (
        <div className="lab-tests-pagination">
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1
              return (
                <button
                  key={pageNumber}
                  className={`pagination__page ${pageNumber === page ? 'pagination__page--active' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              )
            })}
          </div>
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="lab-test-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="lab-test-modal" onClick={(event) => event.stopPropagation()}>
            <div className="lab-test-modal__header">
              <h2>{editingId ? 'Edit lab test' : 'Add lab test'}</h2>
              <button className="lab-test-modal__close" type="button" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="lab-test-modal__content">
              <div className="lab-test-form-row">
                <div className="lab-test-form-group">
                  <label htmlFor="lab-test-name">Test name</label>
                  <input
                    id="lab-test-name"
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Complete Blood Count (CBC)"
                  />
                </div>
                <div className="lab-test-form-group">
                  <label htmlFor="lab-test-category">Category</label>
                  <select
                    id="lab-test-category"
                    value={draft.category}
                    onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value as LabCategory }))}
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lab-test-form-row">
                <div className="lab-test-form-group">
                  <label htmlFor="lab-test-price">Price (KSh)</label>
                  <input
                    id="lab-test-price"
                    type="number"
                    min="1"
                    step="1"
                    value={draft.price}
                    onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
                    placeholder="1500"
                  />
                </div>
                <div className="lab-test-form-group">
                  <label htmlFor="lab-test-turnaround">Turnaround</label>
                  <input
                    id="lab-test-turnaround"
                    type="text"
                    value={draft.turnaround}
                    onChange={(event) => setDraft((prev) => ({ ...prev, turnaround: event.target.value }))}
                    placeholder="24 hrs"
                  />
                </div>
              </div>

              <div className="lab-test-form-group">
                <label htmlFor="lab-test-sample">Sample type</label>
                <input
                  id="lab-test-sample"
                  type="text"
                  value={draft.sampleType}
                  onChange={(event) => setDraft((prev) => ({ ...prev, sampleType: event.target.value }))}
                  placeholder="Blood"
                />
              </div>

              <div className="lab-test-form-group">
                <label htmlFor="lab-test-description">Description</label>
                <textarea
                  id="lab-test-description"
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  placeholder="Short test summary for customers and lab staff."
                />
              </div>

              {formError && <p className="lab-test-form-error">{formError}</p>}
            </div>
            <div className="lab-test-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" type="button" onClick={handleSave}>
                Save test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabTestManagement
