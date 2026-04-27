/**
 * MobileTrendsView – mobile-first trends/metrics screen.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ Sticky header                            │
 *   │   Title                       [Child ▾]  │
 *   │   [ Illness | Growth ]   ← segmented     │
 *   ├──────────────────────────────────────────┤
 *   │ (illness) summary cards + heatmap + day  │
 *   │ (growth)  metric chip-row                │
 *   │           [ Value | Percentile ] toggle  │
 *   │           single chart (~280px tall)     │
 *   └──────────────────────────────────────────┘
 *
 * - Child picker opens MobileSheet listing children + "All children".
 * - Heatmap supports prev/next year buttons.
 * - PullToRefresh wraps the scroll area and reloads both data sources.
 *
 * Mirrors the Phase-3/4 outer/inner branch convention; consumers branch on
 * useIsMobile() and render <MobileTrendsView /> on phones.
 */

import { useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuUsers } from 'react-icons/lu';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import { MobileSheet } from '@shared/components/MobileSheet';
import PullToRefresh from '@shared/components/PullToRefresh';
import { ChildAvatar } from '@features/children';
import { formatDate } from '@lib/date-utils';
import Heatmap from './Heatmap';
import SingleMetricGrowthChart from './SingleMetricGrowthChart';
import { useGrowthData, useHeatmapData } from '../hooks';
import styles from './MobileTrendsView.module.css';

type TrendTab = 'illness' | 'growth';
type GrowthMetric = 'weight' | 'height' | 'head_circumference' | 'bmi';
type GrowthMode = 'value' | 'percentile';

const METRIC_LABELS: Record<GrowthMetric, string> = {
  weight: 'Weight',
  height: 'Height',
  head_circumference: 'Head Circ.',
  bmi: 'BMI',
};

interface MobileTrendsViewProps {
  /** Optional preselected child (e.g. ChildDetailPage). When set, child filter is hidden. */
  fixedChildId?: number;
  /** Show "All children" option in the child picker (default true unless fixedChildId). */
  allowAllChildren?: boolean;
}

