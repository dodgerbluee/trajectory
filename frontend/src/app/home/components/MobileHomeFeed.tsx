/**
 * MobileHomeFeed – primary home screen for mobile (<768px).
 *
 * Composition (top → bottom):
 *  1. Greeting + person chip row          (filter scope for the rest of the feed)
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
import type { Person, Family, Illness, Visit } from '@shared/types/api';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import PullToRefresh from '@shared/components/PullToRefresh';
import { PersonAvatar } from '@features/people';
import { useIllnessesData } from '@features/illnesses/hooks/useIllnessesData';
import { useAllVisits } from '@features/visits/hooks/useAllVisits';
import { formatDate, isFutureDate } from '@lib/date-utils';
import { getVisitTypeIcon, getVisitTypeLabel } from '@shared/lib/visit-icons';
import PersonChipRow from './PersonChipRow';
import QuickActionsRow from './QuickActionsRow';
import UpcomingVisitsCarousel from './UpcomingVisitsCarousel';
import styles from './MobileHomeFeed.module.css';

interface MobileHomeFeedProps {
  people: Person[];
  families: Family[];
  upcomingVisits: Visit[];
  loading: boolean;
  error: string | null;
  loadingUpcoming: boolean;
  onRetry: () => Promise<void> | void;
}

function MobileHomeFeed({
  people: peopleList,
  families: _families,
  upcomingVisits,
  loading,
  error,
  loadingUpcoming,
  onRetry,
}: MobileHomeFeedProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

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
    return selectedPersonId == null
      ? filtered
      : filtered.filter((i) => i.person_id === selectedPersonId);
  }, [illnesses, selectedPersonId]);

  const recent = useMemo(() => {
    const base = recentVisits.filter((v) => !isFutureDate(v.visit_date));
    const filtered =
      selectedPersonId == null ? base : base.filter((v) => v.person_id === selectedPersonId);
    return [...filtered]
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
      .slice(0, 5);
  }, [recentVisits, selectedPersonId]);

  const personById = useMemo(() => {
    const map = new Map<number, Person>();
    for (const c of peopleList) map.set(c.id, c);
    return map;
  }, [peopleList]);

  if (loading) {
    return <LoadingSpinner message="Loading family..." />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (peopleList.length === 0) {
    // Empty state mirrors desktop: route through onboarding via FamilyTabView.
    return (
      <div className={styles.empty}>
        <h2>Welcome to Trajectory</h2>
        <p>Add your first person to get started.</p>
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
          {selectedPersonId != null && (
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => setSelectedPersonId(null)}
              aria-label="Clear person filter, show all people"
            >
              <LuX aria-hidden="true" />
              <span>Show all</span>
            </button>
          )}
        </header>

        <PersonChipRow
          peopleList={peopleList}
          selectedId={selectedPersonId}
          onSelect={setSelectedPersonId}
        />

        <QuickActionsRow personId={selectedPersonId} />

        <UpcomingVisitsCarousel
          upcomingVisits={upcomingVisits}
          peopleList={peopleList}
          filterPersonId={selectedPersonId}
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
                const person = personById.get(illness.person_id);
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
                          {person?.name ?? 'Person'} · since {formatDate(illness.start_date)}
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
                const person = personById.get(v.person_id);
                const overdue =
                  !isFutureDate(v.visit_date) && !v.doctor_name && !v.location;
                return (
                  <li key={v.id}>
                    <Link to={`/visits/${v.id}`} className={styles.row}>
                      <span className={styles.rowAvatar} aria-hidden="true">
                        {person ? (
                          <PersonAvatar
                            avatar={person.avatar}
                            gender={person.gender}
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
                          {person?.name ?? 'Person'} · {formatDate(v.visit_date)}
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
