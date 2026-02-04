import type { Child } from '@shared/types/api';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { TrendsSidebar, MetricsView } from '@features/medical';

type MetricsActiveTab = 'illness' | 'growth';

type Props = {
  child: Child;
  metricsActiveTab: MetricsActiveTab;
  onChangeMetricsActiveTab: (t: MetricsActiveTab) => void;
  metricsYear: number;
  onChangeMetricsYear: (year: number) => void;
};

export default function TrendsTab({
  child,
  metricsActiveTab,
  onChangeMetricsActiveTab,
  metricsYear,
  onChangeMetricsYear,
}: Props) {
  return (
    <div className={visitsLayout.pageLayout}>
      <TrendsSidebar
        activeTab={metricsActiveTab}
        onChangeTab={(t) => onChangeMetricsActiveTab(t)}
        childrenList={[child]}
        selectedChildId={child.id}
        onSelectChild={() => {}}
        showChildFilter={false}
        showIllnessTab={true}
        showGrowthTab={true}
      />
      <main className={visitsLayout.main}>
        <MetricsView
          activeTab={metricsActiveTab}
          onActiveTabChange={(t) => onChangeMetricsActiveTab(t)}
          selectedYear={metricsYear}
          onSelectedYearChange={(y) => onChangeMetricsYear(y)}
          filterChildId={child.id}
          onFilterChildChange={() => {}}
        />
      </main>
    </div>
  );
}
