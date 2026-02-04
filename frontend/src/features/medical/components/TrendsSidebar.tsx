import { GoGraph } from 'react-icons/go';
import { LuPill } from 'react-icons/lu';
import { ChildSelector } from '@features/children';
import { VisitStats } from '@features/visits';
import type { Child } from '@shared/types/api';
import layout from '@shared/styles/VisitsLayout.module.css';

interface Props {
  activeTab: 'illness' | 'growth';
  onChangeTab: (tab: 'illness' | 'growth') => void;
  childrenList: Child[];
  selectedChildId?: number | undefined;
  onSelectChild: (id?: number) => void;
  /** When false, hide the Child Filter section (e.g. on child detail page where context is already one child). Default true. */
  showChildFilter?: boolean;
  /** When false, hide the Illness tab (e.g. child has no illness data). Default true. */
  showIllnessTab?: boolean;
  /** When false, hide the Growth tab (e.g. child has no growth data). Default true. */
  showGrowthTab?: boolean;
}

export default function TrendsSidebar({
  activeTab,
  onChangeTab,
  childrenList,
  selectedChildId,
  onSelectChild,
  showChildFilter = true,
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

        {showChildFilter && (
          <div className={layout.childSidebarSection}>
            <h4 className={layout.sidebarSectionTitle}>Child Filter</h4>
            <ChildSelector childrenList={childrenList} selectedChildId={selectedChildId} onSelect={onSelectChild} />
          </div>
        )}
      </div>
    </aside>
  );
}
