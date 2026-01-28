import VisitStats from './VisitStats';

interface Stat {
  label: string;
  value: number;
  icon?: any;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}

interface Props {
  stats: Stat[];
  children?: React.ReactNode;
  className?: string;
}

function VisitsSummary({ stats, children, className = '' }: Props) {
  return (
    <div className={`summary-card-modern visits-summary ${className}`.trim()}>
      <div className="summary-card-content">
        <VisitStats stats={stats} />

        {children && <div className="summary-card-children">{children}</div>}
      </div>
    </div>
  );
}

export default VisitsSummary;
