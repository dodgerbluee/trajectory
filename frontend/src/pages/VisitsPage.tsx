import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Visit, Child, VisitType } from '../types/api';
import { formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import VisitTypeModal from '../components/VisitTypeModal';
import VisitsSidebar from '../components/VisitsSidebar';
import { LuActivity, LuHeart, LuPill, LuEye, LuSmile } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import { useFamilyPermissions } from '../contexts/FamilyPermissionsContext';

function VisitsPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { canEdit } = useFamilyPermissions();
  const [child, setChild] = useState<Child | null>(null);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterVisitType, setFilterVisitType] = useState<VisitType | undefined>(undefined);
  const [showVisitTypeModal, setShowVisitTypeModal] = useState(false);

  useEffect(() => {
    if (childId) {
      loadData();
    }
  }, [childId]);

  const loadData = async () => {
    if (!childId) return;

    try {
      setLoading(true);
      setError(null);

      const [childResponse, visitsResponse] = await Promise.all([
        childrenApi.getById(parseInt(childId)),
        visitsApi.getAll({ child_id: parseInt(childId), limit: 500 }),
      ]);

      setChild(childResponse.data);
      setAllVisits(visitsResponse.data);
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

  const visits = useMemo(() => {
    if (!filterVisitType) return allVisits;
    return allVisits.filter((v) => v.visit_type === filterVisitType);
  }, [allVisits, filterVisitType]);

  if (loading) {
    return <LoadingSpinner message="Loading visits..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  if (!child) {
    return <ErrorMessage message="Child not found" />;
  }

  const statsSource = allVisits;
  const sidebar = (
    <VisitsSidebar
      stats={[
        { label: 'Total Visits', value: statsSource.length, icon: LuActivity, color: 'gray', onClick: () => setFilterVisitType(undefined), active: !filterVisitType },
        { label: 'Wellness', value: statsSource.filter((v) => v.visit_type === 'wellness').length, icon: LuHeart, color: 'emerald', onClick: () => setFilterVisitType('wellness'), active: filterVisitType === 'wellness' },
        { label: 'Sick', value: statsSource.filter((v) => v.visit_type === 'sick').length, icon: LuPill, color: 'red', onClick: () => setFilterVisitType('sick'), active: filterVisitType === 'sick' },
        { label: 'Injury', value: statsSource.filter((v) => v.visit_type === 'injury').length, icon: MdOutlinePersonalInjury, color: 'blue', onClick: () => setFilterVisitType('injury'), active: filterVisitType === 'injury' },
        { label: 'Vision', value: statsSource.filter((v) => v.visit_type === 'vision').length, icon: LuEye, color: 'purple', onClick: () => setFilterVisitType('vision'), active: filterVisitType === 'vision' },
        { label: 'Dental', value: statsSource.filter((v) => v.visit_type === 'dental').length, icon: LuSmile, color: 'teal', onClick: () => setFilterVisitType('dental'), active: filterVisitType === 'dental' },
      ]}
      childrenList={[]}
      selectedChildId={undefined}
      onSelectChild={() => {}}
      hideChildFilter
    />
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to={`/children/${childId}`} className="breadcrumb">
            ← Back to {child.name}
          </Link>
          <h1>Visits for {child.name}</h1>
        </div>
        {canEdit && <Button onClick={() => setShowVisitTypeModal(true)}>+ Add Visit</Button>}
      </div>

      <div className="visits-page-layout">
        {sidebar}
        <main className="visits-main">
          {visits.length === 0 ? (
        <Card>
          <p className="empty-state">
            No {filterVisitType ? `${filterVisitType} ` : ''}visits recorded yet.
            {canEdit && (
              <>
                <br />
                <Link to={`/children/${childId}/visits/new`}>Add the first visit</Link>
              </>
            )}
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
                
                {visit.illnesses && visit.illnesses.length > 0 && (
                  <div className="visit-illness">
                    <strong>Illness:</strong> {visit.illnesses.map(i => i.replace('_', ' ')).join(', ')}
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
        </main>
      </div>

      <VisitTypeModal
        isOpen={showVisitTypeModal}
        onSelect={(visitType: VisitType) => {
          setShowVisitTypeModal(false);
          navigate(`/children/${childId}/visits/new?type=${visitType}`, { state: { from: `${location.pathname}${location.search}`, childId } });
        }}
        onClose={() => setShowVisitTypeModal(false)}
      />
    </div>
  );
}

export default VisitsPage;
