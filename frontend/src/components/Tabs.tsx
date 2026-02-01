/**
 * Modern Tabs Component
 */

import { ReactNode } from 'react';

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
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            {...(getTabButtonProps?.(tab.id) ?? {})}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

export default Tabs;
