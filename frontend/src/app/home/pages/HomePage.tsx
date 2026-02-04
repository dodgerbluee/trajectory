import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHomeTabRequest } from '@/contexts/HomeTabRequestContext';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import Tabs from '@shared/components/Tabs';
import { AllIllnessesView } from '@features/illnesses';
import { AllVisitsView } from '@features/visits';
import { MetricsView, TrendsSidebar } from '@features/medical';
import { VisitTypeModal } from '@features/visits';
import type { VisitType } from '@shared/types/api';
import { FamilyTabView } from '../components';
import { useFamiliesData } from '../hooks/useFamiliesData';
import { useUpcomingVisitsData } from '../hooks/useUpcomingVisitsData';
import { useChildrenData } from '@features/children/hooks';
import styles from './HomePage.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';

type HomeTab = 'family' | 'illnesses' | 'visits' | 'trends';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const homeTabRequest = useHomeTabRequest();
  const stateTab = (location.state as { tab?: HomeTab } | null)?.tab;
  const stateMessage = (location.state as { message?: string } | null)?.message;
  const [activeTab, setActiveTab] = useState<HomeTab>(stateTab ?? 'family');
  const [successMessage, setSuccessMessage] = useState<string | null>(stateMessage ?? null);
  const [metricsActiveTab, setMetricsActiveTab] = useState<'illness' | 'growth'>('illness');
  const [metricsYear, setMetricsYear] = useState<number>(new Date().getFullYear());
  const [metricsFilterChildId, setMetricsFilterChildId] = useState<number | undefined>(undefined);

  // Use the new data-loading hooks (data fetching separated from rendering)
  const { children, loading: loadingChildren, error: errorChildren, reload: reloadChildren } = useChildrenData();
  const { families, loading: loadingFamilies, error: errorFamilies, reload: reloadFamilies } = useFamiliesData();
  const { upcomingVisits, loading: loadingUpcoming, reload: reloadUpcoming } = useUpcomingVisitsData();

  const loading = loadingFamilies || loadingChildren;
  const error = errorFamilies || errorChildren;

  const handleRetry = async () => {
    await Promise.all([reloadChildren(), reloadFamilies(), reloadUpcoming()]);
  };

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

  const familyContent = (
    <div className={styles.familyTab}>
      {loading && <LoadingSpinner message="Loading family..." />}
      {error && <ErrorMessage message={error} onRetry={handleRetry} />}
      {!loading && !error && (
        <FamilyTabView
          children={children}
          families={families}
          upcomingVisits={upcomingVisits}
          loading={loadingFamilies || loadingChildren}
          error={errorFamilies || errorChildren}
          loadingUpcoming={loadingUpcoming}
          onRetry={handleRetry}
        />
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
        isOpen={!!((location.state as { openAddVisit?: boolean })?.openAddVisit)}
        onSelect={(visitType: VisitType) => {
          const stateFrom = (location.state as { from?: string })?.from;
          const stateFromTab = (location.state as { fromTab?: string })?.fromTab;
          const from = stateFrom ?? (location.pathname === '/' ? '/' : `${location.pathname}${location.search}`);
          const fromTab = stateFromTab ?? (location.pathname === '/' ? 'visits' : undefined);
          navigate(`/visits/new?type=${visitType}`, { state: { from, fromTab } });
        }}
        onClose={() => {
          const currentState = { ...(location.state as Record<string, unknown>) };
          delete currentState.openAddVisit;
          navigate(location.pathname + (location.search || ''), { state: currentState, replace: true });
        }}
      />
    </div>
  );
}

export default HomePage;
