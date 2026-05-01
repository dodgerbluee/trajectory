/**
 * MobileIllnessesView – mobile-first layout for the all-illnesses list.
 *
 * - Sticky header with title + filter button (count badge = active filters).
 * - Filter button opens a MobileSheet with person + illness-type + status pickers.
 * - Day-grouped, swipe-friendly tap rows (one per illness) instead of a card list.
 * - Infinite scroll (IntersectionObserver) replaces pagination on mobile.
 * - Pull-to-refresh wraps the list and reloads via `useIllnesses().reload`.
 *
 * Mirrors features/visits/components/MobileAllVisitsView.tsx.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuFilter, LuThermometer, LuX } from 'react-icons/lu';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import { MobileSheet } from '@shared/components/MobileSheet';
import PullToRefresh from '@shared/components/PullToRefresh';
import { PersonAvatar } from '@features/people';
import { useIllnesses } from '../hooks';
import type { Person, Illness, IllnessType } from '@shared/types/api';
import { formatDate } from '@lib/date-utils';
import styles from './MobileIllnessesView.module.css';

const ILLNESS_TYPES: IllnessType[] = [
  'flu',
  'strep',
  'rsv',
  'covid',
  'cold',
  'stomach_bug',
  'ear_infection',
  'hand_foot_mouth',
  'croup',
  'pink_eye',
  'other',
];

const PAGE_SIZE = 20;

function illnessTypeLabel(type: IllnessType): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function illnessTypesDisplay(types: IllnessType[] | null | undefined): string {
  if (!types || types.length === 0) return 'Illness';
  return types.map(illnessTypeLabel).join(', ');
}

function MobileIllnessesView() {
  const {
    allIllnesses,
    people,
    loading,
    error,
    filterPersonId,
    filterIllnessType,
    filterIllnessStatus,
    setFilterPersonId,
    setFilterIllnessType,
    setFilterIllnessStatus,
    reload,
  } = useIllnesses();

  const [filterOpen, setFilterOpen] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const personById = useMemo(() => {
    const map = new Map<number, Person>();
    for (const c of people) map.set(c.id, c);
    return map;
  }, [people]);

  // Apply filters here (separate from the hook's pagination so we control infinite scroll).
  const filtered = useMemo(() => {
    let result = allIllnesses;
    if (filterPersonId != null) result = result.filter((i) => i.person_id === filterPersonId);
    if (filterIllnessType) result = result.filter((i) => i.illness_types?.includes(filterIllnessType));
    if (filterIllnessStatus === 'ongoing') result = result.filter((i) => !i.end_date);
    else if (filterIllnessStatus === 'ended') result = result.filter((i) => !!i.end_date);
    return [...result].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
    );
  }, [allIllnesses, filterPersonId, filterIllnessType, filterIllnessStatus]);

  // Reset paging when the filter changes.
  useEffect(() => {
    setPageCount(1);
  }, [filterPersonId, filterIllnessType, filterIllnessStatus]);

  const visible = useMemo(() => filtered.slice(0, pageCount * PAGE_SIZE), [filtered, pageCount]);
  const hasMore = visible.length < filtered.length;

  // Infinite scroll: when the sentinel enters the viewport, load more.
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPageCount((p) => p + 1);
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, visible.length]);

  // Group visible illnesses by ISO start_date (YYYY-MM-DD) for date headers.
  const grouped = useMemo(() => {
    const out: Array<{ date: string; illnesses: Illness[] }> = [];
    let current: { date: string; illnesses: Illness[] } | null = null;
    for (const i of visible) {
      const date = i.start_date;
      if (!current || current.date !== date) {
        current = { date, illnesses: [] };
        out.push(current);
      }
      current.illnesses.push(i);
    }
    return out;
  }, [visible]);

  const activeFilterCount =
    (filterPersonId != null ? 1 : 0) +
    (filterIllnessType ? 1 : 0) +
    (filterIllnessStatus ? 1 : 0);

  if (loading && allIllnesses.length === 0) {
    return <LoadingSpinner message="Loading illnesses..." />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Illnesses</h1>
        <button
          type="button"
          className={styles.filterButton}
          onClick={() => setFilterOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={filterOpen}
        >
          <LuFilter aria-hidden="true" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className={styles.filterCount} aria-label={`${activeFilterCount} active`}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </header>

      {activeFilterCount > 0 && (
        <div className={styles.activeChips}>
          {filterPersonId != null && (
            <button
              type="button"
              className={styles.chip}
              onClick={() => setFilterPersonId(undefined)}
            >
              {personById.get(filterPersonId)?.name ?? 'Person'}
              <LuX aria-hidden="true" />
            </button>
          )}
          {filterIllnessType && (
            <button
              type="button"
              className={styles.chip}
              onClick={() => setFilterIllnessType(undefined)}
            >
              {illnessTypeLabel(filterIllnessType)}
              <LuX aria-hidden="true" />
            </button>
          )}
          {filterIllnessStatus && (
            <button
              type="button"
              className={styles.chip}
              onClick={() => setFilterIllnessStatus(undefined)}
            >
              {filterIllnessStatus === 'ongoing' ? 'Ongoing' : 'Ended'}
              <LuX aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <PullToRefresh onRefresh={reload}>
        <div className={styles.list}>
          {grouped.length === 0 ? (
            <div className={styles.empty}>
              No illnesses {activeFilterCount > 0 ? 'match these filters' : 'recorded yet'}.
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.date} className={styles.dayGroup}>
                <h2 className={styles.dayHeader}>{formatDate(group.date)}</h2>
                <ul className={styles.dayList}>
                  {group.illnesses.map((i) => {
                    const person = personById.get(i.person_id);
                    const ongoing = !i.end_date;
                    return (
                      <li key={i.id}>
                        <Link to={`/illnesses/${i.id}`} className={styles.row}>
                          <span className={styles.avatar} aria-hidden="true">
                            {person ? (
                              <PersonAvatar
                                avatar={person.avatar}
                                gender={person.gender}
                                alt=""
                                className={styles.avatarImg}
                              />
                            ) : null}
                          </span>
                          <span className={styles.body}>
                            <span className={styles.titleRow}>
                              <span className={styles.icon}>
                                <LuThermometer aria-hidden="true" />
                              </span>
                              <span className={styles.titleText}>
                                {illnessTypesDisplay(i.illness_types)}
                              </span>
                            </span>
                            <span className={styles.meta}>
                              {person?.name ?? `Person #${i.person_id}`}
                              {i.severity ? ` · ${i.severity}/10` : ''}
                              {i.temperature ? ' · Fever' : ''}
                              {i.end_date ? ` · Ended ${formatDate(i.end_date)}` : ''}
                            </span>
                            {ongoing && <span className={styles.ongoingTag}>Ongoing</span>}
                          </span>
                          <span className={styles.chevron} aria-hidden="true">
                            ›
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}

          {hasMore && (
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true">
              Loading more…
            </div>
          )}
        </div>
      </PullToRefresh>

      <MobileSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter illnesses"
      >
        <div className={styles.sheetBody}>
          <section className={styles.sheetSection}>
            <h3 className={styles.sheetSectionTitle}>Person</h3>
            <div className={styles.sheetChips}>
              <button
                type="button"
                className={`${styles.sheetChip} ${filterPersonId == null ? styles.sheetChipActive : ''}`}
                onClick={() => setFilterPersonId(undefined)}
              >
                All people
              </button>
              {people.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.sheetChip} ${filterPersonId === c.id ? styles.sheetChipActive : ''}`}
                  onClick={() => setFilterPersonId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.sheetSection}>
            <h3 className={styles.sheetSectionTitle}>Status</h3>
            <div className={styles.sheetChips}>
              <button
                type="button"
                className={`${styles.sheetChip} ${!filterIllnessStatus ? styles.sheetChipActive : ''}`}
                onClick={() => setFilterIllnessStatus(undefined)}
              >
                All
              </button>
              <button
                type="button"
                className={`${styles.sheetChip} ${filterIllnessStatus === 'ongoing' ? styles.sheetChipActive : ''}`}
                onClick={() => setFilterIllnessStatus('ongoing')}
              >
                Ongoing
              </button>
              <button
                type="button"
                className={`${styles.sheetChip} ${filterIllnessStatus === 'ended' ? styles.sheetChipActive : ''}`}
                onClick={() => setFilterIllnessStatus('ended')}
              >
                Ended
              </button>
            </div>
          </section>

          <section className={styles.sheetSection}>
            <h3 className={styles.sheetSectionTitle}>Illness type</h3>
            <div className={styles.sheetChips}>
              <button
                type="button"
                className={`${styles.sheetChip} ${!filterIllnessType ? styles.sheetChipActive : ''}`}
                onClick={() => setFilterIllnessType(undefined)}
              >
                All types
              </button>
              {ILLNESS_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.sheetChip} ${filterIllnessType === t ? styles.sheetChipActive : ''}`}
                  onClick={() => setFilterIllnessType(t)}
                >
                  {illnessTypeLabel(t)}
                </button>
              ))}
            </div>
          </section>

          <div className={styles.sheetActions}>
            <button
              type="button"
              className={styles.sheetClear}
              disabled={activeFilterCount === 0}
              onClick={() => {
                setFilterPersonId(undefined);
                setFilterIllnessType(undefined);
                setFilterIllnessStatus(undefined);
              }}
            >
              Clear all
            </button>
            <button
              type="button"
              className={styles.sheetApply}
              onClick={() => setFilterOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </MobileSheet>
    </div>
  );
}

export default MobileIllnessesView;
