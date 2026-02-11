import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './AdminShared.css'
import './Settings.css'
import { Banner, loadBanners, normalizeBannerLink, saveBanners } from '../../data/banners'
import { clearAuditLog, loadAuditLog, logAdminAction } from '../../data/adminAudit'

function Settings() {
  const [banners, setBanners] = useState<Banner[]>(() => loadBanners())
  const [auditLog, setAuditLog] = useState(loadAuditLog())
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [bannerMessage, setBannerMessage] = useState('')
  const [bannerLink, setBannerLink] = useState('')
  const [bannerStatus, setBannerStatus] = useState<'active' | 'inactive'>('active')
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null)

  useEffect(() => {
    saveBanners(banners)
  }, [banners])

  const refreshAudit = () => setAuditLog(loadAuditLog())

  const openBannerModal = (banner?: Banner) => {
    if (banner) {
      setEditingBannerId(banner.id)
      setBannerMessage(banner.message)
      setBannerLink(banner.link ?? '')
      setBannerStatus(banner.status)
    } else {
      setEditingBannerId(null)
      setBannerMessage('')
      setBannerLink('')
      setBannerStatus('active')
    }
    setShowBannerModal(true)
  }

  const handleSaveBanner = () => {
    if (!bannerMessage.trim()) return
    const normalizedLink = normalizeBannerLink(bannerLink)

    if (editingBannerId) {
      setBanners((prev) =>
        prev.map((banner) =>
          banner.id === editingBannerId
            ? { ...banner, message: bannerMessage.trim(), link: normalizedLink, status: bannerStatus }
            : banner
        )
      )
      logAdminAction({
        action: 'Edit banner',
        entity: 'Banner',
        entityId: editingBannerId,
        detail: bannerMessage,
      })
    } else {
      const newBanner: Banner = {
        id: `banner-${Date.now()}`,
        message: bannerMessage.trim(),
        link: normalizedLink,
        status: bannerStatus,
      }
      setBanners((prev) => [newBanner, ...prev])
      logAdminAction({
        action: 'Add banner',
        entity: 'Banner',
        entityId: newBanner.id,
        detail: bannerMessage,
      })
    }
    setShowBannerModal(false)
  }

  const handleDeleteBanner = (bannerId: string) => {
    setBanners((prev) => prev.filter((banner) => banner.id !== bannerId))
    logAdminAction({
      action: 'Delete banner',
      entity: 'Banner',
      entityId: bannerId,
    })
  }

  const handleSaveSettings = () => {
    logAdminAction({
      action: 'Save system settings',
      entity: 'Settings',
    })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>System Settings</h1>
        <button className="btn btn--primary btn--sm" onClick={handleSaveSettings}>Save changes</button>
      </div>

      <div className="page-grid page-grid--2">
        <div className="form-card">
          <h2 className="card__title">Delivery & fees</h2>
          <div className="form-group">
            <label htmlFor="base-fee">Base delivery fee (KSh)</label>
            <input id="base-fee" type="number" defaultValue={250} />
          </div>
          <div className="form-group">
            <label htmlFor="free-threshold">Free delivery threshold (KSh)</label>
            <input id="free-threshold" type="number" defaultValue={3000} />
          </div>
          <div className="form-group">
            <label htmlFor="zones">Active delivery zones</label>
            <input id="zones" type="text" defaultValue="Nairobi, Kiambu, Mombasa" />
          </div>
        </div>

        <div className="form-card">
          <h2 className="card__title">Notifications</h2>
          <div className="form-group">
            <label htmlFor="whatsapp">WhatsApp support number</label>
            <input id="whatsapp" type="text" defaultValue="+254 700 000 000" />
          </div>
          <div className="settings-inline-link">
            <span>Promotions are managed in</span>
            <Link to="/admin/deals">Deals & Discounts</Link>
          </div>
          <div className="settings-inline-link">
            <span>Escalated issues are handled in</span>
            <Link to="/admin/support">Support & Escalations</Link>
          </div>
          <div className="settings-inline-link">
            <span>Run end-to-end QA in</span>
            <Link to="/admin/journey-checklist">Journey Checklist</Link>
          </div>
        </div>
      </div>

      <div className="page-grid page-grid--2">
        <div className="form-card">
          <div className="settings-card__header">
            <h2 className="card__title">Banners</h2>
            <button className="btn btn--outline btn--sm" type="button" onClick={() => openBannerModal()}>
              Add banner
            </button>
          </div>
          <div className="banner-list">
            {banners.map((banner) => (
              <div key={banner.id} className="banner-row">
                <div>
                  <strong>{banner.message}</strong>
                  {banner.link && <span className="banner-link">{banner.link}</span>}
                  <span className={`banner-status banner-status--${banner.status}`}>{banner.status}</span>
                </div>
                <div className="banner-actions">
                  <button className="btn-sm btn--outline" type="button" onClick={() => openBannerModal(banner)}>
                    Edit
                  </button>
                  <button className="btn-sm btn--danger" type="button" onClick={() => handleDeleteBanner(banner.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-card">
          <div className="settings-card__header">
            <h2 className="card__title">Audit log</h2>
            <div className="settings-card__actions">
              <button className="btn btn--outline btn--sm" type="button" onClick={refreshAudit}>
                Refresh
              </button>
              <button
                className="btn btn--danger btn--sm"
                type="button"
                onClick={() => {
                  clearAuditLog()
                  refreshAudit()
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="audit-list">
            {auditLog.length === 0 && <p className="audit-empty">No audit events yet.</p>}
            {auditLog.slice(0, 8).map((entry) => (
              <div key={entry.id} className="audit-row">
                <div>
                  <strong>{new Date(entry.timestamp).toLocaleString()}</strong>
                  <span>{entry.action}</span>
                </div>
                <span className="audit-detail">{entry.detail ?? entry.entity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showBannerModal && (
        <div className="modal-overlay" onClick={() => setShowBannerModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingBannerId ? 'Edit banner' : 'Add banner'}</h2>
              <button className="modal__close" onClick={() => setShowBannerModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Banner message</label>
                <input
                  type="text"
                  value={bannerMessage}
                  onChange={(event) => setBannerMessage(event.target.value)}
                  placeholder="Free delivery for orders above KSh 2,500"
                />
              </div>
              <div className="form-group">
                <label>Link (optional)</label>
                <input
                  type="text"
                  value={bannerLink}
                  onChange={(event) => setBannerLink(event.target.value)}
                  placeholder="/offers"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={bannerStatus} onChange={(event) => setBannerStatus(event.target.value as 'active' | 'inactive')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowBannerModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleSaveBanner}>
                Save banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
