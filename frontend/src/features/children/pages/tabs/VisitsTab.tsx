import { LuActivity, LuEye, LuStethoscope } from 'react-icons/lu';
import { LuPill } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import type { Visit } from '@shared/types/api';
import { VisitFilterSidebar, VisitsTimeline } from '@features/visits';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import MobileFilterBar, { type MobileFilterOption } from '@shared/components/MobileFilterBar';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';

type VisitTypeFilter = 'all' | 'wellness' | 'sick' | 'injury' | 'vision' | 'dental';

type Props = {
  visits: Visit[];
  visibleVisits: Visit[];
  visitsWithAttachments: Set<number>;
  visitTypeFilter: VisitTypeFilter;
  onChangeVisitTypeFilter: (filter: VisitTypeFilter) => void;
  onAddVisitClick: () => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export default function VisitsTab({
  visits,
  visibleVisits,
  visitsWithAttachments,
  visitTypeFilter,
  onChangeVisitTypeFilter,
  onAddVisitClick,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: Props) {
  const { canEdit } = useFamilyPermissions();

  const dentalIcon = (props: { className?: string }) => (
    <HugeiconsIcon icon={DentalToothIcon} {...props} size={24} color="currentColor" />
  );

  const filterOptions: MobileFilterOption[] = [
    {
      key: 'all',
      label: 'All',
      count: visits.length,
      icon: LuActivity,
      active: visitTypeFilter === 'all',
      isDefault: true,
      onSelect: () => onChangeVisitTypeFilter('all'),
    },
    {
      key: 'wellness',
      label: 'Wellness',
      count: visits.filter((v) => v.visit_type === 'wellness').length,
      icon: LuStethoscope,
      active: visitTypeFilter === 'wellness',
      onSelect: () => onChangeVisitTypeFilter('wellness'),
    },
    {
      key: 'sick',
      label: 'Sick',
      count: visits.filter((v) => v.visit_type === 'sick').length,
      icon: LuPill,
      active: visitTypeFilter === 'sick',
      onSelect: () => onChangeVisitTypeFilter('sick'),
    },
    {
      key: 'injury',
      label: 'Injury',
      count: visits.filter((v) => v.visit_type === 'injury').length,
      icon: MdOutlinePersonalInjury,
      active: visitTypeFilter === 'injury',
      onSelect: () => onChangeVisitTypeFilter('injury'),
    },
    {
      key: 'dental',
      label: 'Dental',
      count: visits.filter((v) => v.visit_type === 'dental').length,
      icon: dentalIcon,
      active: visitTypeFilter === 'dental',
      onSelect: () => onChangeVisitTypeFilter('dental'),
    },
    {
      key: 'vision',
      label: 'Vision',
      count: visits.filter((v) => v.visit_type === 'vision').length,
      icon: LuEye,
      active: visitTypeFilter === 'vision',
      onSelect: () => onChangeVisitTypeFilter('vision'),
    },
  ];

  return (
    <div className={visitsLayout.pageLayout}>
      <MobileFilterBar
        title="Filter visits"
        options={filterOptions}
        primaryAction={canEdit ? { label: 'Add Visit', onClick: onAddVisitClick } : undefined}
      />
      <VisitFilterSidebar
        stats={[
          {
            label: 'Total Visits',
            value: visits.length,
            icon: LuActivity,
            color: 'gray',
            onClick: () => onChangeVisitTypeFilter('all'),
            active: visitTypeFilter === 'all',
          },
          {
            label: 'Wellness',
            value: visits.filter((v) => v.visit_type === 'wellness').length,
            icon: LuStethoscope,
            color: 'emerald',
            onClick: () => onChangeVisitTypeFilter('wellness'),
            active: visitTypeFilter === 'wellness',
          },
          {
            label: 'Sick',
            value: visits.filter((v) => v.visit_type === 'sick').length,
            icon: LuPill,
            color: 'red',
            onClick: () => onChangeVisitTypeFilter('sick'),
            active: visitTypeFilter === 'sick',
          },
          {
            label: 'Injury',
            value: visits.filter((v) => v.visit_type === 'injury').length,
            icon: MdOutlinePersonalInjury,
            color: 'blue',
            onClick: () => onChangeVisitTypeFilter('injury'),
            active: visitTypeFilter === 'injury',
          },
          {
            label: 'Dental',
            value: visits.filter((v) => v.visit_type === 'dental').length,
            icon: dentalIcon,
            color: 'teal',
            onClick: () => onChangeVisitTypeFilter('dental'),
            active: visitTypeFilter === 'dental',
          },
          {
            label: 'Vision',
            value: visits.filter((v) => v.visit_type === 'vision').length,
            icon: LuEye,
            color: 'purple',
            onClick: () => onChangeVisitTypeFilter('vision'),
            active: visitTypeFilter === 'vision',
          },
        ]}
        childrenList={[]}
        selectedChildId={undefined}
        onSelectChild={() => {}}
        hideChildFilter
        onAddVisitClick={onAddVisitClick}
      />

      <main className={visitsLayout.main}>
        <VisitsTimeline
          visits={visibleVisits}
          visitsWithAttachments={visitsWithAttachments}
          showChildName={false}
          flat
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </main>
    </div>
  );
}
