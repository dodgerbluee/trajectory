/**
 * UpcomingVisitsCarousel – full-width vertical list of upcoming visits for the
 * mobile home feed. (Name kept for import stability; layout is no longer a
 * carousel.) Scopes to a single child if `filterChildId` is set.
 *
 * Each row spans the full available width and renders on a single visual line:
 *   [date block]  Child Name · Type        Past due / date  ›
 *
 * Putting the visit type to the right of the child name keeps each row to a
 * single line and reclaims the vertical space the previous swipe cards used.
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
        <ul className={styles.list}>
          <li className={`${styles.row} ${styles.skeleton}`} />
          <li className={`${styles.row} ${styles.skeleton}`} />
        </ul>
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
      <ul className={styles.list} role="list">
        {visits.map((v) => {
          const child = childById.get(v.child_id);
          const overdue = !isFutureDate(v.visit_date);
          const date = new Date(v.visit_date);
          const day = date.toLocaleDateString(undefined, { day: 'numeric' });
          const month = date.toLocaleDateString(undefined, { month: 'short' });
          return (
            <li key={v.id}>
              <Link
                to={`/visits/${v.id}`}
                className={`${styles.row} ${overdue ? styles.overdue : ''}`}
              >
                <div className={styles.dateBlock} aria-hidden="true">
                  <div className={styles.month}>{month}</div>
                  <div className={styles.day}>{day}</div>
                </div>
                <div className={styles.body}>
                  <div className={styles.titleRow}>
                    <span className={styles.childName}>
                      {child?.name ?? 'Child'}
                    </span>
                    <span className={styles.typeChip}>
                      <span className={styles.icon} aria-hidden="true">
                        {getVisitTypeIcon(v.visit_type)}
                      </span>
                      <span className={styles.typeLabel}>
                        {getVisitTypeLabel(v.visit_type)}
                      </span>
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    {overdue ? (
                      <span className={styles.overdueTag}>Past due — add outcome</span>
                    ) : (
                      <span className={styles.dateLine}>{formatDate(v.visit_date)}</span>
                    )}
                  </div>
                </div>
                <span className={styles.chevron} aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default UpcomingVisitsCarousel;
