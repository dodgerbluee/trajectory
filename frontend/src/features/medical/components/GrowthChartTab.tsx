/**
 * Growth Chart Tab Component
 * Displays growth metrics over age for selected children
 */

import { useEffect, useState } from 'react';
import { visitsApi, ApiClientError } from '@lib/api-client';
import type { GrowthDataPoint } from '@shared/types/api';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import SingleMetricGrowthChart from './SingleMetricGrowthChart';
import styles from './GrowthChartTab.module.css';

interface GrowthChartTabProps {
  filterChildId?: number;
}

function GrowthChartTab({ filterChildId }: GrowthChartTabProps) {
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filteredGrowthData = growthData;

  return (
    <Card>
      <div className={styles.body}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Growth Charts</h3>
          <div className={styles.grid}>
            {(
              <>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Weight Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'Weight plotted by age at time of wellness visit.'
                      : 'Weight for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="weight"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Weight Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'Weight percentile plotted by age at time of wellness visit.'
                      : 'Weight percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="weight"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}

            {(
              <>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Height Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'Height plotted by age at time of wellness visit.'
                      : 'Height for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="height"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Height Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'Height percentile plotted by age at time of wellness visit.'
                      : 'Height percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="height"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}

            {(
              <>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Head Circumference Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'Head circumference plotted by age at time of wellness visit.'
                      : 'Head circumference for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="head_circumference"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Head Circumference Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'Head circumference percentile plotted by age at time of wellness visit.'
                      : 'Head circumference percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="head_circumference"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}

            {(
              <>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>BMI Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'BMI plotted by age at time of wellness visit.'
                      : 'BMI for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="bmi"
                    mode="value"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>BMI Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterChildId
                      ? 'BMI percentile plotted by age at time of wellness visit.'
                      : 'BMI percentiles for all children plotted by age. Each child is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="bmi"
                    mode="percentile"
                    isMultiChild={isMultiChild}
                    filterChildId={filterChildId}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GrowthChartTab;
