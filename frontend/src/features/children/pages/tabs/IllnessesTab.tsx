import { LuActivity } from 'react-icons/lu';
import { HiPlus } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import type { Illness } from '@shared/types/api';
import { IllnessesTimeline, IllnessesSidebar } from '@features/illnesses';
import Button from '@shared/components/Button';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';

type FilterIllnessStatus = 'ongoing' | 'ended' | undefined;

type Props = {
  childId: number;
  illnesses: Illness[];
  visibleIllnesses: Illness[];
  filterIllnessStatus: FilterIllnessStatus;
  onChangeFilterIllnessStatus: (filter: FilterIllnessStatus) => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onAddVisitClick: () => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export default function IllnessesTab({
  childId,
  illnesses,
  visibleIllnesses,
  filterIllnessStatus,
  onChangeFilterIllnessStatus,
  currentPage,
  itemsPerPage,
  totalItems,
  onAddVisitClick,
  onPageChange,
  onItemsPerPageChange,
}: Props) {
  const navigate = useNavigate();
  const { canEdit } = useFamilyPermissions();
  const showEmptyActions = canEdit && illnesses.length === 0;

  const handleAddIllness = () => {
    navigate('/illnesses/new', {
      state: { fromChild: true, childId, fromTab: 'illnesses' },
    });
  };

  return (
    <div className={visitsLayout.pageLayout}>
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
        childrenList={[]}
        selectedChildId={undefined}
        onSelectChild={() => {}}
        hideChildFilter
        addIllnessChildId={childId}
      />
      <main className={visitsLayout.main}>
        <IllnessesTimeline
          illnesses={visibleIllnesses}
          showChildName={false}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          emptyActions={showEmptyActions ? (
            <>
              <Button type="button" onClick={handleAddIllness} size="lg">
                <HiPlus aria-hidden />
                <span>Add Illness</span>
              </Button>
              <Button type="button" onClick={onAddVisitClick} size="lg" variant="secondary">
                <HiPlus aria-hidden />
                <span>Add Visit</span>
              </Button>
            </>
          ) : undefined}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </main>
    </div>
  );
}
