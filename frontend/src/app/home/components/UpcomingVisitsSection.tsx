import { Link } from 'react-router-dom';
import type { Person, Visit } from '@shared/types/api';
import { formatDate, isFutureDate } from '@lib/date-utils';
import { getVisitTypeIcon, getVisitTypeLabel } from '@shared/lib/visit-icons';
import styles from './UpcomingVisitsSection.module.css';

interface UpcomingVisitsSectionProps {
  upcomingByPerson: Array<{ person: Person; visits: Visit[] }>;
}

export default function UpcomingVisitsSection({ upcomingByPerson }: UpcomingVisitsSectionProps) {
  return (
    <div className={styles.tabsContentBox}>
      <section className={styles.upcomingSection} aria-labelledby="home-upcoming-heading">
        <h2 id="home-upcoming-heading" className={styles.upcomingTitle}>Upcoming Visits</h2>
        <div className={styles.upcomingByPerson}>
          {upcomingByPerson.map(({ person, visits }) => (
            <div key={person.id} className={styles.upcomingChildRow}>
              <span className={styles.upcomingChildLabel}>{person.name}</span>
              <div className={styles.upcomingChips} role="list">
                {visits.map((v) => {
                  const isOverdue = !isFutureDate(v.visit_date);
                  return (
                    <Link
                      key={v.id}
                      to={`/visits/${v.id}`}
                      className={isOverdue ? `${styles.upcomingChip} ${styles.upcomingChipOverdue}` : styles.upcomingChip}
                      role="listitem"
                      title={isOverdue ? 'Past due – add visit outcome' : undefined}
                    >
                      <span className={styles.upcomingIcon}>{getVisitTypeIcon(v.visit_type)}</span>
                      <span className={styles.upcomingChipText}>
                        {getVisitTypeLabel(v.visit_type)} · {formatDate(v.visit_date)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
