/**
 * Growth Chart Tab Component
 * Displays growth metrics over age for selected people
 */

import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import SingleMetricGrowthChart from './SingleMetricGrowthChart';
import { useGrowthData } from '../hooks';
import styles from './GrowthChartTab.module.css';

interface GrowthChartTabProps {
  filterPersonId?: number;
}

function GrowthChartTab({ filterPersonId }: GrowthChartTabProps) {
  const { data: growthData, loading, error, reload } = useGrowthData(filterPersonId);

  if (loading) {
    return <LoadingSpinner message="Loading growth data..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  const isMultiPerson = !filterPersonId && growthData.length > 0;
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
                    {filterPersonId
                      ? 'Weight plotted by age at time of wellness visit.'
                      : 'Weight for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="weight"
                    mode="value"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Weight Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterPersonId
                      ? 'Weight percentile plotted by age at time of wellness visit.'
                      : 'Weight percentiles for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="weight"
                    mode="percentile"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
                  />
                </div>
              </>
            )}

            {(
              <>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Height Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterPersonId
                      ? 'Height plotted by age at time of wellness visit.'
                      : 'Height for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="height"
                    mode="value"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Height Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterPersonId
                      ? 'Height percentile plotted by age at time of wellness visit.'
                      : 'Height percentiles for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="height"
                    mode="percentile"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
                  />
                </div>
              </>
            )}

            {(
              <>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Head Circumference Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterPersonId
                      ? 'Head circumference plotted by age at time of wellness visit.'
                      : 'Head circumference for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="head_circumference"
                    mode="value"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>Head Circumference Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterPersonId
                      ? 'Head circumference percentile plotted by age at time of wellness visit.'
                      : 'Head circumference percentiles for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="head_circumference"
                    mode="percentile"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
                  />
                </div>
              </>
            )}

            {(
              <>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>BMI Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterPersonId
                      ? 'BMI plotted by age at time of wellness visit.'
                      : 'BMI for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="bmi"
                    mode="value"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
                  />
                </div>
                <div className={styles.item}>
                  <h4 className={styles.itemTitle}>BMI Percentiles Over Time (by Age)</h4>
                  <p className={styles.description}>
                    {filterPersonId
                      ? 'BMI percentile plotted by age at time of wellness visit.'
                      : 'BMI percentiles for all people plotted by age. Each person is shown with a different color.'}
                  </p>
                  <SingleMetricGrowthChart
                    data={filteredGrowthData}
                    metric="bmi"
                    mode="percentile"
                    isMultiPerson={isMultiPerson}
                    filterPersonId={filterPersonId}
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
