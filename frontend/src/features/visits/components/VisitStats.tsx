import type { IconType } from 'react-icons';
import { LuActivity } from 'react-icons/lu';
import styles from './VisitStats.module.css';

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
  return (
    <div className={`${styles.grid} ${vertical ? styles.vertical : ''}`} data-visit-stats>
      {stats.map((s) => {
        const Icon = s.icon || LuActivity;
        return (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            aria-pressed={s.active}
            className={`${styles.card} ${s.active ? styles.active : ''}`}
            data-color={s.color || 'gray'}
            title={s.label}
          >
            <div className={styles.icon}>
              <Icon className={styles.iconSvg} aria-hidden />
            </div>

            <div className={styles.body}>
              {showValues && (
                <div className={styles.value}>{s.value}</div>
              )}
              <div className={styles.label}>{s.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default VisitStats;
