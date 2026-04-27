/**
 * MobileAllVisitsView – mobile-first layout for the all-visits list.
 *
 * - Sticky header with title + filter button (count badge = active filters).
 * - Filter button opens a MobileSheet with child + visit-type pickers.
 * - Day-grouped, swipe-friendly tap rows (one per visit) instead of a card list.
 * - Infinite scroll (IntersectionObserver) replaces pagination on mobile.
 * - Pull-to-refresh wraps the list and reloads via `useAllVisits().reload`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import { MobileSheet } from '@shared/components/MobileSheet';
import PullToRefresh from '@shared/components/PullToRefresh';
import { ChildAvatar } from '@features/children';
import { useAllVisits } from '../hooks';
import type { Child, Visit, VisitType } from '@shared/types/api';
import { formatDate, formatTime, isFutureDate } from '@lib/date-utils';
import { getVisitTypeIcon, getVisitTypeLabel } from '@shared/lib/visit-icons';
import { LuFilter, LuX } from 'react-icons/lu';
import styles from './MobileAllVisitsView.module.css';

const VISIT_TYPES: VisitType[] = ['wellness', 'sick', 'injury', 'dental', 'vision'];
const PAGE_SIZE = 20;

function MobileAllVisitsView() {
  const {
    allVisits,
    children,
    loading,
    error,
    filterChildId,
    filterVisitType,
    setFilterChildId,
    setFilterVisitType,
    reload,
  } = useAllVisits();

  const [filterOpen, setFilterOpen] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const childById = useMemo(() => {
    const map = new Map<number, Child>();
    for (const c of children) map.set(c.id, c);
    return map;
  }, [children]);

  // Apply filters here (separate from the hook's pagination so we control infinite scroll).
  const filtered = useMemo(() => {
    let result = allVisits;
    if (filterChildId != null) result = result.filter((v) => v.child_id === filterChildId);
    if (filterVisitType) result = result.filter((v) => v.visit_type === filterVisitType);
    return [...result].sort(
      (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime(),
    );
  }, [allVisits, filterChildId, filterVisitType]);

  // Reset paging when the filter changes.
  useEffect(() => {
    setPageCount(1);
  }, [filterChildId, filterVisitType]);

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

  // Group visible visits by ISO date (YYYY-MM-DD) for date headers.
  const grouped = useMemo(() => {
    const out: Array<{ date: string; visits: Visit[] }> = [];
    let current: { date: string; visits: Visit[] } | null = null;
    for (const v of visible) {
      const date = v.visit_date;
      if (!current || current.date !== date) {
        current = { date, visits: [] };
        out.push(current);
      }
      current.visits.push(v);
    }
    return out;
  }, [visible]);

  const activeFilterCount =
    (filterChildId != null ? 1 : 0) + (filterVisitType ? 1 : 0);

  if (loading && allVisits.length === 0) {
    return <LoadingSpinner message="Loading visits..." />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Visits</h1>
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
          {filterChildId != null && (
            <button
              type="button"
              className={styles.chip}
              onClick={() => setFilterChildId(undefined)}
            >
              {childById.get(filterChildId)?.name ?? 'Child'}
              <LuX aria-hidden="true" />
            </button>
          )}
          {filterVisitType && (
            <button
              type="button"
              className={styles.chip}
              onClick={() => setFilterVisitType(undefined)}
            >
              {getVisitTypeLabel(filterVisitType)}
              <LuX aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <PullToRefresh onRefresh={reload}>
        <div className={styles.list}>
          {grouped.length === 0 ? (
            <div className={styles.empty}>
              No visits {activeFilterCount > 0 ? 'match these filters' : 'yet'}.
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.date} className={styles.dayGroup}>
                <h2 className={styles.dayHeader}>{formatDate(group.date)}</h2>
                <ul className={styles.dayList}>
                  {group.visits.map((v) => {
                    const child = childById.get(v.child_id);
                    const overdue = !isFutureDate(v.visit_date);
                    return (
                      <li key={v.id}>
                        <Link to={`/visits/${v.id}`} className={styles.row}>
                          <span className={styles.avatar} aria-hidden="true">
                            {child ? (
                              <ChildAvatar
                                avatar={child.avatar}
                                gender={child.gender}
                                alt=""
                                className={styles.avatarImg}
                              />
                            ) : null}
                          </span>
                          <span className={styles.body}>
                            <span className={styles.titleRow}>
                              <span className={styles.icon}>
                                {getVisitTypeIcon(v.visit_type)}
                              </span>
                              <span className={styles.titleText}>
                                {v.title || getVisitTypeLabel(v.visit_type)}
                              </span>
                            </span>
                            <span className={styles.meta}>
                              {child?.name ?? `Child #${v.child_id}`}
                              {v.visit_time ? ` · ${formatTime(v.visit_time)}` : ''}
                              {v.doctor_name ? ` · ${v.doctor_name}` : ''}
                            </span>
                            {!overdue && (
                              <span className={styles.upcomingTag}>Upcoming</span>
                            )}
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
        title="Filter visits"
      >
        <div className={styles.sheetBody}>
          <section className={styles.sheetSection}>
            <h3 className={styles.sheetSectionTitle}>Child</h3>
            <div className={styles.sheetChips}>
              <button
                type="button"
                className={`${styles.sheetChip} ${filterChildId == null ? styles.sheetChipActive : ''}`}
                onClick={() => setFilterChildId(undefined)}
              >
                All children
              </button>
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.sheetChip} ${filterChildId === c.id ? styles.sheetChipActive : ''}`}
                  onClick={() => setFilterChildId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.sheetSection}>
            <h3 className={styles.sheetSectionTitle}>Visit type</h3>
            <div className={styles.sheetChips}>
              <button
                type="button"
                className={`${styles.sheetChip} ${!filterVisitType ? styles.sheetChipActive : ''}`}
                onClick={() => setFilterVisitType(undefined)}
              >
                All types
              </button>
              {VISIT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.sheetChip} ${filterVisitType === t ? styles.sheetChipActive : ''}`}
                  onClick={() => setFilterVisitType(t)}
                >
                  <span className={styles.sheetChipIcon}>{getVisitTypeIcon(t)}</span>
                  {getVisitTypeLabel(t)}
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
                setFilterChildId(undefined);
                setFilterVisitType(undefined);
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

export default MobileAllVisitsView;
