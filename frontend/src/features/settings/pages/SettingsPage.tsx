import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import Card from '@shared/components/Card';
import Notification from '@shared/components/Notification';
import { LuDownload, LuInfo, LuSettings, LuUser, LuUsers } from 'react-icons/lu';
import layout from '@shared/styles/SettingsLayout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import { AboutTab, DataTab, FamilyTab, GeneralTab, type NotifyFn, UserTab } from './tabs';

const NOTIFICATION_DISMISS_MS = 3000;

function SettingsPage() {
  const location = useLocation();
  const { checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'user' | 'data' | 'family' | 'about'>('general');
  const [familyInitialSubTab, setFamilyInitialSubTab] = useState<'management' | 'members'>('members');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const notificationTimerRef = useRef<number | null>(null);

  // Open Family tab + sub-tab when navigating from dropdown (e.g. Family link)
  useEffect(() => {
    const state = location.state as { tab?: string; familySubTab?: string } | null;
    if (state?.tab === 'family') {
      setActiveTab('family');
      if (state.familySubTab === 'management') setFamilyInitialSubTab('management');
      else if (state.familySubTab === 'members') setFamilyInitialSubTab('members');
    }
  }, [location.state]);

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
              <button
                className={`${layout.sidebarItem} ${activeTab === 'family' ? layout.active : ''}`}
                onClick={() => setActiveTab('family')}
                data-onboarding="settings-family-tab"
              >
                <LuUsers className={layout.sidebarIcon} />
                <span>Family</span>
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
              {activeTab === 'family' && <FamilyTab notify={notify} initialSubTab={familyInitialSubTab} />}
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
