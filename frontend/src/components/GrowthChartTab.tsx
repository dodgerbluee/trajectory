/**
 * Growth Chart Tab Component
 * Displays growth metrics over age for selected children
 */

import { useEffect, useState } from 'react';
import { visitsApi, ApiClientError } from '../lib/api-client';
import type { GrowthDataPoint } from '../types/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import Card from './Card';
import SingleMetricGrowthChart from './SingleMetricGrowthChart';

interface GrowthChartTabProps {
  filterChildId?: number;
}

function GrowthChartTab({ filterChildId }: GrowthChartTabProps) {
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Metric visibility toggles
  const [showWeight, setShowWeight] = useState(true);
  const [showHeight, setShowHeight] = useState(true);
  const [showHeadCirc, setShowHeadCirc] = useState(true);
  const [showBMI, setShowBMI] = useState(true);

  useEffect(() => {
    loadGrowthData();
  }, [filterChildId]);

  const loadGrowthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await visitsApi.getGrowthData({
        child_id: filterChildId,
      });
      
      setGrowthData(response.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load growth data');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading growth data..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadGrowthData} />;
  }

  const isMultiChild = !filterChildId && growthData.length > 0;

  return (
    <Card>
      <div className="growth-chart-body">
        {/* Metric Toggle Controls */}
        <div className="growth-chart-section">
          <h3 className="growth-chart-section-title">Metric Selection</h3>
          <div className="growth-metric-toggles">
            <label className="growth-metric-toggle">
              <input
                type="checkbox"
                checked={showWeight}
                onChange={(e) => setShowWeight(e.target.checked)}
              />
              <span className="growth-metric-label">
                <span className="growth-metric-color" style={{ backgroundColor: '#3b82f6' }}></span>
                Weight
              </span>
            </label>
            <label className="growth-metric-toggle">
              <input
                type="checkbox"
                checked={showHeight}
                onChange={(e) => setShowHeight(e.target.checked)}
              />
              <span className="growth-metric-label">
                <span className="growth-metric-color" style={{ backgroundColor: '#10b981' }}></span>
                Height
              </span>
            </label>
            <label className="growth-metric-toggle">
              <input
                type="checkbox"
                checked={showHeadCirc}
                onChange={(e) => setShowHeadCirc(e.target.checked)}
              />
              <span className="growth-metric-label">
                <span className="growth-metric-color" style={{ backgroundColor: '#f59e0b' }}></span>
                Head Circumference
              </span>
            </label>
            <label className="growth-metric-toggle">
              <input
                type="checkbox"
                checked={showBMI}
                onChange={(e) => setShowBMI(e.target.checked)}
              />
              <span className="growth-metric-label">
                <span className="growth-metric-color" style={{ backgroundColor: '#ef4444' }}></span>
                BMI
              </span>
            </label>
          </div>
        </div>

        {/* Growth Charts - Value and Percentile for each metric */}
        <div className="growth-chart-section">
          <h3 className="growth-chart-section-title">Growth Charts</h3>
          <div className="growth-charts-grid">
            {showWeight && (
              <>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">Weight Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'Weight plotted by age at time of wellness visit.'
                      : 'Weight for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="weight"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">Weight Percentiles Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'Weight percentile plotted by age at time of wellness visit.'
                      : 'Weight percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="weight"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}

            {showHeight && (
              <>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">Height Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'Height plotted by age at time of wellness visit.'
                      : 'Height for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="height"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">Height Percentiles Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'Height percentile plotted by age at time of wellness visit.'
                      : 'Height percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="height"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}

            {showHeadCirc && (
              <>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">Head Circumference Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'Head circumference plotted by age at time of wellness visit.'
                      : 'Head circumference for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="head_circumference"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">Head Circumference Percentiles Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'Head circumference percentile plotted by age at time of wellness visit.'
                      : 'Head circumference percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="head_circumference"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}

            {showBMI && (
              <>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">BMI Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'BMI plotted by age at time of wellness visit.'
                      : 'BMI for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="bmi"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className="growth-chart-item">
                  <h4 className="growth-chart-item-title">BMI Percentiles Over Time (by Age)</h4>
                  <p className="growth-chart-description">
                    {filterChildId
                      ? 'BMI percentile plotted by age at time of wellness visit.'
                      : 'BMI percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={growthData}
                    metric="bmi"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}

            {!showWeight && !showHeight && !showHeadCirc && !showBMI && (
              <div className="chart-empty">
                <p>Select at least one metric above to view growth charts.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GrowthChartTab;
