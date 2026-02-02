/**
 * Modern Tabs Component
 */

import { ReactNode } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Optional props (e.g. data-onboarding-tab) to add to each tab button */
  getTabButtonProps?: (tabId: string) => Record<string, string | number | boolean | undefined>;
}

function Tabs({ tabs, activeTab, onTabChange, getTabButtonProps }: TabsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? `${styles.tabButton} ${styles.tabButtonActive}` : styles.tabButton}
            onClick={() => onTabChange(tab.id)}
            {...(getTabButtonProps?.(tab.id) ?? {})}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

export default Tabs;
