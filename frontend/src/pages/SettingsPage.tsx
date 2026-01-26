import { useState, useEffect } from 'react';
// breadcrumb removed; no Link needed
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { FaLock } from 'react-icons/fa';
import { LuSun, LuMoon, LuLaptop, LuSave, LuDownload, LuSettings, LuUser } from 'react-icons/lu';
import { ApiClientError } from '../lib/api-client';
import { formatDate } from '../lib/date-utils';

type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, updateUsername, updatePassword, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'user' | 'data'>('general');
  const [dateFormat, setDateFormat] = useState<DateFormat>(() => {
    return (localStorage.getItem('dateFormat') as DateFormat) || 'MM/DD/YYYY';
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // User management state
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
  const [loading, setLoading] = useState({
    username: false,
    password: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('dateFormat', dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    // Refresh user data when component mounts
    checkAuth();
  }, [checkAuth]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setNotification({ message: 'Theme preference saved', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDateFormatChange = (newFormat: DateFormat) => {
    setDateFormat(newFormat);
    setNotification({ message: 'Date format preference saved', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExportData = () => {
    // Placeholder for future export functionality
    setNotification({ message: 'Export functionality coming soon', type: 'error' });
    setTimeout(() => setNotification(null), 3000);
  };

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

    setLoading({ ...loading, username: true });

    try {
      await updateUsername(newUsername.trim(), usernamePassword);
      setNotification({ message: 'Username updated successfully', type: 'success' });
      setNewUsername('');
      setUsernamePassword('');
      setUsernameExpanded(false);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrors({ usernamePassword: 'Current password is incorrect' });
        } else if (err.statusCode === 409) {
          setErrors({ username: 'Username is already taken' });
        } else {
          setNotification({ message: err.message || 'Failed to update username', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        setNotification({ message: 'An unexpected error occurred', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
      }
    } finally {
      setLoading({ ...loading, username: false });
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

    // Check password strength
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      setErrors({ newPassword: 'Password must contain uppercase, lowercase, number, and special character' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading({ ...loading, password: true });

    try {
      await updatePassword(currentPassword, newPassword);
      // updatePassword will redirect to login, so we don't need to handle success here
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrors({ currentPassword: 'Current password is incorrect' });
        } else if (err.statusCode === 400) {
          setErrors({ newPassword: err.message || 'Invalid password' });
        } else {
          setNotification({ message: err.message || 'Failed to update password', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        setNotification({ message: 'An unexpected error occurred', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
      }
      setLoading({ ...loading, password: false });
    }
  };

  const formatAccountDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      switch (dateFormat) {
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        default:
          return formatDate(dateString);
      }
    } catch {
      return dateString;
    }
  };

  const generalContent = (
    <div className="settings-layout">
      <Card title="Preferences">
        <div className="settings-section">
          <label className="settings-label">Theme</label>
          <p className="settings-description">Choose your preferred color theme</p>
          <div className="theme-selector">
            <button
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <LuSun className="theme-option-icon" />
              <span className="theme-option-label">Light</span>
            </button>
            <button
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <LuMoon className="theme-option-icon" />
              <span className="theme-option-label">Dark</span>
            </button>
            <button
              className={`theme-option ${theme === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeChange('system')}
            >
              <LuLaptop className="theme-option-icon" />
              <span className="theme-option-label">System</span>
            </button>
          </div>
        </div>

        <div className="settings-section">
          <FormField
            label="Date Format"
            type="select"
            value={dateFormat}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDateFormatChange(e.target.value as DateFormat)}
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
            ]}
          />
        </div>

        <Card title="About">
          <div className="settings-section">
            <div className="about-item">
              <span className="about-label">Version:</span>
              <span className="about-value">1.0.0</span>
            </div>
            <div className="about-item">
              <span className="about-label">License:</span>
              <span className="about-value">Private</span>
            </div>
          </div>
        </Card>

        <div className="settings-save-row">
          <Button variant="primary" onClick={() => { setNotification({ message: 'Settings saved', type: 'success' }); setTimeout(() => setNotification(null), 3000); }}>
            <LuSave style={{ marginRight: 8 }} /> Save
          </Button>
        </div>
      </Card>
    </div>
  );

  const dataContent = (
    <div className="settings-layout">
      <Card title="Data Management">
        <div className="settings-section">
          <label className="settings-label">Export Data</label>
          <p className="settings-description">Download all your data as a JSON file</p>
          <Button variant="secondary" onClick={handleExportData}>
            <LuDownload style={{ marginRight: 8 }} /> Export Data
          </Button>
        </div>
      </Card>
    </div>
  );

  const userContent = (
    <div className="settings-layout">
      <Card title="User Settings">
        {/* User Information Display */}
        <div className="user-info-card">
          <div className="user-info-row">
            <span className="user-info-label">Username:</span>
            <span className="user-info-value">{user?.name || 'N/A'}</span>
          </div>
          <div className="user-info-row">
            <span className="user-info-label">Email:</span>
            <span className="user-info-value">{user?.email || 'N/A'}</span>
          </div>
          <div className="user-info-row">
            <span className="user-info-label">Account Created:</span>
            <span className="user-info-value">{formatAccountDate(user?.createdAt)}</span>
          </div>
        </div>

        {/* Change Username Section */}
        <div className="settings-expandable">
          <button
            className="settings-expandable-header"
            onClick={() => {
              setUsernameExpanded(!usernameExpanded);
              setPasswordExpanded(false);
            }}
            aria-expanded={usernameExpanded}
          >
            <div className="settings-expandable-title">
              <LuUser className="settings-expandable-icon" />
              <span>Change Username</span>
            </div>
            {usernameExpanded ? (
              <HiChevronUp className="settings-expandable-chevron" />
            ) : (
              <HiChevronDown className="settings-expandable-chevron" />
            )}
          </button>
          {usernameExpanded && (
            <div className="settings-expandable-content">
              <form onSubmit={handleUpdateUsername}>
                <FormField
                  label="New Username"
                  type="text"
                  value={newUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUsername(e.target.value)}
                  error={errors.username}
                  required
                  disabled={loading.username}
                />
                {!errors.username && (
                  <div className="form-hint">Must be at least 2 characters long</div>
                )}

                <div className="form-field">
                  <label htmlFor="username-password" className="form-label">
                    Current Password
                    <span className="required-indicator">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="username-password"
                      type={showPasswords.usernamePassword ? 'text' : 'password'}
                      className={`form-input ${errors.usernamePassword ? 'error' : ''}`}
                      value={usernamePassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsernamePassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading.username}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords({ ...showPasswords, usernamePassword: !showPasswords.usernamePassword })}
                      aria-label={showPasswords.usernamePassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.usernamePassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.usernamePassword && (
                    <span className="form-error">{errors.usernamePassword}</span>
                  )}
                  {!errors.usernamePassword && (
                    <div className="form-hint">Enter your current password to confirm</div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading.username}
                  className="settings-update-button"
                >
                  {loading.username ? 'Updating...' : 'Update Username'}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Change Password Section */}
        <div className="settings-expandable">
          <button
            className="settings-expandable-header"
            onClick={() => {
              setPasswordExpanded(!passwordExpanded);
              setUsernameExpanded(false);
            }}
            aria-expanded={passwordExpanded}
          >
            <div className="settings-expandable-title">
              <FaLock className="settings-expandable-icon" />
              <span>Change Password</span>
            </div>
            {passwordExpanded ? (
              <HiChevronUp className="settings-expandable-chevron" />
            ) : (
              <HiChevronDown className="settings-expandable-chevron" />
            )}
          </button>
          {passwordExpanded && (
            <div className="settings-expandable-content">
              <form onSubmit={handleUpdatePassword}>
                <div className="form-field">
                  <label htmlFor="current-password" className="form-label">
                    Current Password
                    <span className="required-indicator">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="current-password"
                      type={showPasswords.currentPassword ? 'text' : 'password'}
                      className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                      value={currentPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords({ ...showPasswords, currentPassword: !showPasswords.currentPassword })}
                      aria-label={showPasswords.currentPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.currentPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <span className="form-error">{errors.currentPassword}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="new-password" className="form-label">
                    New Password
                    <span className="required-indicator">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      type={showPasswords.newPassword ? 'text' : 'password'}
                      className={`form-input ${errors.newPassword ? 'error' : ''}`}
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords({ ...showPasswords, newPassword: !showPasswords.newPassword })}
                      aria-label={showPasswords.newPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.newPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <span className="form-error">{errors.newPassword}</span>
                  )}
                  {!errors.newPassword && (
                    <div className="form-hint">Must be at least 8 characters with uppercase, lowercase, number, and special character</div>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="confirm-password" className="form-label">
                    Confirm New Password
                    <span className="required-indicator">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirm-password"
                      type={showPasswords.confirmPassword ? 'text' : 'password'}
                      className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={loading.password}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                      aria-label={showPasswords.confirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPasswords.confirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="form-error">{errors.confirmPassword}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading.password}
                  className="settings-update-button"
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

  return (
    <div className="page-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="settings-page-grid">
        <Card className="settings-card">
          <div className="settings-card-grid">
            <div className="settings-card-header">
              <h1 className="settings-title">Settings</h1>
            </div>
            <aside className="settings-sidebar">
              <button className={`sidebar-item ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
                <LuSettings className="sidebar-icon" />
                <span>General</span>
              </button>
              <button className={`sidebar-item ${activeTab === 'user' ? 'active' : ''}`} onClick={() => setActiveTab('user')}>
                <LuUser className="sidebar-icon" />
                <span>User</span>
              </button>
              <button className={`sidebar-item ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>
                <LuDownload className="sidebar-icon" />
                <span>Data</span>
              </button>
            </aside>

                <main className="settings-main">
                  {activeTab === 'general' ? generalContent : activeTab === 'user' ? userContent : dataContent}
                </main>
          </div>

          {/* footer removed - Save moved into General preferences */}
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
