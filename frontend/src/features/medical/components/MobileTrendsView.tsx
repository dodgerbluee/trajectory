/**
 * MobileTrendsView – mobile-first trends/metrics screen.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ Sticky header                            │
 *   │   Title                       [Person ▾]  │
 *   │   [ Illness | Growth ]   ← segmented     │
 *   ├──────────────────────────────────────────┤
 *   │ (illness) summary cards + heatmap + day  │
 *   │ (growth)  metric chip-row                │
 *   │           [ Value | Percentile ] toggle  │
 *   │           single chart (~280px tall)     │
 *   └──────────────────────────────────────────┘
 *
 * - Person picker opens MobileSheet listing people + "All people".
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
import { PersonAvatar } from '@features/people';
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
  /** Optional preselected person (e.g. PersonDetailPage). When set, person filter is hidden. */
  fixedPersonId?: number;
  /** Show "All people" option in the person picker (default true unless fixedPersonId). */
  allowAllPeople?: boolean;
}

function MobileTrendsView({ fixedPersonId, allowAllPeople }: MobileTrendsViewProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>('illness');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedPersonId, setSelectedPersonId] = useState<number | undefined>(fixedPersonId);
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const [mode, setMode] = useState<GrowthMode>('value');

  const effectivePersonId = fixedPersonId ?? selectedPersonId;
  const showPersonPicker = !fixedPersonId;
  const showAllPeople = allowAllPeople !== false && !fixedPersonId;

  const {
    heatmapData,
    people,
    loading: heatLoading,
    error: heatError,
    reload: reloadHeatmap,
  } = useHeatmapData(year, effectivePersonId);

  const {
    data: growthData,
    loading: growthLoading,
    error: growthError,
    reload: reloadGrowth,
  } = useGrowthData(effectivePersonId);

  const handleRefresh = async () => {
    await Promise.all([reloadHeatmap(), reloadGrowth()]);
  };

  const selectedPerson = effectivePersonId
    ? people.find((c) => c.id === effectivePersonId)
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
          {showPersonPicker && (
            <button
              type="button"
              className={styles.childButton}
              onClick={() => setPersonSheetOpen(true)}
              aria-label="Filter by person"
            >
              {selectedPerson ? (
                <>
                  <PersonAvatar
                    avatar={selectedPerson.avatar}
                    gender={selectedPerson.gender}
                    alt={selectedPerson.name}
                    className={styles.childButtonAvatar}
                  />
                  <span className={styles.childButtonLabel}>{selectedPerson.name}</span>
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
              people={people}
              effectivePersonId={effectivePersonId}
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
              effectivePersonId={effectivePersonId}
              metric={metric}
              onMetricChange={setMetric}
              mode={mode}
              onModeChange={setMode}
            />
          )}
        </div>
      </PullToRefresh>

      {showPersonPicker && (
        <MobileSheet
          isOpen={personSheetOpen}
          onClose={() => setPersonSheetOpen(false)}
          title="Filter by person"
        >
          <div className={styles.childList}>
            {showAllPeople && (
              <button
                type="button"
                className={`${styles.childListItem} ${
                  effectivePersonId === undefined ? styles.childListItemActive : ''
                }`}
                onClick={() => {
                  setSelectedPersonId(undefined);
                  setPersonSheetOpen(false);
                }}
              >
                <span className={styles.childListAvatarFallback}>
                  <LuUsers aria-hidden />
                </span>
                <span>All people</span>
              </button>
            )}
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                className={`${styles.childListItem} ${
                  effectivePersonId === person.id ? styles.childListItemActive : ''
                }`}
                onClick={() => {
                  setSelectedPersonId(person.id);
                  setPersonSheetOpen(false);
                }}
              >
                <PersonAvatar
                  avatar={person.avatar}
                  gender={person.gender}
                  alt={person.name}
                  className={styles.childListAvatar}
                />
                <span>{person.name}</span>
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
  people: ReturnType<typeof useHeatmapData>['people'];
  effectivePersonId?: number;
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
  people,
  effectivePersonId,
  year,
  onYearChange,
  selectedDate,
  onSelectDate,
  selectedDayData,
}: IllnessTabBodyProps) {
  if (loading) return <LoadingSpinner message="Loading metrics..." />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!heatmapData) return <ErrorMessage message="No data available" />;

  const totalSickDays = effectivePersonId
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
            {effectivePersonId ? 'Sick Days' : 'Total Sick Days'}
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
            isSinglePerson={effectivePersonId !== undefined}
            totalPeople={effectivePersonId ? undefined : people.length}
          />
        </div>
      </Card>

      {selectedDate && selectedDayData && (
        <Card title={`Details for ${formatDate(selectedDate)}`}>
          <div className={styles.dayDetails}>
            {effectivePersonId ? (
              <p>
                <strong>Severity:</strong> {Math.round(selectedDayData.count)}/10
              </p>
            ) : (
              <>
                <p>
                  <strong>People Sick:</strong> {Math.round(selectedDayData.count)}
                </p>
                {selectedDayData.children.length > 0 && (
                  <ul className={styles.childList}>
                    {selectedDayData.children.map((personId: number) => {
                      const person = people.find((c) => c.id === personId);
                      return <li key={personId}>{person?.name || `Person #${personId}`}</li>;
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
  effectivePersonId?: number;
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
  effectivePersonId,
  metric,
  onMetricChange,
  mode,
  onModeChange,
}: GrowthTabBodyProps) {
  if (loading) return <LoadingSpinner message="Loading growth data..." />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const isMultiPerson = !effectivePersonId && data.length > 0;
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
            isMultiPerson={isMultiPerson}
            filterPersonId={effectivePersonId}
          />
        </div>
      </Card>
    </>
  );
}

export default MobileTrendsView;
