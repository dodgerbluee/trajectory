import { LuActivity } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import type { Illness } from '@shared/types/api';
import { IllnessesTimeline, IllnessesSidebar } from '@features/illnesses';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import MobileFilterBar, { type MobileFilterOption } from '@shared/components/MobileFilterBar';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';

type FilterIllnessStatus = 'ongoing' | 'ended' | undefined;

type Props = {
  personId: number;
  illnesses: Illness[];
  visibleIllnesses: Illness[];
  filterIllnessStatus: FilterIllnessStatus;
  onChangeFilterIllnessStatus: (filter: FilterIllnessStatus) => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export default function IllnessesTab({
  personId,
  illnesses,
  visibleIllnesses,
  filterIllnessStatus,
  onChangeFilterIllnessStatus,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: Props) {
  const navigate = useNavigate();
  const { canEdit } = useFamilyPermissions();

  const handleAddIllness = () => {
    navigate(`/illnesses/new?person_id=${personId}`, {
      state: { fromChild: true, personId, fromTab: 'illnesses' },
    });
  };

  const filterOptions: MobileFilterOption[] = [
    {
      key: 'all',
      label: 'All',
      count: illnesses.length,
      icon: LuActivity,
      active: !filterIllnessStatus,
      isDefault: true,
      onSelect: () => onChangeFilterIllnessStatus(undefined),
    },
    {
      key: 'ongoing',
      label: 'Ongoing',
      count: illnesses.filter((i) => !i.end_date).length,
      icon: LuActivity,
      active: filterIllnessStatus === 'ongoing',
      onSelect: () => onChangeFilterIllnessStatus('ongoing'),
    },
    {
      key: 'ended',
      label: 'Ended',
      count: illnesses.filter((i) => !!i.end_date).length,
      icon: LuActivity,
      active: filterIllnessStatus === 'ended',
      onSelect: () => onChangeFilterIllnessStatus('ended'),
    },
  ];

  return (
    <div className={visitsLayout.pageLayout}>
      <MobileFilterBar
        title="Filter illnesses"
        options={filterOptions}
        primaryAction={canEdit ? { label: 'Add Illness', onClick: handleAddIllness } : undefined}
      />
      <IllnessesSidebar
        stats={[
          {
            label: 'Total Illnesses',
            value: illnesses.length,
            icon: LuActivity,
            color: 'blue',
            onClick: () => onChangeFilterIllnessStatus(undefined),
            active: !filterIllnessStatus,
          },
          {
            label: 'Ongoing',
            value: illnesses.filter((i) => !i.end_date).length,
            icon: LuActivity,
            color: 'red',
            onClick: () => onChangeFilterIllnessStatus('ongoing'),
            active: filterIllnessStatus === 'ongoing',
          },
          {
            label: 'Ended',
            value: illnesses.filter((i) => !!i.end_date).length,
            icon: LuActivity,
            color: 'emerald',
            onClick: () => onChangeFilterIllnessStatus('ended'),
            active: filterIllnessStatus === 'ended',
          },
        ]}
        peopleList={[]}
        selectedPersonId={undefined}
        onSelectPerson={() => {}}
        hidePersonFilter
        addIllnessPersonId={personId}
      />
      <main className={visitsLayout.main}>
        <IllnessesTimeline
          illnesses={visibleIllnesses}
          showPersonName={false}
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
