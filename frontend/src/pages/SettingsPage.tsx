import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';

type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [dateFormat, setDateFormat] = useState<DateFormat>(() => {
    return (localStorage.getItem('dateFormat') as DateFormat) || 'MM/DD/YYYY';
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem('dateFormat', dateFormat);
  }, [dateFormat]);

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to="/" className="breadcrumb">← Back to Children</Link>
          <h1>Settings</h1>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="settings-layout">
        <Card title="Preferences" icon="⚙️">
          <div className="settings-section">
            <label className="settings-label">Theme</label>
            <p className="settings-description">Choose your preferred color theme</p>
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <span className="theme-option-icon">☀️</span>
                <span className="theme-option-label">Light</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <span className="theme-option-icon">🌙</span>
                <span className="theme-option-label">Dark</span>
              </button>
              <button
                className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
              >
                <span className="theme-option-icon">💻</span>
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
        </Card>

        <Card title="Data Management" icon="💾">
          <div className="settings-section">
            <label className="settings-label">Export Data</label>
            <p className="settings-description">Download all your data as a JSON file</p>
            <Button variant="secondary" onClick={handleExportData}>
              Export Data
            </Button>
          </div>
        </Card>

        <Card title="About" icon="ℹ️">
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
      </div>
    </div>
  );
}

export default SettingsPage;
