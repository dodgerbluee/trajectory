import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { childrenApi, visitsApi, ApiClientError } from '../lib/api-client';
import {
  transformVisitsToChartData,
  transformVisitsToPercentileData,
  transformVisitsToCombinedPercentileData,
  calculateGrowthVelocityFromVisits,
  transformVisitsToMarkers,
  getLatestMeasurementsFromVisits,
} from '../lib/chart-utils';
import type { Child, Visit } from '../types/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import {
  WeightValueChart,
  HeightValueChart,
  HeadCircumferenceValueChart,
  WeightPercentileChart,
  HeightPercentileChart,
  HeadPercentileChart,
  CombinedPercentileChart,
  GrowthByAgeChart,
  GrowthVelocityChart,
  GrowthWithEventsChart,
  LatestGrowthSnapshot,
  VisitFrequencyChart,
} from '../components/charts';

function GrowthChartsPage() {
  const { id } = useParams<{ id: string }>();
  
  const [child, setChild] = useState<Child | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      
      const [childResponse, visitsResponse] = await Promise.all([
        childrenApi.getById(parseInt(id)),
        visitsApi.getAll({ child_id: parseInt(id) }),
      ]);
      
      setChild(childResponse.data);
      setVisits(visitsResponse.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading growth charts..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  if (!child) {
    return <ErrorMessage message="Child not found" />;
  }

  // Transform data from visits
  const weightData = transformVisitsToChartData(visits, 'weight', child.date_of_birth);
  const heightData = transformVisitsToChartData(visits, 'height', child.date_of_birth);
  const headCircumferenceData = transformVisitsToChartData(visits, 'head_circumference', child.date_of_birth);

  const weightPercentileData = transformVisitsToPercentileData(visits, 'weight');
  const heightPercentileData = transformVisitsToPercentileData(visits, 'height');
  const headPercentileData = transformVisitsToPercentileData(visits, 'head_circumference');

  const combinedPercentileData = transformVisitsToCombinedPercentileData(visits);
  const velocityData = calculateGrowthVelocityFromVisits(visits);
  const eventMarkers = transformVisitsToMarkers(visits);
  const latestMeasurements = getLatestMeasurementsFromVisits(visits);

  const wellnessVisits = visits.filter((v) => v.visit_type === 'wellness');
  const hasAnyData = wellnessVisits.length > 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to={`/children/${id}`} className="breadcrumb">← Back to {child.name}</Link>
          <h1>Growth & Medical Visualization - {child.name}</h1>
        </div>
      </div>

      {!hasAnyData ? (
        <Card>
          <p className="empty-state">
            No wellness visits with measurements recorded yet. 
            <Link to={`/children/${id}/visits`}> Add a wellness visit</Link> to see growth charts.
          </p>
        </Card>
      ) : (
        <div className="charts-dashboard">
          {/* 11. Latest Snapshot */}
          <Card>
            <LatestGrowthSnapshot latestMeasurements={latestMeasurements} />
          </Card>

          {/* Section: Measurements */}
          <div className="chart-section">
            <h2 className="section-heading">📊 Growth Measurements</h2>
            <div className="chart-grid">
              <Card>
                <WeightValueChart data={weightData} />
              </Card>
              <Card>
                <HeightValueChart data={heightData} />
              </Card>
              <Card>
                <HeadCircumferenceValueChart data={headCircumferenceData} />
              </Card>
            </div>
          </div>

          {/* Section: Percentiles */}
          <div className="chart-section">
            <h2 className="section-heading">📈 Percentile Tracking</h2>
            <div className="chart-grid">
              <Card>
                <WeightPercentileChart data={weightPercentileData} />
              </Card>
              <Card>
                <HeightPercentileChart data={heightPercentileData} />
              </Card>
              <Card>
                <HeadPercentileChart data={headPercentileData} />
              </Card>
            </div>
            <Card>
              <CombinedPercentileChart data={combinedPercentileData} />
            </Card>
          </div>

          {/* Section: Growth by Age */}
          <div className="chart-section">
            <h2 className="section-heading">🎂 Growth by Age (Months)</h2>
            <div className="chart-grid">
              <Card>
                <GrowthByAgeChart data={weightData} metric="weight" />
              </Card>
              <Card>
                <GrowthByAgeChart data={heightData} metric="height" />
              </Card>
              <Card>
                <GrowthByAgeChart data={headCircumferenceData} metric="head_circumference" />
              </Card>
            </div>
          </div>

          {/* Section: Velocity */}
          <div className="chart-section">
            <h2 className="section-heading">⚡ Growth Velocity</h2>
            <Card>
              <GrowthVelocityChart data={velocityData} />
            </Card>
          </div>

          {/* Section: Medical Events Correlation */}
          <div className="chart-section">
            <h2 className="section-heading">🏥 Growth with Medical Events</h2>
            <div className="chart-grid">
              <Card>
                <GrowthWithEventsChart data={weightData} events={eventMarkers} metric="weight" />
              </Card>
              <Card>
                <GrowthWithEventsChart data={heightData} events={eventMarkers} metric="height" />
              </Card>
              <Card>
                <GrowthWithEventsChart data={headCircumferenceData} events={eventMarkers} metric="head_circumference" />
              </Card>
            </div>
          </div>

          {/* Section: Visit Frequency */}
          <div className="chart-section">
            <h2 className="section-heading">🗓️ Medical Visits</h2>
            <Card>
              <VisitFrequencyChart events={eventMarkers} />
            </Card>
          </div>

          {/* Info Card */}
          <Card className="chart-info">
            <h3>About This Visualization System</h3>
            <ul>
              <li><strong>{wellnessVisits.length} wellness visits</strong> with measurements recorded over time</li>
              <li><strong>{visits.filter(v => v.visit_type === 'sick').length} sick visits</strong> tracked</li>
              <li>Growth data normalized by age in months for milestone tracking</li>
              <li>Percentile trends show consistency or shifts relative to norms</li>
              <li>Velocity charts highlight rate of change, not just absolute values</li>
              <li>Medical event markers correlate growth with doctor visits and illness periods</li>
              <li>🏥 = Wellness visit, Shaded areas = Illness periods</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

export default GrowthChartsPage;
