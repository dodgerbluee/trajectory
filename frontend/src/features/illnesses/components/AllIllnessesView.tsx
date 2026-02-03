import { useMemo } from 'react';
import { LuActivity } from 'react-icons/lu';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import visitsLayout from '@shared/styles/VisitsLayout.module.css';
import { IllnessesTimeline } from '.';
import IllnessesSidebar from '@shared/components/IllnessesSidebar';
import { useIllnesses } from '../hooks';
function AllIllnessesView() {
  const {
    allIllnesses,
    illnesses,
    children,
    loading,
    error,
    filterChildId,
    filterIllnessType,
    filterIllnessStatus,
    setFilterChildId,
    setFilterIllnessType,
    setFilterIllnessStatus,
    reload,
  } = useIllnesses();

  const statsSource = useMemo(() => allIllnesses, [allIllnesses]);

  if (loading) {
    return <LoadingSpinner message="Loading illnesses..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={reload} />;
  }

  return (
    <div className={visitsLayout.pageLayout}>
      <IllnessesSidebar
        stats={[
          { label: 'Total Illnesses', value: statsSource.length, icon: LuActivity, color: 'blue', onClick: () => { setFilterIllnessType(undefined); setFilterIllnessStatus(undefined); }, active: !filterIllnessType && !filterIllnessStatus },
          { label: 'Ongoing', value: statsSource.filter(i => !i.end_date).length, icon: LuActivity, color: 'red', onClick: () => { setFilterIllnessStatus('ongoing'); setFilterIllnessType(undefined); }, active: filterIllnessStatus === 'ongoing' },
          { label: 'Ended', value: statsSource.filter(i => !!i.end_date).length, icon: LuActivity, color: 'emerald', onClick: () => { setFilterIllnessStatus('ended'); setFilterIllnessType(undefined); }, active: filterIllnessStatus === 'ended' },
        ]}
        childrenList={children}
        selectedChildId={filterChildId}
        onSelectChild={(id) => setFilterChildId(id)}
      />

      <main className={visitsLayout.main}>
        <IllnessesTimeline
          illnesses={illnesses}
          children={children}
          showChildName={true}
        />
      </main>
    </div>
  );
}

export default AllIllnessesView;
