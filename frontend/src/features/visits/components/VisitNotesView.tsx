import { useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import type { Person, Visit } from '@shared/types/api';
import { formatDate } from '@lib/date-utils';
import { getVisitTypeIcon, getVisitTypeLabel } from '@shared/lib/visit-icons';
import PaginationControls from '@shared/components/PaginationControls';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import styles from './VisitNotesView.module.css';

interface Props {
  visits: Visit[];
  people: Person[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
}

function VisitNotesView({ visits, people, currentPage, itemsPerPage, totalItems, onPageChange, onItemsPerPageChange }: Props) {
  const personById = useMemo(() => {
    const map = new Map<number, Person>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  const grouped = useMemo(() => {
    const out: Array<{ date: string; items: Array<{ visit: Visit; personName: string }> }> = [];
    let current: typeof out[number] | null = null;
    for (const v of visits) {
      const personName = personById.get(v.person_id)?.name ?? `Person #${v.person_id}`;
      const date = v.visit_date;
      if (!current || current.date !== date) {
        current = { date, items: [] };
        out.push(current);
      }
      current.items.push({ visit: v, personName });
    }
    return out;
  }, [visits, personById]);

  return (
    <main className={visitsLayout.main}>
      <div className={visitsLayout.mainContent}>
        <div className={styles.container}>
          {grouped.length === 0 ? (
            <div className={styles.empty}>No visits with notes match the current filters.</div>
          ) : (
            grouped.map((group) => (
              <section key={group.date} className={styles.dayGroup}>
                <h2 className={styles.dayHeader}>{formatDate(group.date)}</h2>
                {group.items.map(({ visit, personName }) => (
                  <Link key={visit.id} to={`/visits/${visit.id}`} className={styles.noteCard}>
                    <div className={styles.noteHeader}>
                      <span className={styles.noteTypeBadge}>
                        {getVisitTypeIcon(visit.visit_type)}
                        {getVisitTypeLabel(visit.visit_type)}
                      </span>
                      {people.length > 0 && <span className={styles.notePersonBadge}>{personName}</span>}
                      {visit.title && <span className={styles.noteTitle}>{visit.title}</span>}
                      <span className={styles.noteArrow} aria-hidden>→</span>
                    </div>
                    {visit.notes && (
                      <div>
                        {visit.dental_notes && <div className={styles.noteLabel}>General Notes</div>}
                        <div className={styles.noteBody}>{visit.notes}</div>
                      </div>
                    )}
                    {visit.dental_notes && (
                      <div>
                        {visit.notes && <div className={styles.noteDivider} />}
                        <div className={styles.noteLabel}>Dental Notes</div>
                        <div className={styles.noteBody}>{visit.dental_notes}</div>
                      </div>
                    )}
                  </Link>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
      {totalItems > 0 && (
        <PaginationControls
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      )}
    </main>
  );
}

export default memo(VisitNotesView);
