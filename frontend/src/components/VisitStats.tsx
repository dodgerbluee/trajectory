import type { IconType } from 'react-icons';
import { LuActivity } from 'react-icons/lu';

interface StatItem {
  label: string;
  value: number;
  icon?: IconType;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}

interface Props {
  stats: StatItem[];
}

function VisitStats({ stats }: Props) {
  return (
    <div className="visit-stats-grid">
      {stats.map((s) => {
        const Icon = s.icon || LuActivity;
        return (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            aria-pressed={s.active}
            className={`visit-stat-card ${s.active ? 'active' : ''}`}
            data-color={s.color || 'gray'}
            title={s.label}
          >
            <div className="visit-stat-icon">
              <Icon className="visit-stat-icon-svg" />
            </div>

            <div className="visit-stat-body">
              <div className="visit-stat-value">{s.value}</div>
              <div className="visit-stat-label">{s.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default VisitStats;
