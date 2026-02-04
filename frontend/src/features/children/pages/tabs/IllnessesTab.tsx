import { LuActivity } from 'react-icons/lu';
import type { Illness } from '@shared/types/api';
import { IllnessesTimeline, IllnessesSidebar } from '@features/illnesses';
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
  onPageChange,
  onItemsPerPageChange,
}: Props) {
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
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </main>
    </div>
  );
}
