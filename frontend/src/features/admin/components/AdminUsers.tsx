import { useState, useEffect } from 'react';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import { LuCrown, LuShield } from 'react-icons/lu';
import { adminUsersApi } from '@lib/api-client';
import type { AdminUser } from '@shared/types/api';
import { formatDateTime } from '@lib/date-utils';
import AdminUserDetailModal from './AdminUserDetailModal';
import pageLayout from '@shared/styles/page-layout.module.css';
import styles from './AdminUsers.module.css';

function RoleBadge({ isInstanceAdmin }: { isInstanceAdmin: boolean }) {
  return (
    <span
      className={`${styles.roleBadge} ${styles.roleBadgeTable} ${isInstanceAdmin ? styles.roleBadgeInstanceAdmin : styles.roleBadgeUser}`}
    >
      {isInstanceAdmin ? (
        <>
          <LuCrown className={styles.roleBadgeIcon} aria-hidden />
          INSTANCE ADMIN
        </>
      ) : (
        <>
          <LuShield className={styles.roleBadgeIcon} aria-hidden />
          User
        </>
      )}
    </span>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    adminUsersApi
      .getAll()
      .then((res) => setUsers(res.data))
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading users..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={pageLayout.settingsLayout}>
      <Card>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>Manage and view all system users.</p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>USERNAME</th>
                <th>ROLE</th>
                <th>CREATION DATE</th>
                <th>LAST LOGGED IN</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={styles.tableRow}
                  onClick={() => setSelectedUserId(u.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedUserId(u.id);
                    }
                  }}
                >
                  <td className={styles.tableUsername}>{u.username || '—'}</td>
                  <td>
                    <RoleBadge isInstanceAdmin={u.is_instance_admin} />
                  </td>
                  <td>{formatDateTime(u.created_at)}</td>
                  <td>{u.last_login_at ? formatDateTime(u.last_login_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedUserId !== null && (
        <AdminUserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
