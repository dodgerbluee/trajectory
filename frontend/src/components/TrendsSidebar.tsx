import { GoGraph } from 'react-icons/go';
import { LuPill } from 'react-icons/lu';
import ChildSelector from './ChildSelector';
import VisitStats from './VisitStats';
import type { Child } from '../types/api';

interface Props {
  activeTab: 'illness' | 'growth';
  onChangeTab: (tab: 'illness' | 'growth') => void;
  childrenList: Child[];
  selectedChildId?: number | undefined;
  onSelectChild: (id?: number) => void;
  // year handled inside MetricsView
}

export default function TrendsSidebar({
  activeTab,
  onChangeTab,
  childrenList,
  selectedChildId,
  onSelectChild,
}: Props) {
  return (
    <aside className="visits-sidebar">
      <div className="visits-sidebar-inner">
        <header>
          <div className="sidebar-brand">Filters</div>
        </header>

        <div className="sidebar-divider" />

        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <VisitStats
              stats={[
                {
                  label: 'Illness',
                  value: 0,
                  icon: LuPill as any,
                  color: 'red',
                  onClick: () => onChangeTab('illness'),
                  active: activeTab === 'illness',
                },
                {
                  label: 'Growth',
                  value: 0,
                  icon: GoGraph as any,
                  color: 'blue',
                  onClick: () => onChangeTab('growth'),
                  active: activeTab === 'growth',
                },
              ]}
              vertical
              showValues={false}
            />
          </div>
        </div>

        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Child Filter</h4>
          <ChildSelector childrenList={childrenList} selectedChildId={selectedChildId} onSelect={onSelectChild} />
        </div>
      </div>
    </aside>
  );
}
