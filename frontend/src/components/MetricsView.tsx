import { useEffect, useState } from 'react';
import { illnessesApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { HeatmapData, Child } from '../types/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import Card from './Card';
import Button from './Button';
import Heatmap from './Heatmap';
import ChildPills from './ChildPills';
// Tabs removed; using inline view toggle in controls
import GrowthChartTab from './GrowthChartTab';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { formatDate } from '../lib/date-utils';

function MetricsView() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'illness' | 'growth'>('illness');

  useEffect(() => {
    loadData();
  }, [selectedYear, filterChildId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [heatmapResponse, childrenResponse] = await Promise.all([
        illnessesApi.getHeatmapData({
          year: selectedYear,
          child_id: filterChildId,
        }),
        childrenApi.getAll(),
      ]);

      setHeatmapData(heatmapResponse.data);
      setChildren(childrenResponse.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load metrics data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleYearChange = (delta: number) => {
    setSelectedYear(prev => prev + delta);
  };

  if (loading) {
    return <LoadingSpinner message="Loading metrics..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  if (!heatmapData) {
    return <ErrorMessage message="No data available" />;
  }

  const selectedDayData = selectedDate 
    ? heatmapData.days.find(d => d.date === selectedDate)
    : null;

  // For single child: count days with illness (severity > 0)
  // For all children: sum up all sick days
  const totalSickDays = filterChildId
    ? heatmapData.days.filter(d => d.count > 0).length
    : heatmapData.days.reduce((sum, day) => sum + Math.round(day.count), 0);
  const uniqueDaysWithIllness = heatmapData.days.filter(d => d.count > 0).length;
  const maxDay = heatmapData.days.reduce((max, day) => 
    day.count > max.count ? day : max, 
    { date: '', count: 0, children: [] }
  );

  return (
    <>
      <Card className="metrics-controls">
        <div className="metrics-controls-inline">
          {activeTab !== 'growth' && (
            <>
              <div className="metrics-year-section">
                <span className="metrics-control-label">Year</span>
                <div className="year-selector">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleYearChange(-1)}
                    disabled={selectedYear <= 2020}
                  >
                    <HiChevronLeft className="btn-icon" />
                  </Button>
                  <span className="year-display">{selectedYear}</span>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleYearChange(1)}
                    disabled={selectedYear >= new Date().getFullYear()}
                  >
                    <HiChevronRight className="btn-icon" />
                  </Button>
                </div>
              </div>

              <div className="metrics-controls-divider"></div>
            </>
          )}
          
          <div className="metrics-filter-section">
            <span className="metrics-control-label">Filter</span>
            <ChildPills
              childrenList={children}
              selectedChildId={filterChildId}
              onSelect={(id) => setFilterChildId(id)}
            />
          </div>

          <div className="metrics-view-toggle" style={{ marginLeft: 'auto' }}>
            <Button
              variant={activeTab === 'illness' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('illness')}
            >
              Illness
            </Button>
            <Button
              variant={activeTab === 'growth' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('growth')}
              style={{ marginLeft: 8 }}
            >
              Growth
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats (only for Illness view) */}
      {activeTab !== 'growth' && (
        <div className="metrics-summary">
        <Card className="summary-card summary-card-avatars">
          <div className="summary-avatars">
            {filterChildId ? (
              (() => {
                const child = children.find(c => c.id === filterChildId);
                if (!child) return null;
                const avatarUrl = child.avatar
                  ? childrenApi.getAvatarUrl(child.avatar)
                  : childrenApi.getDefaultAvatarUrl(child.gender);
                return (
                  <img
                    src={avatarUrl}
                    alt={child.name}
                    className="summary-avatar-single"
                  />
                );
              })()
            ) : (
              children.slice(0, 6).map((child) => {
                const avatarUrl = child.avatar
                  ? childrenApi.getAvatarUrl(child.avatar)
                  : childrenApi.getDefaultAvatarUrl(child.gender);
                return (
                  <img
                    key={child.id}
                    src={avatarUrl}
                    alt={child.name}
                    className="summary-avatar-item"
                    title={child.name}
                  />
                );
              })
            )}
          </div>
          <div className="summary-label">
            {filterChildId 
              ? children.find(c => c.id === filterChildId)?.name || 'Child'
              : 'All Children'}
          </div>
        </Card>

        <Card className="summary-card">
          <div className="summary-value">{uniqueDaysWithIllness}</div>
          <div className="summary-label">Days with Illness</div>
        </Card>
        <Card className="summary-card">
          <div className="summary-value">{totalSickDays}</div>
          <div className="summary-label">Total Sick Days</div>
        </Card>
        {!filterChildId && (
          <Card className="summary-card">
            <div className="summary-value">{Math.round(heatmapData.maxCount)}</div>
            <div className="summary-label">Max Sick Children/Day</div>
          </Card>
        )}
        {filterChildId && (
          <Card className="summary-card">
            <div className="summary-value">{Math.round(heatmapData.maxCount)}</div>
            <div className="summary-label">Max Severity</div>
          </Card>
        )}
        {maxDay.count > 0 && (
          <Card className="summary-card">
            <div className="summary-value">{formatDate(maxDay.date)}</div>
            <div className="summary-label">Peak Illness Date</div>
          </Card>
        )}
        </div>
      )}

      {/* Content area */}
      {activeTab === 'illness' ? (
        <>
          <Card title={`Illness Heatmap - ${selectedYear}`}>
            <p className="heatmap-description">
              {filterChildId 
                ? 'Each square represents a day. Darker colors indicate higher illness severity (1-10). Click on a day to see details.'
                : 'Each square represents a day. Darker colors indicate more children were sick on that day. Click on a day to see details.'}
            </p>
            <Heatmap 
              data={heatmapData} 
              onDayClick={handleDayClick}
              isSingleChild={filterChildId !== undefined}
            />
          </Card>

          {selectedDate && selectedDayData && (
            <Card title={`Details for ${formatDate(selectedDate)}`}>
              <div className="day-details">
                {filterChildId ? (
                  <p><strong>Severity:</strong> {Math.round(selectedDayData.count)}/10</p>
                ) : (
                  <>
                    <p><strong>Children Sick:</strong> {Math.round(selectedDayData.count)}</p>
                    {selectedDayData.children.length > 0 && (
                      <div>
                        <strong>Affected Children:</strong>
                        <ul>
                          {selectedDayData.children.map(childId => {
                            const child = children.find(c => c.id === childId);
                            return <li key={childId}>{child?.name || `Child #${childId}`}</li>;
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
        <GrowthChartTab filterChildId={filterChildId} />
      )}
    </>
  );
}

export default MetricsView;
