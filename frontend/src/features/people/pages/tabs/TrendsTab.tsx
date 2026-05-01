import type { Person } from '@shared/types/api';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { TrendsSidebar, MetricsView, MobileTrendsView } from '@features/medical';
import { useIsMobile } from '@shared/hooks';

type MetricsActiveTab = 'illness' | 'growth';

type Props = {
  person: Person;
  metricsActiveTab: MetricsActiveTab;
  onChangeMetricsActiveTab: (t: MetricsActiveTab) => void;
  metricsYear: number;
  onChangeMetricsYear: (year: number) => void;
};

export default function TrendsTab({
  person,
  metricsActiveTab,
  onChangeMetricsActiveTab,
  metricsYear,
  onChangeMetricsYear,
}: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileTrendsView fixedPersonId={person.id} />;
  }

  return (
    <div className={visitsLayout.pageLayout}>
      <TrendsSidebar
        activeTab={metricsActiveTab}
        onChangeTab={(t) => onChangeMetricsActiveTab(t)}
        peopleList={[person]}
        selectedPersonId={person.id}
        onSelectPerson={() => {}}
        showPersonFilter={false}
        showIllnessTab={true}
        showGrowthTab={true}
      />
      <main className={visitsLayout.main}>
        <MetricsView
          activeTab={metricsActiveTab}
          onActiveTabChange={(t) => onChangeMetricsActiveTab(t)}
          selectedYear={metricsYear}
          onSelectedYearChange={(y) => onChangeMetricsYear(y)}
          filterPersonId={person.id}
          onFilterPersonChange={() => {}}
        />
      </main>
    </div>
  );
}
