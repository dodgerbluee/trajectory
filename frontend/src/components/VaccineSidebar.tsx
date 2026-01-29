/**
 * Vaccine sidebar – same format as VisitsSidebar/DocumentsSidebar.
 * Informational only: summary stats (Vaccine Types, Total Doses, Vaccine Reports), no filtering.
 */

import { LuSyringe, LuClipboardList, LuActivity } from 'react-icons/lu';
import VisitStats from './VisitStats';

interface Props {
  /** Number of distinct vaccine types recorded from visits */
  vaccineTypesCount: number;
  /** Total doses across all vaccines */
  totalDosesCount: number;
  /** Number of uploaded vaccine report documents */
  reportsCount: number;
}

export default function VaccineSidebar({
  vaccineTypesCount,
  totalDosesCount,
  reportsCount,
}: Props) {
  const stats = [
    {
      label: 'Vaccine Types',
      value: vaccineTypesCount,
      icon: LuSyringe,
      color: 'emerald',
      onClick: undefined,
      active: false,
    },
    {
      label: 'Total Doses',
      value: totalDosesCount,
      icon: LuActivity,
      color: 'blue',
      onClick: undefined,
      active: false,
    },
    {
      label: 'Vaccine Reports',
      value: reportsCount,
      icon: LuClipboardList,
      color: 'gray',
      onClick: undefined,
      active: false,
    },
  ];

  return (
    <aside className="visits-sidebar vaccine-sidebar--info">
      <div className="visits-sidebar-inner">
        <header>
          <div className="sidebar-brand">Summary</div>
        </header>

        <div className="sidebar-divider" />

        <nav className="sidebar-stats">
          <VisitStats stats={stats as any} vertical />
        </nav>
      </div>
    </aside>
  );
}