function MobileTrendsView({ fixedChildId, allowAllChildren }: MobileTrendsViewProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>('illness');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedChildId, setSelectedChildId] = useState<number | undefined>(fixedChildId);
  const [childSheetOpen, setChildSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const [mode, setMode] = useState<GrowthMode>('value');

  const effectiveChildId = fixedChildId ?? selectedChildId;
  const showChildPicker = !fixedChildId;
  const showAllChildren = allowAllChildren !== false && !fixedChildId;

  const {
    heatmapData,
    children,
    loading: heatLoading,
    error: heatError,
    reload: reloadHeatmap,
  } = useHeatmapData(year, effectiveChildId);

  const {
    data: growthData,
    loading: growthLoading,
    error: growthError,
    reload: reloadGrowth,
  } = useGrowthData(effectiveChildId);

  const handleRefresh = async () => {
    await Promise.all([reloadHeatmap(), reloadGrowth()]);
  };

  const selectedChild = effectiveChildId
    ? children.find((c) => c.id === effectiveChildId)
    : undefined;

  const selectedDayData =
    selectedDate && heatmapData
      ? heatmapData.days.find((d) => d.date === selectedDate)
      : null;

  return (
    <div className={styles.root}>
      {/* Sticky header */}
      <div className={styles.header}>
        <div className={styles.headerTopRow}>
          <h1 className={styles.title}>Trends</h1>
          {showChildPicker && (
            <button
              type="button"
              className={styles.childButton}
              onClick={() => setChildSheetOpen(true)}
              aria-label="Filter by child"
            >
              {selectedChild ? (
                <>
                  <ChildAvatar
                    avatar={selectedChild.avatar}
                    gender={selectedChild.gender}
                    alt={selectedChild.name}
                    className={styles.childButtonAvatar}
                  />
                  <span className={styles.childButtonLabel}>{selectedChild.name}</span>
                </>
              ) : (
                <>
                  <LuUsers aria-hidden className={styles.childButtonIcon} />
                  <span className={styles.childButtonLabel}>All</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className={styles.segmented} role="tablist" aria-label="Trends view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'illness'}
            className={`${styles.segmentedItem} ${
              activeTab === 'illness' ? styles.segmentedItemActive : ''
            }`}
            onClick={() => setActiveTab('illness')}
          >
            Illness
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'growth'}
            className={`${styles.segmentedItem} ${
              activeTab === 'growth' ? styles.segmentedItemActive : ''
            }`}
            onClick={() => setActiveTab('growth')}
          >
            Growth
          </button>
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className={styles.body}>
          {activeTab === 'illness' ? (
            <IllnessTabBody
              loading={heatLoading}
              error={heatError}
              reload={reloadHeatmap}
              heatmapData={heatmapData}
              children={children}
              effectiveChildId={effectiveChildId}
              year={year}
              onYearChange={setYear}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              selectedDayData={selectedDayData}
            />
          ) : (
            <GrowthTabBody
              loading={growthLoading}
              error={growthError}
              reload={reloadGrowth}
              data={growthData}
              effectiveChildId={effectiveChildId}
              metric={metric}
              onMetricChange={setMetric}
              mode={mode}
              onModeChange={setMode}
            />
          )}
        </div>
      </PullToRefresh>

      {showChildPicker && (
        <MobileSheet
          isOpen={childSheetOpen}
          onClose={() => setChildSheetOpen(false)}
          title="Filter by child"
        >
          <div className={styles.childList}>
            {showAllChildren && (
              <button
                type="button"
                className={`${styles.childListItem} ${
                  effectiveChildId === undefined ? styles.childListItemActive : ''
                }`}
                onClick={() => {
                  setSelectedChildId(undefined);
                  setChildSheetOpen(false);
                }}
              >
                <span className={styles.childListAvatarFallback}>
                  <LuUsers aria-hidden />
                </span>
                <span>All children</span>
              </button>
            )}
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                className={`${styles.childListItem} ${
                  effectiveChildId === child.id ? styles.childListItemActive : ''
                }`}
                onClick={() => {
                  setSelectedChildId(child.id);
                  setChildSheetOpen(false);
                }}
              >
                <ChildAvatar
                  avatar={child.avatar}
                  gender={child.gender}
                  alt={child.name}
                  className={styles.childListAvatar}
                />
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        </MobileSheet>
      )}
    </div>
  );
}

/* ---------- Illness sub-view ---------- */

interface IllnessTabBodyProps {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void> | void;
  heatmapData: ReturnType<typeof useHeatmapData>['heatmapData'];
  children: ReturnType<typeof useHeatmapData>['children'];
  effectiveChildId?: number;
  year: number;
  onYearChange: (y: number) => void;
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
  selectedDayData: ReturnType<typeof useHeatmapData>['heatmapData'] extends infer T
    ? T extends { days: Array<infer D> }
      ? D | null | undefined
      : never
    : never;
}

function IllnessTabBody({
  loading,
  error,
  reload,
  heatmapData,
  children,
  effectiveChildId,
  year,
  onYearChange,
  selectedDate,
  onSelectDate,
  selectedDayData,
}: IllnessTabBodyProps) {
  if (loading) return <LoadingSpinner message="Loading metrics..." />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!heatmapData) return <ErrorMessage message="No data available" />;

  const totalSickDays = effectiveChildId
    ? heatmapData.days.filter((d) => d.count > 0).length
    : heatmapData.days.reduce((sum, day) => sum + Math.round(day.count), 0);
  const uniqueDaysWithIllness = heatmapData.days.filter((d) => d.count > 0).length;
  const maxDay = heatmapData.days.reduce(
    (max, day) => (day.count > max.count ? day : max),
    { date: '', count: 0, children: [] as number[] },
  );
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={styles.statValue}>{uniqueDaysWithIllness}</div>
          <div className={styles.statLabel}>Days with Illness</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statValue}>{totalSickDays}</div>
          <div className={styles.statLabel}>
            {effectiveChildId ? 'Sick Days' : 'Total Sick Days'}
          </div>
        </Card>
        {maxDay.count > 0 && (
          <Card className={styles.statCard}>
            <div className={styles.statValue}>{formatDate(maxDay.date)}</div>
            <div className={styles.statLabel}>Peak Day</div>
          </Card>
        )}
      </div>

      <Card>
        <div className={styles.heatmapHeader}>
          <h2 className={styles.sectionTitle}>Illness Heatmap</h2>
          <div className={styles.yearControls}>
            <button
              type="button"
              className={styles.yearBtn}
              onClick={() => onYearChange(year - 1)}
              disabled={year <= 2020}
              aria-label="Previous year"
            >
              <LuChevronLeft aria-hidden />
            </button>
            <span className={styles.yearLabel}>{year}</span>
            <button
              type="button"
              className={styles.yearBtn}
              onClick={() => onYearChange(year + 1)}
              disabled={year >= currentYear}
              aria-label="Next year"
            >
              <LuChevronRight aria-hidden />
            </button>
          </div>
        </div>
        <div className={styles.heatmapWrap}>
          <Heatmap
            data={heatmapData}
            onDayClick={(d) => onSelectDate(d)}
            isSingleChild={effectiveChildId !== undefined}
            totalChildren={effectiveChildId ? undefined : children.length}
          />
        </div>
      </Card>

      {selectedDate && selectedDayData && (
        <Card title={`Details for ${formatDate(selectedDate)}`}>
          <div className={styles.dayDetails}>
            {effectiveChildId ? (
              <p>
                <strong>Severity:</strong> {Math.round(selectedDayData.count)}/10
              </p>
            ) : (
              <>
                <p>
                  <strong>Children Sick:</strong> {Math.round(selectedDayData.count)}
                </p>
                {selectedDayData.children.length > 0 && (
                  <ul className={styles.childList}>
                    {selectedDayData.children.map((childId: number) => {
                      const child = children.find((c) => c.id === childId);
                      return <li key={childId}>{child?.name || `Child #${childId}`}</li>;
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

/* ---------- Growth sub-view ---------- */

interface GrowthTabBodyProps {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void> | void;
  data: ReturnType<typeof useGrowthData>['data'];
  effectiveChildId?: number;
  metric: GrowthMetric;
  onMetricChange: (m: GrowthMetric) => void;
  mode: GrowthMode;
  onModeChange: (m: GrowthMode) => void;
}

function GrowthTabBody({
  loading,
  error,
  reload,
  data,
  effectiveChildId,
  metric,
  onMetricChange,
  mode,
  onModeChange,
}: GrowthTabBodyProps) {
  if (loading) return <LoadingSpinner message="Loading growth data..." />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const isMultiChild = !effectiveChildId && data.length > 0;
  const metrics: GrowthMetric[] = ['weight', 'height', 'head_circumference', 'bmi'];

  return (
    <>
      <div className={styles.metricChips} role="tablist" aria-label="Growth metric">
        {metrics.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={metric === m}
            className={`${styles.metricChip} ${
              metric === m ? styles.metricChipActive : ''
            }`}
            onClick={() => onMetricChange(m)}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <div className={styles.modeToggle} role="tablist" aria-label="Growth display mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'value'}
          className={`${styles.modeItem} ${mode === 'value' ? styles.modeItemActive : ''}`}
          onClick={() => onModeChange('value')}
        >
          Value
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'percentile'}
          className={`${styles.modeItem} ${
            mode === 'percentile' ? styles.modeItemActive : ''
          }`}
          onClick={() => onModeChange('percentile')}
        >
          Percentile
        </button>
      </div>

      <Card>
        <h3 className={styles.chartTitle}>
          {METRIC_LABELS[metric]}
          {mode === 'percentile' ? ' Percentile' : ''} by Age
        </h3>
        <div className={styles.chartWrap}>
          <SingleMetricGrowthChart
            data={data}
            metric={metric}
            mode={mode}
            isMultiChild={isMultiChild}
            filterChildId={effectiveChildId}
          />
        </div>
      </Card>
    </>
  );
}

export default MobileTrendsView;
