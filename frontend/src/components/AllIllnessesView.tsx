import { useEffect, useState, useMemo } from 'react';
import { illnessesApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Illness, Child, IllnessType } from '../types/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import IllnessesTimeline from './IllnessesTimeline';
import IllnessesSidebar from './IllnessesSidebar';
import visitsLayout from '../styles/VisitsLayout.module.css';
import { LuActivity } from 'react-icons/lu';

function AllIllnessesView() {
  // keep an unfiltered source for stable stats and a displayed list filtered client-side
  const [allIllnesses, setAllIllnesses] = useState<Illness[]>([]);
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterIllnessType, setFilterIllnessType] = useState<IllnessType | undefined>(undefined);
  const [filterIllnessStatus, setFilterIllnessStatus] = useState<'ongoing' | 'ended' | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [filterChildId, filterIllnessType, filterIllnessStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [illnessesResponse, childrenResponse] = await Promise.all([
        // fetch illnesses without illness_type so stats remain stable; apply filtering client-side
        illnessesApi.getAll({
          child_id: filterChildId,
          limit: 500,
        }),
        childrenApi.getAll(),
      ]);

      setAllIllnesses(illnessesResponse.data);
      let displayed = filterIllnessType ? illnessesResponse.data.filter((i) => i.illness_types?.includes(filterIllnessType)) : illnessesResponse.data;
      if (filterIllnessStatus === 'ongoing') {
        displayed = displayed.filter(i => !i.end_date);
      } else if (filterIllnessStatus === 'ended') {
        displayed = displayed.filter(i => !!i.end_date);
      }
      setIllnesses(displayed);
      setChildren(childrenResponse.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load illnesses');
      }
    } finally {
      setLoading(false);
    }
  };

  // stats source (unfiltered) so counts remain stable when filtering
  const statsSource = useMemo(() => allIllnesses, [allIllnesses]);

  if (loading) {
    return <LoadingSpinner message="Loading illnesses..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
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
