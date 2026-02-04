import { useState, useEffect } from 'react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { LuInfo, LuBug } from 'react-icons/lu';
import { adminApi } from '@lib/api-client';
import type { AdminConfig, AdminLogLevel } from '@shared/types/api';
import styles from './AdminGeneral.module.css';

export default function AdminGeneral() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logLevel, setLogLevel] = useState<AdminLogLevel>('info');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    adminApi
      .getConfig()
      .then((res) => {
        setConfig(res.data);
        setLogLevel(res.data.log_level);
      })
      .catch(() => setNotification({ message: 'Failed to load config', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    setNotification(null);
    adminApi
      .updateConfig({ log_level: logLevel })
      .then((res) => {
        setConfig(res.data);
        setNotification({ message: 'Log level updated', type: 'success' });
      })
      .catch(() => setNotification({ message: 'Failed to update config', type: 'error' }))
      .finally(() => setSaving(false));
  };

  if (loading) return <LoadingSpinner message="Loading config..." />;

  return (
    <div className={styles.layout}>
      <Card title="Runtime config">
        <div className={styles.section}>
          <label className={styles.label}>Log level</label>
          <p className={styles.description}>
            Change the server log level at runtime. Debug logs more detail; info is the default.
          </p>
          <div className={styles.selector}>
            <button
              type="button"
              className={`${styles.option} ${logLevel === 'info' ? styles.active : ''}`}
              onClick={() => setLogLevel('info')}
              disabled={saving}
            >
              <LuInfo className={styles.optionIcon} />
              <span className={styles.optionLabel}>Info</span>
            </button>
            <button
              type="button"
              className={`${styles.option} ${logLevel === 'debug' ? styles.active : ''}`}
              onClick={() => setLogLevel('debug')}
              disabled={saving}
            >
              <LuBug className={styles.optionIcon} />
              <span className={styles.optionLabel}>Debug</span>
            </button>
          </div>
        </div>
        <div className={styles.saveRow}>
          <Button
            onClick={handleSave}
            disabled={saving || (config?.log_level === logLevel)}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </Card>
    </div>
  );
}
