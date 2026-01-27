import { useEffect, useState, useMemo } from 'react';
import { /* Link removed - not used */ } from 'react-router-dom';
import { illnessesApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Illness, Child, IllnessType } from '../types/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import TimelineItem from './TimelineItem';
import Card from './Card';
// Button removed - Add action moved into summary section
// HiPlus removed — using summary-section controls for adding illness
import VisitStats from './VisitStats';
import { LuActivity } from 'react-icons/lu';
import ChildPills from './ChildPills';

// Illness types constant removed - not used by the modernized UI

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
      let displayed = filterIllnessType ? illnessesResponse.data.filter(i => i.illness_type === filterIllnessType) : illnessesResponse.data;
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

  // Create a map for quick child lookup
  const childMap = useMemo(() => {
    const map = new Map<number, Child>();
    children.forEach(child => map.set(child.id, child));
    return map;
  }, [children]);

  // Sort illnesses by start_date (most recent first)
  const sortedIllnesses = useMemo(() => {
    return [...illnesses].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return dateB - dateA; // Descending = most recent first
    });
  }, [illnesses]);

  // stats source (unfiltered) so counts remain stable when filtering
  const statsSource = useMemo(() => allIllnesses, [allIllnesses]);

  if (loading) {
    return <LoadingSpinner message="Loading illnesses..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="all-illnesses-view">
      <div className="summary-card-modern illnesses-summary">
        <div className="summary-card-content">
          <VisitStats
            stats={[
              { label: 'Total Illnesses', value: statsSource.length, icon: LuActivity, color: 'blue', onClick: () => { setFilterIllnessType(undefined); setFilterIllnessStatus(undefined); }, active: !filterIllnessType && !filterIllnessStatus },
              { label: 'Ongoing', value: statsSource.filter(i => !i.end_date).length, icon: LuActivity, color: 'red', onClick: () => { setFilterIllnessStatus('ongoing'); setFilterIllnessType(undefined); }, active: filterIllnessStatus === 'ongoing' },
              { label: 'Ended', value: statsSource.filter(i => !!i.end_date).length, icon: LuActivity, color: 'emerald', onClick: () => { setFilterIllnessStatus('ended'); setFilterIllnessType(undefined); }, active: filterIllnessStatus === 'ended' },
            ]}
          />

          <div className="summary-card-children">
            <div className="filters-inline" style={{ width: 320 }}>
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Child</label>
                  <div>
                    {/* reuse ChildPills for child filter */}
                    <ChildPills
                      childrenList={children}
                      selectedChildId={filterChildId}
                      onSelect={(id) => setFilterChildId(id)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filters moved into the summary card above; removed redundant filter toolbar */}

      {/* Illnesses Timeline */}
      {sortedIllnesses.length === 0 ? (
        <Card>
          <p className="empty-state">
            No illnesses recorded yet. Click "Add Illness" to get started.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="timeline-list-modern">
            {sortedIllnesses.map((illness) => {
              const child = childMap.get(illness.child_id);
              return (
                <TimelineItem 
                  key={illness.id}
                  type="illness" 
                  data={illness}
                  childName={child?.name || `Child #${illness.child_id}`}
                  childId={illness.child_id}
                />
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default AllIllnessesView;
