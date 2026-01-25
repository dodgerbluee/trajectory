import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { illnessesApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Illness, Child, IllnessType } from '../types/api';
import { formatDate } from '../lib/date-utils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import Button from '../components/Button';
import { HiPlus, HiPencilAlt, HiTrash } from 'react-icons/hi';

const ILLNESS_TYPES: { value: IllnessType; label: string }[] = [
  { value: 'flu', label: 'Flu' },
  { value: 'strep', label: 'Strep Throat' },
  { value: 'rsv', label: 'RSV' },
  { value: 'covid', label: 'COVID-19' },
  { value: 'cold', label: 'Cold' },
  { value: 'stomach_bug', label: 'Stomach Bug' },
  { value: 'ear_infection', label: 'Ear Infection' },
  { value: 'hand_foot_mouth', label: 'Hand, Foot & Mouth' },
  { value: 'croup', label: 'Croup' },
  { value: 'pink_eye', label: 'Pink Eye' },
  { value: 'other', label: 'Other' },
];

function IllnessesPage() {
  const navigate = useNavigate();
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChildId, setFilterChildId] = useState<number | undefined>(undefined);
  const [filterIllnessType, setFilterIllnessType] = useState<IllnessType | undefined>(undefined);
  const [childToDelete, setChildToDelete] = useState<Illness | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterChildId, filterIllnessType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [illnessesResponse, childrenResponse] = await Promise.all([
        illnessesApi.getAll({
          child_id: filterChildId,
          illness_type: filterIllnessType,
          limit: 200,
        }),
        childrenApi.getAll(),
      ]);

      setIllnesses(illnessesResponse.data);
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

  const handleDelete = async () => {
    if (!childToDelete) return;

    setDeleting(true);
    try {
      await illnessesApi.delete(childToDelete.id);
      setChildToDelete(null);
      loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      } else {
        alert('Failed to delete illness');
      }
    } finally {
      setDeleting(false);
    }
  };

  const getChildName = (childId: number): string => {
    const child = children.find(c => c.id === childId);
    return child?.name || `Child #${childId}`;
  };

  const getIllnessTypeLabel = (type: IllnessType): string => {
    return ILLNESS_TYPES.find(t => t.value === type)?.label || type;
  };

  const getSeverityEmoji = (severity: number): string => {
    const emojis: { [key: number]: string } = {
      1: '😊',
      2: '🙂',
      3: '😐',
      4: '😕',
      5: '😟',
      6: '😣',
      7: '😖',
      8: '😫',
      9: '😩',
      10: '🤢',
    };
    return emojis[severity] || '😐';
  };

  if (loading) {
    return <LoadingSpinner message="Loading illnesses..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Illnesses</h1>
        <Link to="/illnesses/new">
          <Button>
            <HiPlus className="btn-icon" />
            Add Illness
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="filters-card">
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
              value={filterIllnessType || ''}
              onChange={(e) => setFilterIllnessType(e.target.value as IllnessType || undefined)}
            >
              <option value="">All Types</option>
              {ILLNESS_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {childToDelete && (
        <Card className="delete-confirm-modal">
          <h3>Delete Illness?</h3>
          <p>
            This will permanently delete this illness record. This action cannot be undone.
          </p>
          <div className="form-actions">
            <Button 
              variant="danger" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setChildToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Illnesses List */}
      {illnesses.length === 0 ? (
        <Card>
          <p className="empty-state">
            No illnesses recorded yet. Click "Add Illness" to get started.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="illnesses-list">
            {illnesses.map((illness) => (
              <div key={illness.id} className="illness-item">
                <div className="illness-item-content">
                  <div className="illness-item-header">
                    <h3>{getChildName(illness.child_id)}</h3>
                    <span className={`illness-type-badge ${illness.illness_type}`}>
                      {getIllnessTypeLabel(illness.illness_type)}
                    </span>
                  </div>
                  <div className="illness-item-details">
                    <div className="illness-detail-row">
                      <strong>Start Date:</strong> {formatDate(illness.start_date)}
                    </div>
                    {illness.end_date && (
                      <div className="illness-detail-row">
                        <strong>End Date:</strong> {formatDate(illness.end_date)}
                      </div>
                    )}
                    {!illness.end_date && (
                      <div className="illness-detail-row">
                        <strong>Status:</strong> <span className="ongoing-badge">Ongoing</span>
                      </div>
                    )}
                    {illness.temperature && (
                      <div className="illness-detail-row">
                        <strong>Temperature:</strong> {illness.temperature}°F
                      </div>
                    )}
                    {illness.severity && (
                      <div className="illness-detail-row">
                        <strong>Severity:</strong> 
                        <span className="severity-display">
                          {getSeverityEmoji(illness.severity)} {illness.severity}/10
                        </span>
                      </div>
                    )}
                    {illness.symptoms && (
                      <div className="illness-detail-row">
                        <strong>Symptoms:</strong> {illness.symptoms}
                      </div>
                    )}
                    {illness.visit_id && (
                      <div className="illness-detail-row">
                        <Link to={`/visits/${illness.visit_id}`} className="visit-link">
                          View Related Visit →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                <div className="illness-item-actions">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => navigate(`/illnesses/${illness.id}/edit`)}
                  >
                    <HiPencilAlt className="btn-icon" /> Edit
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => setChildToDelete(illness)}
                  >
                    <HiTrash className="btn-icon" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default IllnessesPage;
