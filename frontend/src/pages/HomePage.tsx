import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuHeart, LuPill, LuEye, LuActivity } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import { childrenApi, familiesApi, visitsApi } from '../lib/api-client';
import type { Child, Family, Visit } from '../types/api';
import { calculateAge, formatAge, formatDate, isFutureDate } from '../lib/date-utils';
import { visitHasOutcomeData } from '../lib/visit-utils';
import { useHomeTabRequest } from '../contexts/HomeTabRequestContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import { ChildAvatar } from '../features/children';
import Tabs from '../components/Tabs';
import { AllIllnessesView } from '../features/illnesses';
import { AllVisitsView } from '../features/visits';
import MetricsView from '../components/MetricsView';
import TrendsSidebar from '../components/TrendsSidebar';
import VisitTypeModal from '../components/VisitTypeModal';
import styles from './HomePage.module.css';
import pageLayout from '../styles/page-layout.module.css';
import visitsLayout from '../styles/VisitsLayout.module.css';
import tl from '../components/TimelineList.module.css';

type HomeTab = 'family' | 'illnesses' | 'visits' | 'trends';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const homeTabRequest = useHomeTabRequest();
  const stateTab = (location.state as { tab?: HomeTab } | null)?.tab;
  const stateMessage = (location.state as { message?: string } | null)?.message;
  const [activeTab, setActiveTab] = useState<HomeTab>(stateTab ?? 'family');
  const [successMessage, setSuccessMessage] = useState<string | null>(stateMessage ?? null);
  const [children, setChildren] = useState<Child[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricsActiveTab, setMetricsActiveTab] = useState<'illness' | 'growth'>('illness');
  const [metricsYear, setMetricsYear] = useState<number>(new Date().getFullYear());
  const [metricsFilterChildId, setMetricsFilterChildId] = useState<number | undefined>(undefined);
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenApi.getAll();
      // Sort by age (oldest to youngest) - oldest = earliest date_of_birth
      const sortedChildren = [...response.data].sort((a, b) => {
        const dateA = new Date(a.date_of_birth).getTime();
        const dateB = new Date(b.date_of_birth).getTime();
        return dateA - dateB; // Ascending = oldest first
      });
      setChildren(sortedChildren);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load children');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFamilies = async () => {
    try {
      const response = await familiesApi.getAll();
      setFamilies(response.data);
    } catch {
      setFamilies([]);
    }
  };

  const loadUpcomingVisits = async () => {
    try {
      setLoadingUpcoming(true);
      // Fetch enough visits to include future + recent past/today (overdue appointments with no outcome)
      const response = await visitsApi.getAll({ limit: 80 });
      const all = response.data;
      // Upcoming = future OR (on/past date and no outcome data yet); remove only when data entered on/after visit date
      const upcoming = all
        .filter((v) => isFutureDate(v.visit_date) || !visitHasOutcomeData(v))
        .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
        .slice(0, 30);
      setUpcomingVisits(upcoming);
    } catch {
      setUpcomingVisits([]);
    } finally {
      setLoadingUpcoming(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'family' || activeTab === 'trends') {
      if (children.length === 0) loadChildren();
      if (families.length === 0) loadFamilies();
      loadUpcomingVisits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (stateTab) {
      setActiveTab(stateTab);
    }
  }, [stateTab]);

  useEffect(() => {
    if (stateMessage) {
      setSuccessMessage(stateMessage);
      navigate(location.pathname, { replace: true, state: { tab: stateTab } });
    }
  }, [stateMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Logo click requests Family tab via context (works every time, even when already on home)
  useEffect(() => {
    if (homeTabRequest?.requestId != null && homeTabRequest.requestId > 0) {
      setActiveTab('family');
    }
  }, [homeTabRequest?.requestId]);

  /** Children grouped by family_id for per-family sections. Fallback: missing family_id → first family. */
  const childrenByFamilyId = useMemo(() => {
    const map: Record<number, Child[]> = {};
    for (const f of families) map[f.id] = [];
    for (const c of children) {
      const fid = c.family_id ?? families[0]?.id;
      if (fid != null && map[fid]) map[fid].push(c);
    }
    for (const id of Object.keys(map)) {
      map[Number(id)].sort(
        (a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime()
      );
    }
    return map;
  }, [families, children]);

  const visitTypeLabel = (t: Visit['visit_type']) => {
    switch (t) {
      case 'wellness': return 'Wellness';
      case 'sick': return 'Sick';
      case 'injury': return 'Injury';
      case 'vision': return 'Vision';
      case 'dental': return 'Dental';
      default: return 'Visit';
    }
  };

  const VisitTypeIcon = ({ visitType }: { visitType: Visit['visit_type'] }) => {
    if (visitType === 'wellness') return <LuHeart className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'sick') return <LuPill className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'injury') return <MdOutlinePersonalInjury className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'vision') return <LuEye className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'dental') return <HugeiconsIcon icon={DentalToothIcon} className={styles.upcomingIcon} size={16} color="currentColor" aria-hidden />;
    return <LuActivity className={styles.upcomingIcon} aria-hidden />;
  };

  /** Upcoming visits grouped by child, children sorted by name, visits per child sorted by date. */
  const upcomingByChild = useMemo(() => {
    const byChildId = new Map<number, Visit[]>();
    for (const v of upcomingVisits) {
      const list = byChildId.get(v.child_id) ?? [];
      list.push(v);
      byChildId.set(v.child_id, list);
    }
    for (const list of byChildId.values()) {
      list.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
    }
    const childIds = Array.from(byChildId.keys());
    const withChildren = childIds
      .map((id) => ({ child: children.find((c) => c.id === id), visits: byChildId.get(id)! }))
      .filter((x) => x.child != null) as { child: Child; visits: Visit[] }[];
    withChildren.sort((a, b) => (a.child.name || '').localeCompare(b.child.name || ''));
    return withChildren;
  }, [upcomingVisits, children]);

  const familyContent = (
    <div className={styles.familyTab}>
      {loading && <LoadingSpinner message="Loading family..." />}
      {error && <ErrorMessage message={error} onRetry={loadChildren} />}
      {!loading && !error && (
        <div className={styles.tabsContent}>
          {/* Upcoming Visits – own tabs-content div with border */}
          {!loadingUpcoming && upcomingVisits.length > 0 && (
            <div className={styles.tabsContentBox}>
              <section className={styles.upcomingSection} aria-labelledby="home-upcoming-heading">
                <h2 id="home-upcoming-heading" className={styles.upcomingTitle}>Upcoming Visits</h2>
                <div className={styles.upcomingByChild}>
                  {upcomingByChild.map(({ child, visits }) => (
                    <div key={child.id} className={styles.upcomingChildRow}>
                      <span className={styles.upcomingChildLabel}>{child.name}</span>
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
                              <VisitTypeIcon visitType={v.visit_type} />
                              <span className={styles.upcomingChipText}>
                                {visitTypeLabel(v.visit_type)} · {formatDate(v.visit_date)}
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
          )}

          {/* Each family – own tabs-content div with border */}
          {[...families]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map((family) => {
              const kids = childrenByFamilyId[family.id] ?? [];
              const canEditFamily = family.role === 'owner' || family.role === 'parent';
              return (
                <div key={family.id} className={styles.tabsContentBox}>
                  <section className={styles.familySection} aria-labelledby={`home-family-heading-${family.id}`}>
                    <h2 id={`home-family-heading-${family.id}`} className={styles.familyTabTitle}>
                      {family.name}
                    </h2>
                  {kids.length === 0 && !canEditFamily ? (
                    <p className={tl.empty}>No children in this family.</p>
                  ) : kids.length === 0 ? (
                    <Card>
                      <p className={tl.empty}>No children yet.</p>
                    </Card>
                  ) : (
                    <div className={styles.grid}>
                      {kids.map((child) => {
                        const age = calculateAge(child.date_of_birth);
                        const ageText = formatAge(age.years, age.months);
                        const birthdateText = formatDate(child.date_of_birth);
                        return (
                          <Link key={child.id} to={`/children/${child.id}`} className={styles.cardLink} data-onboarding="child-card">
                            <Card className={styles.compact}>
                              <div className={styles.avatar}>
                                <ChildAvatar
                                  avatar={child.avatar}
                                  gender={child.gender}
                                  alt={`${child.name}'s avatar`}
                                  className={styles.avatarLarge}
                                />
                              </div>
                              <div className={styles.content}>
                                <div className={styles.header}>
                                  <h2 className={styles.name}>{child.name}</h2>
                                </div>
                                <div className={styles.details}>
                                  <div className={styles.detailItem}>
                                    <span className={styles.detailIcon} aria-hidden>🎂</span>
                                    <span className={styles.detailText}>{ageText}</span>
                                  </div>
                                  <div className={styles.detailItem}>
                                    <span className={styles.detailIcon} aria-hidden>📅</span>
                                    <span className={styles.detailText}>{birthdateText}</span>
                                  </div>
                                </div>
                                <span className={styles.arrow} aria-hidden>→</span>
                              </div>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  </section>
                </div>
              );
            })}
          {families.length === 0 && (
            <div className={styles.tabsContentBox}>
              <Card>
                <p className={tl.empty}>No families yet. Join a family via an invite link or create an account.</p>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );


  const tabs = [
    {
      id: 'family',
      label: 'Family',
      content: familyContent,
    },
    {
      id: 'visits',
      label: 'Visits',
      content: <AllVisitsView />,
    },
    {
      id: 'illnesses',
      label: 'Illness',
      content: <AllIllnessesView />,
    },
    {
      id: 'trends',
      label: 'Trends',
      content: (
        <div className={visitsLayout.pageLayout}>
          <TrendsSidebar
            activeTab={metricsActiveTab}
            onChangeTab={(t) => setMetricsActiveTab(t)}
            childrenList={children}
            selectedChildId={metricsFilterChildId}
            onSelectChild={(id) => setMetricsFilterChildId(id)}
            showIllnessTab={true}
            showGrowthTab={true}
          />

          <main className={visitsLayout.main}>
            <MetricsView
              activeTab={metricsActiveTab}
              onActiveTabChange={(t) => setMetricsActiveTab(t)}
              selectedYear={metricsYear}
              onSelectedYearChange={(y) => setMetricsYear(y)}
              filterChildId={metricsFilterChildId}
              onFilterChildChange={(id) => setMetricsFilterChildId(id)}
            />
          </main>
        </div>
      ),
    },
  ];

  return (
    <div className={pageLayout.pageContainer}>
      {successMessage && (
        <div
          role="alert"
          className={styles.successBanner}
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--color-success-bg, #d4edda)',
            color: 'var(--color-success-text, #155724)',
            borderRadius: 'var(--radius-md, 6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
      <Card>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as HomeTab)}
        />
      </Card>
      {/* Visit type modal triggered via navigation state (no URL query) on the Home page */}
      <VisitTypeModal
        isOpen={!!((location.state as any)?.openAddVisit)}
        onSelect={(visitType: any) => {
          const stateFrom = (location.state as any)?.from;
          const stateFromTab = (location.state as any)?.fromTab;
          const from = stateFrom ?? (location.pathname === '/' ? '/' : `${location.pathname}${location.search}`);
          const fromTab = stateFromTab ?? (location.pathname === '/' ? 'visits' : undefined);
          navigate(`/visits/new?type=${visitType}`, { state: { from, fromTab } });
        }}
        onClose={() => {
          const currentState = { ...(location.state as any) };
          delete currentState.openAddVisit;
          navigate(location.pathname + (location.search || ''), { state: currentState, replace: true });
        }}
      />
    </div>
  );
}

export default HomePage;
