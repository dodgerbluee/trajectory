import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Visit, Child, VisitType } from '../types/api';
import { formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import VisitTypeModal from '../components/VisitTypeModal';

function VisitsPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'wellness' | 'sick'>('all');
  const [showVisitTypeModal, setShowVisitTypeModal] = useState(false);

  useEffect(() => {
    if (childId) {
      loadData();
    }
  }, [childId, filter]);

  const loadData = async () => {
    if (!childId) return;

    try {
      setLoading(true);
      setError(null);
      
      const [childResponse, visitsResponse] = await Promise.all([
        childrenApi.getById(parseInt(childId)),
        visitsApi.getAll({
          child_id: parseInt(childId),
          visit_type: filter === 'all' ? undefined : filter,
        }),
      ]);

      setChild(childResponse.data);
      setVisits(visitsResponse.data);
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

  if (loading) {
    return <LoadingSpinner message="Loading visits..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  if (!child) {
    return <ErrorMessage message="Child not found" />;
  }

  const wellnessCount = visits.filter(v => v.visit_type === 'wellness').length;
  const sickCount = visits.filter(v => v.visit_type === 'sick').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to={`/children/${childId}`} className="breadcrumb">
            ← Back to {child.name}
          </Link>
          <h1>Visits for {child.name}</h1>
        </div>
        <Button onClick={() => setShowVisitTypeModal(true)}>+ Add Visit</Button>
      </div>

      <div className="visit-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({visits.length})
        </button>
        <button
          className={`filter-btn ${filter === 'wellness' ? 'active' : ''}`}
          onClick={() => setFilter('wellness')}
        >
          Wellness ({wellnessCount})
        </button>
        <button
          className={`filter-btn ${filter === 'sick' ? 'active' : ''}`}
          onClick={() => setFilter('sick')}
        >
          Sick ({sickCount})
        </button>
      </div>

      {visits.length === 0 ? (
        <Card>
          <p className="empty-state">
            No {filter !== 'all' ? filter : ''} visits recorded yet.
            <br />
            <Link to={`/children/${childId}/visits/new`}>Add the first visit</Link>
          </p>
        </Card>
      ) : (
        <div className="visits-list">
          {visits.map((visit) => (
            <Link key={visit.id} to={`/visits/${visit.id}`} className="visit-card-link">
              <Card className="visit-card">
                <div className="visit-card-header">
                  <div>
                    <span className={`visit-type-badge ${visit.visit_type}`}>
                      {visit.visit_type === 'wellness' ? '✓' : '🤒'} {visit.visit_type}
                    </span>
                    <h3 className="visit-date">{formatDate(visit.visit_date)}</h3>
                  </div>
                  <span className="visit-arrow">→</span>
                </div>
                
                {visit.illness_type && (
                  <div className="visit-illness">
                    <strong>Illness:</strong> {visit.illness_type.replace('_', ' ')}
                  </div>
                )}
                
                {visit.location && (
                  <div className="visit-detail">
                    <span>📍 {visit.location}</span>
                  </div>
                )}
                
                {visit.doctor_name && (
                  <div className="visit-detail">
                    <span>👨‍⚕️ {visit.doctor_name}</span>
                  </div>
                )}
                
                {(visit.weight_value || visit.height_value || visit.head_circumference_value) && (
                  <div className="visit-measurements">
                    {visit.weight_value && <span>⚖️ {visit.weight_value} lbs</span>}
                    {visit.height_value && <span>📏 {visit.height_value}"</span>}
                    {visit.head_circumference_value && <span>⭕ {visit.head_circumference_value}"</span>}
                  </div>
                )}
                
                {visit.vaccines_administered && visit.vaccines_administered.length > 0 && (
                  <div className="visit-vaccines">
                    💉 {visit.vaccines_administered.length} vaccine(s)
                  </div>
                )}
                
                {visit.prescriptions && visit.prescriptions.length > 0 && (
                  <div className="visit-prescriptions">
                    💊 {visit.prescriptions.length} prescription(s)
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <VisitTypeModal
        isOpen={showVisitTypeModal}
        onSelect={(visitType: VisitType) => {
          setShowVisitTypeModal(false);
          navigate(`/children/${childId}/visits/new?type=${visitType}`);
        }}
        onClose={() => setShowVisitTypeModal(false)}
      />
    </div>
  );
}

export default VisitsPage;
