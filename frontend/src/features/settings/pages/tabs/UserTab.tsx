import { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { FaLock } from 'react-icons/fa';
import { LuUser } from 'react-icons/lu';
import Card from '@shared/components/Card';
import FormField, { FormFieldHint } from '@shared/components/FormField';
import Button from '@shared/components/Button';
import { ApiClientError } from '@lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@lib/date-utils';
import s from '../SettingsPage.module.css';
import type { NotifyFn } from './types';

export default function UserTab({ notify }: { notify: NotifyFn }) {
  const { user, updateUsername, updatePassword } = useAuth();

  const [usernameExpanded, setUsernameExpanded] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    usernamePassword: false,
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState({ username: false, password: false });

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!newUsername.trim()) {
      setErrors({ username: 'New username is required' });
      return;
    }

    if (newUsername.trim().length < 2) {
      setErrors({ username: 'Username must be at least 2 characters' });
      return;
    }

    if (!usernamePassword) {
      setErrors({ usernamePassword: 'Current password is required' });
      return;
    }

    setLoading((l) => ({ ...l, username: true }));

    try {
      await updateUsername(newUsername.trim(), usernamePassword);
      notify({ message: 'Username updated successfully', type: 'success' });
      setNewUsername('');
      setUsernamePassword('');
      setUsernameExpanded(false);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrors({ usernamePassword: 'Current password is incorrect' });
        } else if (err.statusCode === 409) {
          setErrors({ username: 'Username is already taken' });
        } else {
          notify({ message: err.message || 'Failed to update username', type: 'error' });
        }
      } else {
        notify({ message: 'An unexpected error occurred', type: 'error' });
      }
    } finally {
      setLoading((l) => ({ ...l, username: false }));
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!currentPassword) {
      setErrors({ currentPassword: 'Current password is required' });
      return;
    }

    if (!newPassword) {
      setErrors({ newPassword: 'New password is required' });
      return;
    }

    if (newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters' });
      return;
    }

    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      setErrors({
        newPassword:
          'Password must contain uppercase, lowercase, number, and special character',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading((l) => ({ ...l, password: true }));

    try {
      await updatePassword(currentPassword, newPassword);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrors({ currentPassword: 'Current password is incorrect' });
        } else if (err.statusCode === 400) {
          setErrors({ newPassword: err.message || 'Invalid password' });
        } else {
          notify({ message: err.message || 'Failed to update password', type: 'error' });
        }
      } else {
        notify({ message: 'An unexpected error occurred', type: 'error' });
      }
      setLoading((l) => ({ ...l, password: false }));
    }
  };

  return (
    <div className={s.layout}>
      <Card title="User Settings">
        <div className={s.userInfoCard}>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Username:</span>
            <span className={s.userInfoValue}>{user?.username || 'N/A'}</span>
          </div>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Email:</span>
            <span className={s.userInfoValue}>{user?.email || 'N/A'}</span>
          </div>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Account Created:</span>
            <span className={s.userInfoValue}>
              {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
            </span>
          </div>
          <div className={s.userInfoRow}>
            <span className={s.userInfoLabel}>Role:</span>
            <span className={s.userInfoValue}>
              {user?.isInstanceAdmin ? 'Instance admin' : 'User'}
            </span>
          </div>
        </div>

        <div className={s.expandable}>
          <button
            className={s.expandableHeader}
            onClick={() => {
              setUsernameExpanded(!usernameExpanded);
              setPasswordExpanded(false);
            }}
            aria-expanded={usernameExpanded}
          >
            <div className={s.expandableTitle}>
              <LuUser className={s.expandableIcon} />
              <span>Change Username</span>
            </div>
            {usernameExpanded ? (
              <HiChevronUp className={s.expandableChevron} />
            ) : (
              <HiChevronDown className={s.expandableChevron} />
            )}
          </button>
          {usernameExpanded && (
            <div className={s.expandableContent}>
              <form onSubmit={handleUpdateUsername}>
                <FormField
                  label="New Username"
                  type="text"
                  value={newUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUsername(e.target.value)
                  }
                  error={errors.username}
                  required
                  disabled={loading.username}
                  hint={!errors.username ? 'Must be at least 2 characters long' : undefined}
                />

                <div className={s.passwordField}>
                  <label htmlFor="username-password" className={s.passwordLabel}>
                    Current Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="username-password"
                      type={showPasswords.usernamePassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.usernamePassword ? 'error' : ''}`}
                      value={usernamePassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUsernamePassword(e.target.value)
                      }
                      required
                      autoComplete="current-password"
                      disabled={loading.username}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() =>
                        setShowPasswords((p) => ({
                          ...p,
                          usernamePassword: !p.usernamePassword,
                        }))
                      }
                      aria-label={showPasswords.usernamePassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.usernamePassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.usernamePassword && (
                    <span className={s.passwordError}>{errors.usernamePassword}</span>
                  )}
                  {!errors.usernamePassword && (
                    <FormFieldHint>Enter your current password to confirm</FormFieldHint>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading.username}
                  className={s.updateButton}
                >
                  {loading.username ? 'Updating...' : 'Update Username'}
                </Button>
              </form>
            </div>
          )}
        </div>

        <div className={s.expandable}>
          <button
            className={s.expandableHeader}
            onClick={() => {
              setPasswordExpanded(!passwordExpanded);
              setUsernameExpanded(false);
            }}
            aria-expanded={passwordExpanded}
          >
            <div className={s.expandableTitle}>
              <FaLock className={s.expandableIcon} />
              <span>Change Password</span>
            </div>
            {passwordExpanded ? (
              <HiChevronUp className={s.expandableChevron} />
            ) : (
              <HiChevronDown className={s.expandableChevron} />
            )}
          </button>
          {passwordExpanded && (
            <div className={s.expandableContent}>
              <form onSubmit={handleUpdatePassword}>
                <div className={s.passwordField}>
                  <label htmlFor="current-password" className={s.passwordLabel}>
                    Current Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="current-password"
                      type={showPasswords.currentPassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.currentPassword ? 'error' : ''}`}
                      value={currentPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCurrentPassword(e.target.value)
                      }
                      required
                      autoComplete="current-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() =>
                        setShowPasswords((p) => ({
                          ...p,
                          currentPassword: !p.currentPassword,
                        }))
                      }
                      aria-label={showPasswords.currentPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.currentPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <span className={s.passwordError}>{errors.currentPassword}</span>
                  )}
                </div>

                <div className={s.passwordField}>
                  <label htmlFor="new-password" className={s.passwordLabel}>
                    New Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="new-password"
                      type={showPasswords.newPassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.newPassword ? 'error' : ''}`}
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewPassword(e.target.value)
                      }
                      required
                      autoComplete="new-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, newPassword: !p.newPassword }))
                      }
                      aria-label={showPasswords.newPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.newPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <span className={s.passwordError}>{errors.newPassword}</span>
                  )}
                  {!errors.newPassword && (
                    <FormFieldHint>
                      Must be at least 8 characters with uppercase, lowercase, number, and special character
                    </FormFieldHint>
                  )}
                </div>

                <div className={s.passwordField}>
                  <label htmlFor="confirm-password" className={s.passwordLabel}>
                    Confirm New Password
                    <span className={s.requiredIndicator}>*</span>
                  </label>
                  <div className={s.passwordInputWrapper}>
                    <input
                      id="confirm-password"
                      type={showPasswords.confirmPassword ? 'text' : 'password'}
                      className={`${s.passwordInput} ${errors.confirmPassword ? 'error' : ''}`}
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfirmPassword(e.target.value)
                      }
                      required
                      autoComplete="new-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className={s.passwordToggle}
                      onClick={() =>
                        setShowPasswords((p) => ({
                          ...p,
                          confirmPassword: !p.confirmPassword,
                        }))
                      }
                      aria-label={showPasswords.confirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.confirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className={s.passwordError}>{errors.confirmPassword}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading.password}
                  className={s.updateButton}
                >
                  {loading.password ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
