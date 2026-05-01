import { useState } from 'react';
import { PersonAvatar } from '@features/people';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Heatmap from './Heatmap';
import GrowthChartTab from './GrowthChartTab';
import { useHeatmapData } from '../hooks';
import { formatDate } from '@lib/date-utils';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import styles from './MetricsView.module.css';

interface MetricsViewProps {
  activeTab?: 'illness' | 'growth';
  onActiveTabChange?: (tab: 'illness' | 'growth') => void;
  selectedYear?: number;
  onSelectedYearChange?: (year: number) => void;
  filterPersonId?: number | undefined;
  onFilterPersonChange?: (id?: number) => void;
}

function MetricsView({
  activeTab: activeTabProp,
  selectedYear: selectedYearProp,
  onSelectedYearChange,
  filterPersonId: filterPersonIdProp,
}: MetricsViewProps) {
  const [internalYear] = useState(new Date().getFullYear());
  const [internalFilterPersonId] = useState<number | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [internalActiveTab] = useState<'illness' | 'growth'>('illness');

  const selectedYear = selectedYearProp ?? internalYear;
  const filterPersonId = filterPersonIdProp ?? internalFilterPersonId;
  const activeTab = activeTabProp ?? internalActiveTab;

  const { heatmapData, people, loading, error, reload } = useHeatmapData(
    selectedYear,
    filterPersonId,
  );

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleYearChange = (delta: number) => {
    const next = selectedYear + delta;
    if (onSelectedYearChange) onSelectedYearChange(next);
  };


  if (loading) {
    return <LoadingSpinner message="Loading metrics..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  if (!heatmapData) {
    return <ErrorMessage message="No data available" />;
  }

  const selectedDayData = selectedDate 
    ? heatmapData.days.find(d => d.date === selectedDate)
    : null;

  // For single person: count days with illness (severity > 0)
  // For all people: sum up all sick days
  const totalSickDays = filterPersonId
    ? heatmapData.days.filter(d => d.count > 0).length
    : heatmapData.days.reduce((sum, day) => sum + Math.round(day.count), 0);
  const uniqueDaysWithIllness = heatmapData.days.filter(d => d.count > 0).length;
  const maxDay = heatmapData.days.reduce((max, day) => 
    day.count > max.count ? day : max, 
    { date: '', count: 0, children: [] }
  );

  return (
    <>

      {/* Summary Stats (only for Illness view) */}
      {activeTab !== 'growth' && (
        <div className={styles.summary}>
        <Card className={`${styles.summaryCard} ${styles.summaryCardAvatars}`}>
          <div className={styles.summaryAvatars}>
            {filterPersonId ? (
              (() => {
                const person = people.find((c) => c.id === filterPersonId);
                if (!person) return null;
                return (
                  <PersonAvatar
                    avatar={person.avatar}
                    gender={person.gender}
                    alt={person.name}
                    className={styles.summaryAvatarSingle}
                  />
                );
              })()
            ) : (
              people.slice(0, 6).map((person) => (
                <PersonAvatar
                  key={person.id}
                  avatar={person.avatar}
                  gender={person.gender}
                  alt={person.name}
                  className={styles.summaryAvatarItem}
                />
              ))
            )}
          </div>
          <div className={styles.summaryLabel}>
            {filterPersonId 
              ? people.find(c => c.id === filterPersonId)?.name || 'Person'
              : 'All People'}
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.summaryValue}>{uniqueDaysWithIllness}</div>
          <div className={styles.summaryLabel}>Days with Illness</div>
        </Card>
        <Card className={styles.summaryCard}>
          <div className={styles.summaryValue}>{totalSickDays}</div>
          <div className={styles.summaryLabel}>Total Sick Days</div>
        </Card>
        {!filterPersonId && (
          <Card className={styles.summaryCard}>
            <div className={styles.summaryValue}>{Math.round(heatmapData.maxCount)}</div>
            <div className={styles.summaryLabel}>Max Sick People/Day</div>
          </Card>
        )}
        {filterPersonId && (
          <Card className={styles.summaryCard}>
            <div className={styles.summaryValue}>{Math.round(heatmapData.maxCount)}</div>
            <div className={styles.summaryLabel}>Max Severity</div>
          </Card>
        )}
        {maxDay.count > 0 && (
          <Card className={styles.summaryCard}>
            <div className={styles.summaryValue}>{formatDate(maxDay.date)}</div>
            <div className={styles.summaryLabel}>Peak Illness Date</div>
          </Card>
        )}
        </div>
      )}

      {/* Content area */}
      {activeTab === 'illness' ? (
        <>
          <Card>
            <div className={styles.headerRow}>
              <h2 className={styles.sectionTitle}>Illness Heatmap</h2>
              <div className={styles.yearControls}>
                <Button
                  variant="tertiary"
                  onClick={() => handleYearChange(-1)}
                  disabled={selectedYear <= 2020}
                  aria-label="Previous year"
                >
                  <HiChevronLeft className={styles.btnIcon} aria-hidden />
                </Button>
                <div className={styles.yearLabel}>{selectedYear}</div>
                <Button
                  variant="tertiary"
                  onClick={() => handleYearChange(1)}
                  disabled={selectedYear >= new Date().getFullYear()}
                  aria-label="Next year"
                >
                  <HiChevronRight className={styles.btnIcon} aria-hidden />
                </Button>
              </div>
            </div>
            <p className={styles.heatmapDescription}>
              {filterPersonId
                ? 'Each square represents a day. Darker colors indicate higher illness severity (1-10). Click on a day to see details.'
                : 'Each square represents a day. Darker colors indicate more people were sick on that day. Click on a day to see details.'}
            </p>
            <Heatmap 
              data={heatmapData} 
              onDayClick={handleDayClick}
              isSinglePerson={filterPersonId !== undefined}
              totalPeople={filterPersonId ? undefined : people.length}
            />
          </Card>

          {selectedDate && selectedDayData && (
            <Card title={`Details for ${formatDate(selectedDate)}`}>
              <div className={styles.dayDetails}>
                {filterPersonId ? (
                  <p><strong>Severity:</strong> {Math.round(selectedDayData.count)}/10</p>
                ) : (
                  <>
                    <p><strong>People Sick:</strong> {Math.round(selectedDayData.count)}</p>
                    {selectedDayData.children.length > 0 && (
                      <div>
                        <strong>Affected People:</strong>
                        <ul>
                          {selectedDayData.children.map((personId: number) => {
                            const person = people.find(c => c.id === personId);
                            return <li key={personId}>{person?.name || `Person #${personId}`}</li>;
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <GrowthChartTab filterPersonId={filterPersonId} />
      )}
    </>
  );
}

export default MetricsView;
