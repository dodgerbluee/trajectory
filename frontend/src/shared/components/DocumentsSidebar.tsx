/**
 * Documents sidebar – same format as VisitsSidebar.
 * Filters section with summary stats (Total, Visit Docs, Vaccine Reports) and type filter.
 */

import { LuFileText, LuClipboardList } from 'react-icons/lu';
import VisitStats from '../../features/visits/components/VisitStats';
import layout from '../styles/VisitsLayout.module.css';

export type DocumentTypeFilter = 'all' | 'visit' | 'vaccine';

interface Props {
  total: number;
  visitCount: number;
  vaccineCount: number;
  filter: DocumentTypeFilter;
  onFilterChange: (filter: DocumentTypeFilter) => void;
}

export default function DocumentsSidebar({
  total,
  visitCount,
  vaccineCount,
  filter,
  onFilterChange,
}: Props) {
  const stats = [
    {
      label: 'Total',
      value: total,
      icon: LuFileText,
      color: 'gray',
      onClick: () => onFilterChange('all'),
      active: filter === 'all',
    },
    {
      label: 'Visit Docs',
      value: visitCount,
      icon: LuFileText,
      color: 'blue',
      onClick: () => onFilterChange('visit'),
      active: filter === 'visit',
    },
    {
      label: 'Vaccine Reports',
      value: vaccineCount,
      icon: LuClipboardList,
      color: 'emerald',
      onClick: () => onFilterChange('vaccine'),
      active: filter === 'vaccine',
    },
  ];

  return (
    <aside className={layout.sidebar}>
      <div className={layout.sidebarInner}>
        <header>
          <div className={layout.sidebarBrand}>Filters</div>
        </header>

        <div className={layout.sidebarDivider} />

        <nav className={layout.sidebarStats}>
          <VisitStats stats={stats as any} vertical />
        </nav>
      </div>
    </aside>
  );
}
