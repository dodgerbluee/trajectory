import styles from './SummaryCardBase.module.css';

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
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}

        <div className={`${styles.stats} ${styles.grid}`}>
          {stats.map((s) => (
            <div key={String(s.label)} className={styles.stat}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {children && <div className={styles.children} data-summary-children>{children}</div>}
    </div>
  );
}

export default SummaryCardBase;
