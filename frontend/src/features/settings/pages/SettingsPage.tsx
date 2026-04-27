import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Card from '@shared/components/Card';
import Notification from '@shared/components/Notification';
import { LuDownload, LuInfo, LuSettings, LuUser } from 'react-icons/lu';
import layout from '@shared/styles/SettingsLayout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import { AboutTab, DataTab, GeneralTab, type NotifyFn, UserTab } from './tabs';

const NOTIFICATION_DISMISS_MS = 3000;

function SettingsPage() {
  const { checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'user' | 'data' | 'about'>('general');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const notificationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Refresh user data when component mounts
    checkAuth();
  }, [checkAuth]);

  const notify: NotifyFn = useMemo(() => {
    return (n, timeoutMs = NOTIFICATION_DISMISS_MS) => {
      setNotification(n);
      if (notificationTimerRef.current != null) {
        window.clearTimeout(notificationTimerRef.current);
      }
      notificationTimerRef.current = window.setTimeout(() => setNotification(null), timeoutMs);
    };
  }, []);

  return (
    <div className={pageLayout.pageContainer}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className={layout.pageGrid}>
        <Card className={layout.card}>
          <div className={layout.cardGrid}>
            <div className={layout.cardHeader}>
              <h1 className={layout.title}>Settings</h1>
            </div>
            <aside className={layout.sidebar}>
              <button className={`${layout.sidebarItem} ${activeTab === 'general' ? layout.active : ''}`} onClick={() => setActiveTab('general')}>
                <LuSettings className={layout.sidebarIcon} />
                <span>General</span>
              </button>
              <button className={`${layout.sidebarItem} ${activeTab === 'user' ? layout.active : ''}`} onClick={() => setActiveTab('user')}>
                <LuUser className={layout.sidebarIcon} />
                <span>User</span>
              </button>
              <button className={`${layout.sidebarItem} ${activeTab === 'data' ? layout.active : ''}`} onClick={() => setActiveTab('data')}>
                <LuDownload className={layout.sidebarIcon} />
                <span>Data</span>
              </button>
              <button className={`${layout.sidebarItem} ${activeTab === 'about' ? layout.active : ''}`} onClick={() => setActiveTab('about')}>
                <LuInfo className={layout.sidebarIcon} />
                <span>About</span>
              </button>
            </aside>

            <main className={layout.main}>
              {activeTab === 'general' && <GeneralTab notify={notify} />}
              {activeTab === 'user' && <UserTab notify={notify} />}
              {activeTab === 'data' && <DataTab notify={notify} />}
              {activeTab === 'about' && <AboutTab />}
            </main>
          </div>

          {/* footer removed - Save moved into General preferences */}
        </Card>

      </div>
    </div>
  );
}

export default SettingsPage;
