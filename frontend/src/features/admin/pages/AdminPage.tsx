import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Card from '@shared/components/Card';
import { LuSettings, LuUsers, LuScrollText } from 'react-icons/lu';
import AdminGeneral from '../components/AdminGeneral';
import AdminUsers from '../components/AdminUsers';
import AdminLogs from '../components/AdminLogs';
import layout from '@shared/styles/SettingsLayout.module.css';

function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isGeneral = path === '/admin' || path === '/admin/general';
  const isUsers = path.startsWith('/admin/users');
  const isLogs = path === '/admin/logs';

  return (
    <div className={layout.pageGrid}>
      <Card className={layout.card}>
        <div className={layout.cardGrid}>
          <div className={layout.cardHeader}>
            <h1 className={layout.title}>Admin</h1>
          </div>
          <aside className={layout.sidebar}>
            <button
              type="button"
              className={`${layout.sidebarItem} ${isGeneral ? layout.active : ''}`}
              onClick={() => navigate('/admin/general')}
            >
              <LuSettings className={layout.sidebarIcon} />
              <span>General</span>
            </button>
            <button
              type="button"
              className={`${layout.sidebarItem} ${isUsers ? layout.active : ''}`}
              onClick={() => navigate('/admin/users')}
            >
              <LuUsers className={layout.sidebarIcon} />
              <span>Users</span>
            </button>
            <button
              type="button"
              className={`${layout.sidebarItem} ${isLogs ? layout.active : ''}`}
              onClick={() => navigate('/admin/logs')}
            >
              <LuScrollText className={layout.sidebarIcon} />
              <span>Logs</span>
            </button>
          </aside>
          <main className={layout.main}>
            <Routes>
              <Route index element={<Navigate to="general" replace />} />
              <Route path="general" element={<AdminGeneral />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="logs" element={<AdminLogs />} />
            </Routes>
          </main>
        </div>
      </Card>
    </div>
  );
}

export default AdminPage;
