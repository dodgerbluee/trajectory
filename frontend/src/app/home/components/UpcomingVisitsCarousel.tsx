/**
 * UpcomingVisitsCarousel – full-width vertical list of upcoming visits for the
 * mobile home feed. (Name kept for import stability; layout is no longer a
 * carousel.) Scopes to a single person if `filterPersonId` is set.
 *
 * Each row spans the full available width and renders on a single visual line:
 *   [date block]  Person Name · Type        Past due / date  ›
 *
 * Putting the visit type to the right of the person name keeps each row to a
 * single line and reclaims the vertical space the previous swipe cards used.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Person, Visit } from '@shared/types/api';
import { formatDate, isFutureDate } from '@lib/date-utils';
import { getVisitTypeIcon, getVisitTypeLabel } from '@shared/lib/visit-icons';
import styles from './UpcomingVisitsCarousel.module.css';

interface UpcomingVisitsCarouselProps {
  upcomingVisits: Visit[];
  peopleList: Person[];
  filterPersonId: number | null;
  loading?: boolean;
}

function UpcomingVisitsCarousel({
  upcomingVisits,
  peopleList,
  filterPersonId,
  loading,
}: UpcomingVisitsCarouselProps) {
  const personById = useMemo(() => {
    const map = new Map<number, Person>();
    for (const c of peopleList) map.set(c.id, c);
    return map;
  }, [peopleList]);

  const visits = useMemo(() => {
    const filtered =
      filterPersonId == null
        ? upcomingVisits
        : upcomingVisits.filter((v) => v.person_id === filterPersonId);
    return [...filtered].sort(
      (a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime(),
    );
  }, [upcomingVisits, filterPersonId]);

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
          const person = personById.get(v.person_id);
          const overdue = !isFutureDate(v.visit_date);
          const [y, m, d] = v.visit_date.split('T')[0].split('-').map(Number);
          const date = new Date(y, m - 1, d);
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
                    <span className={styles.personName}>
                      {person?.name ?? 'Person'}
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
