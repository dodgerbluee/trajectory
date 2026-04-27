/**
 * UpcomingVisitsCarousel – horizontally swipeable cards of upcoming visits
 * for the mobile home feed. Scopes to a single child if `filterChildId` is set.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Child, Visit } from '@shared/types/api';
import { formatDate, isFutureDate } from '@lib/date-utils';
import { getVisitTypeIcon, getVisitTypeLabel } from '@shared/lib/visit-icons';
import styles from './UpcomingVisitsCarousel.module.css';

interface UpcomingVisitsCarouselProps {
  upcomingVisits: Visit[];
  childrenList: Child[];
  filterChildId: number | null;
  loading?: boolean;
}

function UpcomingVisitsCarousel({
  upcomingVisits,
  childrenList,
  filterChildId,
  loading,
}: UpcomingVisitsCarouselProps) {
  const childById = useMemo(() => {
    const map = new Map<number, Child>();
    for (const c of childrenList) map.set(c.id, c);
    return map;
  }, [childrenList]);

  const visits = useMemo(() => {
    const filtered =
      filterChildId == null
        ? upcomingVisits
        : upcomingVisits.filter((v) => v.child_id === filterChildId);
    return [...filtered].sort(
      (a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime(),
    );
  }, [upcomingVisits, filterChildId]);

  if (loading) {
    return (
      <section className={styles.section} aria-busy="true">
        <h2 className={styles.title}>Upcoming</h2>
        <div className={styles.scroller}>
          <div className={`${styles.card} ${styles.skeleton}`} />
          <div className={`${styles.card} ${styles.skeleton}`} />
        </div>
      </section>
    );
  }

  if (visits.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Upcoming</h2>
        <div className={styles.empty}>No upcoming appointments.</div>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="mobile-upcoming-heading">
      <h2 id="mobile-upcoming-heading" className={styles.title}>
        Upcoming
      </h2>
      <div className={styles.scroller} role="list">
        {visits.map((v) => {
          const child = childById.get(v.child_id);
          const overdue = !isFutureDate(v.visit_date);
          const date = new Date(v.visit_date);
          const day = date.toLocaleDateString(undefined, { day: 'numeric' });
          const month = date.toLocaleDateString(undefined, { month: 'short' });
          return (
            <Link
              key={v.id}
              to={`/visits/${v.id}`}
              className={`${styles.card} ${overdue ? styles.overdue : ''}`}
              role="listitem"
            >
              <div className={styles.dateBlock} aria-hidden="true">
                <div className={styles.month}>{month}</div>
                <div className={styles.day}>{day}</div>
              </div>
              <div className={styles.body}>
                <div className={styles.kindRow}>
                  <span className={styles.icon}>{getVisitTypeIcon(v.visit_type)}</span>
                  <span className={styles.kindLabel}>{getVisitTypeLabel(v.visit_type)}</span>
                </div>
                {child ? <div className={styles.childName}>{child.name}</div> : null}
                <div className={styles.meta}>
                  {v.doctor_name ? <span>{v.doctor_name}</span> : null}
                  {v.location ? (
                    <span className={styles.dot} aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  {v.location ? <span>{v.location}</span> : null}
                </div>
                {overdue ? (
                  <div className={styles.overdueTag}>Past due — add outcome</div>
                ) : (
                  <div className={styles.dateLine}>{formatDate(v.visit_date)}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default UpcomingVisitsCarousel;
