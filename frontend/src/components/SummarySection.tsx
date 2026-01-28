import React from 'react';

interface Stat {
  label: string;
  value: React.ReactNode;
}

interface SummarySectionProps {
  stats: Stat[];
  children?: React.ReactNode; // optional place for filters or actions
  className?: string;
}

function SummarySection({ stats, children, className = '' }: SummarySectionProps) {
  return (
    <div className={`summary-section ${className}`.trim()}>
      <div className="summary-items">
        {stats.map((s, i) => (
          <div key={i} className="summary-item">
            <div className="summary-label">{s.label}</div>
            <div className="summary-value">{s.value}</div>
          </div>
        ))}
      </div>
      {children && <div className="summary-children">{children}</div>}
    </div>
  );
}

export default SummarySection;
