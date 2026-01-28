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
  vertical?: boolean;
  showValues?: boolean;
}

function VisitStats({ stats, vertical = false, showValues = true }: Props) {
  const style: React.CSSProperties = vertical
    ? { display: 'grid', gridTemplateColumns: '1fr', gridAutoFlow: 'row', gridAutoRows: 'min-content', gap: 12 }
    : { display: 'grid', gridAutoFlow: 'row', gridAutoRows: 'min-content', gap: 12 };

  return (
    <div className={`visit-stats-grid ${vertical ? 'visit-stats-vertical' : ''}`} style={style}>
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
              {showValues && (
                <div className="visit-stat-value">{s.value}</div>
              )}
              <div className="visit-stat-label">{s.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default VisitStats;
