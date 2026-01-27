interface StatItem {
  label: string;
  value: number | string | React.ReactNode;
}

interface Props {
  title?: string;
  stats: StatItem[];
  children?: React.ReactNode;
  className?: string;
}

function SummaryCardBase({ title, stats, children, className = '' }: Props) {
  return (
    <div className={`summary-card-modern summary-card-base ${className}`.trim()}>
      <div className="summary-card-content">
        {title && <div className="summary-card-title">{title}</div>}

        <div className="summary-card-stats summary-card-grid">
          {stats.map((s) => (
            <div key={String(s.label)} className="summary-card-stat">
              <div className="summary-card-stat-value">{s.value}</div>
              <div className="summary-card-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {children && <div className="summary-card-children">{children}</div>}
    </div>
  );
}

export default SummaryCardBase;
