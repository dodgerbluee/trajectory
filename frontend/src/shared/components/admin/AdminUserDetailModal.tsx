import { useState, useEffect } from 'react';
import Button from '../Button';
import FormField from '../FormField';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import Notification from '../Notification';
import { LuCrown, LuShield } from 'react-icons/lu';
import { HiX } from 'react-icons/hi';
import { adminUsersApi } from '../../../lib/api-client';
import type { AdminUserDetail as AdminUserDetailType } from '../../../types/api';
import { formatDateTime } from '../../../lib/date-utils';
import modalStyles from '../Modal.module.css';
import styles from './AdminUserDetailModal.module.css';

interface AdminUserDetailModalProps {
  userId: number;
  onClose: () => void;
}

export default function AdminUserDetailModal({ userId, onClose }: AdminUserDetailModalProps) {
  const [user, setUser] = useState<AdminUserDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [pendingRole, setPendingRole] = useState<boolean | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isInstanceAdmin = pendingRole !== null ? pendingRole : (user?.is_instance_admin ?? false);
  const roleDirty = pendingRole !== null && pendingRole !== user?.is_instance_admin;

  useEffect(() => {
    adminUsersApi
      .getById(userId)
      .then((res) => {
        setUser(res.data);
        setPendingRole(null);
      })
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleChangePassword = () => {
    if (!user || !newPassword || newPassword !== confirmPassword) {
      setNotification({ message: 'Passwords do not match or are empty', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setNotification({ message: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    setSavingPassword(true);
    setNotification(null);
    adminUsersApi
      .changePassword(user.id, newPassword)
      .then(() => {
        setNotification({ message: 'Password updated', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        setPasswordExpanded(false);
      })
      .catch((e) => setNotification({ message: e.message || 'Failed to update password', type: 'error' }))
      .finally(() => setSavingPassword(false));
  };

  const handleSaveRole = () => {
    if (!user || pendingRole === null || !roleDirty) return;
    setSavingRole(true);
    setNotification(null);
    adminUsersApi
      .setInstanceAdmin(user.id, pendingRole)
      .then((res) => {
        setUser((prev) => (prev ? { ...prev, is_instance_admin: res.data.is_instance_admin } : null));
        setPendingRole(null);
        setNotification({
          message: res.data.is_instance_admin ? 'User is now an instance admin' : 'Instance admin removed',
          type: 'success',
        });
      })
      .catch((e) => setNotification({ message: e.message || 'Failed to update role', type: 'error' }))
      .finally(() => setSavingRole(false));
  };

  return (
    <div
      className={modalStyles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-detail-modal-title"
      onClick={onClose}
    >
      <div
        className={`${modalStyles.content} ${styles.modalContent}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.headerBar}>
          <h1 id="admin-user-detail-modal-title" className={styles.title}>
            User Details
          </h1>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            <HiX className={styles.closeIcon} aria-hidden />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading user..." />
        ) : error || !user ? (
          <ErrorMessage message={error || 'User not found'} />
        ) : (
          <div className={styles.card}>
            <div className={styles.profile}>
              <div className={styles.avatar}>
                {(user.username || user.email).charAt(0).toUpperCase()}
              </div>
              <h2 className={styles.username}>{user.username || user.email}</h2>
              <span
                className={`${styles.roleBadgeDetail} ${user.is_instance_admin ? styles.roleBadgeInstanceAdmin : styles.roleBadgeUser}`}
              >
                {user.is_instance_admin ? (
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
              <div className={styles.dates}>
                <div className={styles.dateRow}>
                  <span className={styles.dateLabel}>Creation Date</span>
                  <span className={styles.dateValue}>{formatDateTime(user.created_at)}</span>
                </div>
                <div className={styles.dateRow}>
                  <span className={styles.dateLabel}>Last Logged In</span>
                  <span className={styles.dateValue}>
                    {user.last_login_at ? formatDateTime(user.last_login_at) : '—'}
                  </span>
                </div>
              </div>
              <div className={styles.actionsRow}>
                <Button
                  variant="danger"
                  className={styles.changePasswordBtn}
                  onClick={() => setPasswordExpanded(!passwordExpanded)}
                >
                  Change Password
                </Button>
                <div className={styles.roleControl}>
                  <span className={styles.roleSelectIcon}>
                    {isInstanceAdmin ? <LuCrown aria-hidden /> : <LuShield aria-hidden />}
                  </span>
                  <select
                    className={styles.roleSelect}
                    value={isInstanceAdmin ? 'instance_admin' : 'user'}
                    onChange={(e) => setPendingRole(e.target.value === 'instance_admin')}
                    disabled={savingRole}
                  >
                    <option value="user">User</option>
                    <option value="instance_admin">Instance Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {passwordExpanded && (
              <div className={styles.passwordSection}>
                <FormField
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
                <FormField
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                >
                  {savingPassword ? 'Saving…' : 'Set new password'}
                </Button>
              </div>
            )}

            <div className={styles.stats}>
              <h3 className={styles.sectionTitle}>Statistics</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Kids</span>
                  <span className={styles.statValue}>{user.total_kids}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Visits</span>
                  <span className={styles.statValue}>{user.total_visits}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Illnesses</span>
                  <span className={styles.statValue}>{user.total_illnesses}</span>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <Button
                variant="primary"
                onClick={handleSaveRole}
                disabled={savingRole || !roleDirty}
              >
                {savingRole ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </div>
  );
}
