/**
 * MobileHomeFeed – primary home screen for mobile (<768px).
 *
 * Composition (top → bottom):
 *  1. Greeting + child chip row          (filter scope for the rest of the feed)
 *  2. Quick actions row                  (Log Visit / Illness / Measure / Attach)
 *  3. Upcoming visits carousel           (horizontal swipe)
 *  4. Active illnesses (if any)          (compact list)
 *  5. Recent visits                      (last 5, tappable rows)
 *  6. Footer link to full Trends         (placeholder, opens trends tab)
 *
 * Pull-to-refresh reloads all data sources concurrently. The greeting is
 * intentionally lightweight to keep above-the-fold content actionable.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuX } from 'react-icons/lu';
import type { Child, Family, Illness, Visit } from '@shared/types/api';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import PullToRefresh from '@shared/components/PullToRefresh';
import { ChildAvatar } from '@features/children';
import { useIllnessesData } from '@features/illnesses/hooks/useIllnessesData';
import { useAllVisits } from '@features/visits/hooks/useAllVisits';
import { formatDate, isFutureDate } from '@lib/date-utils';
import { getVisitTypeIcon, getVisitTypeLabel } from '@shared/lib/visit-icons';
import ChildChipRow from './ChildChipRow';
import QuickActionsRow from './QuickActionsRow';
import UpcomingVisitsCarousel from './UpcomingVisitsCarousel';
import styles from './MobileHomeFeed.module.css';

interface MobileHomeFeedProps {
  children: Child[];
  families: Family[];
  upcomingVisits: Visit[];
  loading: boolean;
  error: string | null;
  loadingUpcoming: boolean;
  onRetry: () => Promise<void> | void;
}

function MobileHomeFeed({
  children: childrenList,
  families: _families,
  upcomingVisits,
  loading,
  error,
  loadingUpcoming,
  onRetry,
}: MobileHomeFeedProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Recent activity sources (kept inside this component because they are
  // mobile-only; the desktop home doesn't surface them on the Family tab).
  const { illnesses, reload: reloadIllnesses } = useIllnessesData({ limit: 50 });
  const { allVisits: recentVisits, loading: loadingRecent, reload: reloadVisits } = useAllVisits();

  const handleRefresh = async () => {
    await Promise.all([Promise.resolve(onRetry()), reloadIllnesses(), reloadVisits()]);
  };

  const greetingName = useMemo(() => {
    const raw = user?.username || user?.email || '';
    return raw ? raw.split(/[\s@]/)[0] : '';
  }, [user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Good evening';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const activeIllnesses = useMemo(() => {
    const filtered = illnesses.filter((i) => !i.end_date);
    return selectedChildId == null
      ? filtered
      : filtered.filter((i) => i.child_id === selectedChildId);
  }, [illnesses, selectedChildId]);

  const recent = useMemo(() => {
    const base = recentVisits.filter((v) => !isFutureDate(v.visit_date));
    const filtered =
      selectedChildId == null ? base : base.filter((v) => v.child_id === selectedChildId);
    return [...filtered]
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
      .slice(0, 5);
  }, [recentVisits, selectedChildId]);

  const childById = useMemo(() => {
    const map = new Map<number, Child>();
    for (const c of childrenList) map.set(c.id, c);
    return map;
  }, [childrenList]);

  if (loading) {
    return <LoadingSpinner message="Loading family..." />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (childrenList.length === 0) {
    // Empty state mirrors desktop: route through onboarding via FamilyTabView.
    return (
      <div className={styles.empty}>
        <h2>Welcome to Trajectory</h2>
        <p>Add your first child to get started.</p>
        <Link to="/family" className={styles.emptyCta}>
          Go to Family
        </Link>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className={styles.feed}>
        <header className={styles.header}>
          <p className={styles.greetingLine}>
            {greeting}
            {greetingName ? `, ${greetingName}` : ''}.
          </p>
          {selectedChildId != null && (
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => setSelectedChildId(null)}
              aria-label="Clear child filter, show all children"
            >
              <LuX aria-hidden="true" />
              <span>Show all</span>
            </button>
          )}
        </header>

        <ChildChipRow
          childrenList={childrenList}
          selectedId={selectedChildId}
          onSelect={setSelectedChildId}
        />

        <QuickActionsRow childId={selectedChildId} />

        <UpcomingVisitsCarousel
          upcomingVisits={upcomingVisits}
          childrenList={childrenList}
          filterChildId={selectedChildId}
          loading={loadingUpcoming}
        />

        {activeIllnesses.length > 0 && (
          <section className={styles.section} aria-labelledby="mobile-active-illnesses">
            <div className={styles.sectionHeader}>
              <h2 id="mobile-active-illnesses" className={styles.sectionTitle}>
                Active illnesses
              </h2>
            </div>
            <ul className={styles.list}>
              {activeIllnesses.slice(0, 5).map((illness: Illness) => {
                const child = childById.get(illness.child_id);
                const label =
                  illness.illness_types && illness.illness_types.length > 0
                    ? illness.illness_types.join(', ')
                    : 'Illness';
                return (
                  <li key={illness.id}>
                    <Link to={`/illnesses/${illness.id}`} className={styles.row}>
                      <span className={styles.rowDot} aria-hidden="true">🤒</span>
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>{label}</span>
                        <span className={styles.rowMeta}>
                          {child?.name ?? 'Child'} · since {formatDate(illness.start_date)}
                        </span>
                      </span>
                      <span className={styles.rowChevron} aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className={styles.section} aria-labelledby="mobile-recent-heading">
          <div className={styles.sectionHeader}>
            <h2 id="mobile-recent-heading" className={styles.sectionTitle}>
              Recent visits
            </h2>
            <button
              type="button"
              className={styles.sectionLink}
              onClick={() => navigate('/', { state: { tab: 'visits' } })}
            >
              See all
            </button>
          </div>
          {loadingRecent && recent.length === 0 ? (
            <div className={styles.muted}>Loading…</div>
          ) : recent.length === 0 ? (
            <div className={styles.muted}>No visits logged yet.</div>
          ) : (
            <ul className={styles.list}>
              {recent.map((v) => {
                const child = childById.get(v.child_id);
                const overdue =
                  !isFutureDate(v.visit_date) && !v.doctor_name && !v.location;
                return (
                  <li key={v.id}>
                    <Link to={`/visits/${v.id}`} className={styles.row}>
                      <span className={styles.rowAvatar} aria-hidden="true">
                        {child ? (
                          <ChildAvatar
                            avatar={child.avatar}
                            gender={child.gender}
                            alt=""
                            className={styles.avatarImg}
                          />
                        ) : null}
                      </span>
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>
                          <span className={styles.rowIcon}>{getVisitTypeIcon(v.visit_type)}</span>
                          {getVisitTypeLabel(v.visit_type)}
                        </span>
                        <span className={styles.rowMeta}>
                          {child?.name ?? 'Child'} · {formatDate(v.visit_date)}
                          {overdue ? ' · needs outcome' : ''}
                        </span>
                      </span>
                      <span className={styles.rowChevron} aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PullToRefresh>
  );
}

export default MobileHomeFeed;
