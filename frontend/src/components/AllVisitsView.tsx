import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Visit, Child, VisitType } from '../types/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import TimelineItem from './TimelineItem';
import Card from './Card';
import Button from './Button';
import { HiPlus } from 'react-icons/hi';
import VisitsSummary from './VisitsSummary';
import ChildPills from './ChildPills';
import { LuActivity, LuHeart, LuPill, LuEye } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';

function AllVisitsView() {
  // `allVisits` holds visits for the current child (if selected) but without a visit_type filter.
  // `visits` is the currently displayed list (may be filtered by `filterVisitType`).
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterVisitType, setFilterVisitType] = useState<VisitType | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [filterChildId, filterVisitType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [visitsResponse, childrenResponse] = await Promise.all([
        // Fetch visits for the selected child (if any) but DO NOT apply visit_type on the API
        // so we can compute stable stats. We'll apply visit_type filtering client-side.
        visitsApi.getAll({
          child_id: filterChildId,
          limit: 500,
        }),
        childrenApi.getAll(),
      ]);

      // Keep the full set (for stats) and a displayed set (filtered by visit type client-side)
      setAllVisits(visitsResponse.data);
      const displayed = filterVisitType ? visitsResponse.data.filter(v => v.visit_type === filterVisitType) : visitsResponse.data;
      setVisits(displayed);
      setChildren(childrenResponse.data);

      // Determine which displayed visits have attachments for the timeline indicator
      try {
        const checks = await Promise.all(
          displayed.map(async (visit) => {
            try {
              const resp = await visitsApi.getAttachments(visit.id);
              return (resp.data && resp.data.length > 0) ? visit.id : null;
            } catch (err) {
              return null;
            }
          })
        );

        const ids = new Set<number>();
        checks.forEach(id => { if (id !== null) ids.add(id as number); });
        setVisitsWithAttachments(ids);
      } catch (err) {
        // ignore
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load visits');
      }
    } finally {
      setLoading(false);
    }
  };

  // Track which visits have attachments (visit ID set)
  const [visitsWithAttachments, setVisitsWithAttachments] = useState<Set<number>>(new Set());

  // Create a map for quick child lookup
  const childMap = useMemo(() => {
    const map = new Map<number, Child>();
    children.forEach(child => map.set(child.id, child));
    return map;
  }, [children]);

  // Sort visits by visit_date (most recent first)
  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const dateA = new Date(a.visit_date).getTime();
      const dateB = new Date(b.visit_date).getTime();
      return dateB - dateA; // Descending = most recent first
    });
  }, [visits]);

  // Compute stable stats from the unfiltered set (allVisits) so counts don't collapse
  // when `filterVisitType` is applied.
  const statsSource = useMemo(() => allVisits, [allVisits]);

  if (loading) {
    return <LoadingSpinner message="Loading visits..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="all-visits-view">
      <VisitsSummary
        stats={[
          { label: 'Total Visits', value: statsSource.length, icon: LuActivity, color: 'gray', onClick: () => setFilterVisitType(undefined), active: !filterVisitType },
          { label: 'Wellness', value: statsSource.filter(v => v.visit_type === 'wellness').length, icon: LuHeart, color: 'emerald', onClick: () => setFilterVisitType('wellness'), active: filterVisitType === 'wellness' },
          { label: 'Sick', value: statsSource.filter(v => v.visit_type === 'sick').length, icon: LuPill, color: 'red', onClick: () => setFilterVisitType('sick'), active: filterVisitType === 'sick' },
          { label: 'Injury', value: statsSource.filter(v => v.visit_type === 'injury').length, icon: MdOutlinePersonalInjury, color: 'blue', onClick: () => setFilterVisitType('injury'), active: filterVisitType === 'injury' },
          { label: 'Vision', value: statsSource.filter(v => v.visit_type === 'vision').length, icon: LuEye, color: 'purple', onClick: () => setFilterVisitType('vision'), active: filterVisitType === 'vision' },
        ]}
      >
        <div className="filters-inline" style={{ width: 320 }}>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Child Filter</label>
              <div>
                <ChildPills
                  childrenList={children}
                  selectedChildId={filterChildId}
                  onSelect={(id) => setFilterChildId(id)}
                />
              </div>
            </div>
          </div>
        </div>
      </VisitsSummary>

      {/* Visits Timeline */}
      {sortedVisits.length === 0 ? (
        <Card>
          <p className="empty-state">
            No visits recorded yet. Click "Add Visit" to get started.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="timeline-list-modern">
            {sortedVisits.map((visit) => {
              const child = childMap.get(visit.child_id);
              return (
                <TimelineItem 
                  key={visit.id}
                  type="visit" 
                  data={visit}
                  childName={child?.name || `Child #${visit.child_id}`}
                  childId={visit.child_id}
                  hasAttachments={visitsWithAttachments.has(visit.id)}
                />
              );
            })}
          </div>
        </Card>
      )}
      
      <div className="fab">
        <Link to="/visits/new">
          <Button size="lg" className="fab-btn">
            <HiPlus className="fab-icon" />
            Add Visit
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default AllVisitsView;
