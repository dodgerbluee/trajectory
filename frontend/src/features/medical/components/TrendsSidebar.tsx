import { GoGraph } from 'react-icons/go';
import { LuPill } from 'react-icons/lu';
import { PersonSelector } from '@features/people';
import { VisitStats } from '@features/visits';
import type { Person } from '@shared/types/api';
import layout from '@shared/styles/VisitsLayout.module.css';

interface Props {
  activeTab: 'illness' | 'growth';
  onChangeTab: (tab: 'illness' | 'growth') => void;
  peopleList: Person[];
  selectedPersonId?: number | undefined;
  onSelectPerson: (id?: number) => void;
  /** When false, hide the Person Filter section (e.g. on person detail page where context is already one person). Default true. */
  showPersonFilter?: boolean;
  /** When false, hide the Illness tab (e.g. person has no illness data). Default true. */
  showIllnessTab?: boolean;
  /** When false, hide the Growth tab (e.g. person has no growth data). Default true. */
  showGrowthTab?: boolean;
}

export default function TrendsSidebar({
  activeTab,
  onChangeTab,
  peopleList,
  selectedPersonId,
  onSelectPerson,
  showPersonFilter = true,
  showIllnessTab = true,
  showGrowthTab = true,
}: Props) {
  const stats = [
    ...(showIllnessTab
      ? [
          {
            label: 'Illness',
            value: 0,
            icon: LuPill,
            color: 'red' as const,
            onClick: () => onChangeTab('illness'),
            active: activeTab === 'illness',
          },
        ]
      : []),
    ...(showGrowthTab
      ? [
          {
            label: 'Growth',
            value: 0,
            icon: GoGraph,
            color: 'blue' as const,
            onClick: () => onChangeTab('growth'),
            active: activeTab === 'growth',
          },
        ]
      : []),
  ];

  return (
    <aside className={layout.sidebar}>
      <div className={layout.sidebarInner}>
        <header>
          <div className={layout.sidebarBrand}>Filters</div>
        </header>

        <div className={layout.sidebarDivider} />

        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.length > 0 && (
              <VisitStats
                stats={stats}
                vertical
                showValues={false}
              />
            )}
          </div>
        </div>

        {showPersonFilter && (
          <div className={layout.childSidebarSection}>
            <h4 className={layout.sidebarSectionTitle}>Person Filter</h4>
            <PersonSelector peopleList={peopleList} selectedPersonId={selectedPersonId} onSelect={onSelectPerson} />
          </div>
        )}
      </div>
    </aside>
  );
}
