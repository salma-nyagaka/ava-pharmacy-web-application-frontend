import { useSearchParams } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import Reports from './Reports'
import '../../styles/admin/AdminWorkspace.css'
export default function AdminOverview() {
  const [params, setParams] = useSearchParams()
  const reports = params.get('view') === 'reports'
  return <div className="admin-overview"><nav className="admin-overview__tabs" aria-label="Dashboard views"><button aria-pressed={!reports} onClick={() => setParams({})}>Overview</button><button aria-pressed={reports} onClick={() => setParams({ view: 'reports' })}>Reports & analytics</button></nav>{reports ? <Reports /> : <AdminDashboard />}</div>
}
