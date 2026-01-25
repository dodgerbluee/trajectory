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

function AllVisitsView() {
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
        visitsApi.getAll({
          child_id: filterChildId,
          visit_type: filterVisitType,
          limit: 500,
        }),
        childrenApi.getAll(),
      ]);

      setVisits(visitsResponse.data);
      setChildren(childrenResponse.data);
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

  if (loading) {
    return <LoadingSpinner message="Loading visits..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="all-visits-view">
      {/* Filters with Add Button */}
      <Card className="filters-card">
        <div className="filters-toolbar">
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="filter-child">Filter by Child:</label>
              <select
                id="filter-child"
                value={filterChildId || ''}
                onChange={(e) => setFilterChildId(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Children</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="filter-type">Filter by Type:</label>
              <select
                id="filter-type"
                value={filterVisitType || ''}
                onChange={(e) => setFilterVisitType(e.target.value as VisitType || undefined)}
              >
                <option value="">All Types</option>
                <option value="wellness">Wellness</option>
                <option value="sick">Sick</option>
                <option value="injury">Injury</option>
                <option value="vision">Vision</option>
              </select>
            </div>
          </div>
          <div className="filters-actions">
            {children.length > 0 ? (
              <Link to="/visits/new">
                <Button>
                  <HiPlus className="btn-icon" />
                  Add Visit
                </Button>
              </Link>
            ) : (
              <div className="empty-state-hint">
                <p>Add a child first to create visits</p>
              </div>
            )}
          </div>
        </div>
      </Card>

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
                />
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default AllVisitsView;
