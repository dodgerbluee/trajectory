import React from 'react';

interface SettingEntryProps {
  label: string;
  description?: string;
  helpText?: string;
  className?: string;
  children: React.ReactNode;
}

export default function SettingEntry({ label, description, helpText, className = '', children }: SettingEntryProps) {
  return (
    <div className={`setting-entry ${className}`.trim()}>
      <div className="setting-entry-left">
        <label className="settings-label">{label}</label>
        {description && <p className="settings-description">{description}</p>}
        {helpText && <div className="form-hint">{helpText}</div>}
      </div>

      <div className="setting-entry-right">
        {children}
      </div>
    </div>
  );
}
