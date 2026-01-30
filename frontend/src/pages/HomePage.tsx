import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { childrenApi, familiesApi } from '../lib/api-client';
import type { Child, Family } from '../types/api';
import { calculateAge, formatAge, formatDate } from '../lib/date-utils';
import { useHomeTabRequest } from '../contexts/HomeTabRequestContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import ChildAvatar from '../components/ChildAvatar';
import Tabs from '../components/Tabs';
import AllIllnessesView from '../components/AllIllnessesView';
import AllVisitsView from '../components/AllVisitsView';
import MetricsView from '../components/MetricsView';
import TrendsSidebar from '../components/TrendsSidebar';
import VisitTypeModal from '../components/VisitTypeModal';

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

  useEffect(() => {
    if (activeTab === 'family' || activeTab === 'trends') {
      if (children.length === 0) loadChildren();
      if (families.length === 0) loadFamilies();
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

  const familyContent = (
    <div className="card home-family-tab">
      {loading && <LoadingSpinner message="Loading family..." />}
      {error && <ErrorMessage message={error} onRetry={loadChildren} />}
      {!loading && !error && (
        <div className="home-family-sections">
          {[...families]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map((family) => {
              const kids = childrenByFamilyId[family.id] ?? [];
              const canEditFamily = family.role === 'owner' || family.role === 'parent';
              return (
                <section key={family.id} className="home-family-section" aria-labelledby={`home-family-heading-${family.id}`}>
                  <h2 id={`home-family-heading-${family.id}`} className="home-family-tab-title">
                    {family.name}
                  </h2>
                  {kids.length === 0 && !canEditFamily ? (
                    <p className="empty-state">No children in this family.</p>
                  ) : kids.length === 0 ? (
                    <Card>
                      <p className="empty-state">No children yet.</p>
                    </Card>
                  ) : (
                    <div className="children-grid-cards">
                      {kids.map((child) => {
                        const age = calculateAge(child.date_of_birth);
                        const ageText = formatAge(age.years, age.months);
                        const birthdateText = formatDate(child.date_of_birth);
                        return (
                          <Link key={child.id} to={`/children/${child.id}`} className="child-card-link">
                            <Card className="child-card-compact">
                              <div className="child-card-avatar">
                                <ChildAvatar
                                  avatar={child.avatar}
                                  gender={child.gender}
                                  alt={`${child.name}'s avatar`}
                                  className="child-avatar-large"
                                />
                              </div>
                              <div className="child-card-content">
                                <div className="child-card-header">
                                  <h2 className="child-name">{child.name}</h2>
                                </div>
                                <div className="child-card-details">
                                  <div className="child-detail-item">
                                    <span className="detail-icon">🎂</span>
                                    <span className="detail-text">{ageText}</span>
                                  </div>
                                  <div className="child-detail-item">
                                    <span className="detail-icon">📅</span>
                                    <span className="detail-text">{birthdateText}</span>
                                  </div>
                                </div>
                                <span className="child-card-arrow">→</span>
                              </div>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          {families.length === 0 && (
            <Card>
              <p className="empty-state">No families yet. Join a family via an invite link or create an account.</p>
            </Card>
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
        <div className="visits-page-layout">
          <TrendsSidebar
            activeTab={metricsActiveTab}
            onChangeTab={(t) => setMetricsActiveTab(t)}
            childrenList={children}
            selectedChildId={metricsFilterChildId}
            onSelectChild={(id) => setMetricsFilterChildId(id)}
            
          />

          <main className="visits-main">
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
    <div className="page-container">
      {successMessage && (
        <div
          role="alert"
          className="success-banner"
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
