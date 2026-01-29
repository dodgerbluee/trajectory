import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { illnessesApi, childrenApi, visitsApi, ApiClientError } from '../lib/api-client';
import type { Child, CreateIllnessInput, IllnessType } from '../types/api';
import { getTodayDate } from '../lib/validation';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import SeveritySelector from '../components/SeveritySelector';
import IllnessesInput from '../components/IllnessesInput';
import Checkbox from '../components/Checkbox';

function AddIllnessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [visits, setVisits] = useState<{ id: number; visit_date: string; child_id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const childIdFromUrl = searchParams.get('child_id');
  const initialChildId = childIdFromUrl ? parseInt(childIdFromUrl) : 0;
  
  const [formData, setFormData] = useState<CreateIllnessInput>({
    child_id: initialChildId,
    illness_type: 'flu',
    start_date: getTodayDate(),
    end_date: null,
    symptoms: null,
    temperature: null,
    severity: null,
    visit_id: null,
    notes: null,
  });

  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([formData.illness_type]);

  useEffect(() => {
    setSelectedIllnesses(formData.illness_type ? [formData.illness_type] : []);
  }, [formData.illness_type]);

  useEffect(() => {
    loadData();
  }, [initialChildId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [childrenResponse, visitsResponse] = await Promise.all([
        childrenApi.getAll(),
        initialChildId 
          ? visitsApi.getAll({ child_id: initialChildId, visit_type: 'sick', limit: 100 })
          : visitsApi.getAll({ visit_type: 'sick', limit: 100 }),
      ]);
      setChildren(childrenResponse.data);
      setVisits(visitsResponse.data);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.child_id) {
      setNotification({ message: 'Please select a child', type: 'error' });
      return;
    }

    if (!formData.illness_type) {
      setNotification({ message: 'Please select an illness type', type: 'error' });
      return;
    }

    if (formData.end_date && formData.end_date < formData.start_date) {
      setNotification({ message: 'End date must be after start date', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      await illnessesApi.create(formData);
      setNotification({ message: 'Illness added successfully!', type: 'success' });
      setTimeout(() => {
        const state = location.state as { fromChild?: boolean; childId?: number; fromTab?: string } | null;
        if (state?.fromChild && state?.childId != null) {
          navigate(`/children/${state.childId}`, { state: { tab: state.fromTab ?? 'illnesses' } });
        } else {
          navigate('/', { state: { tab: 'illnesses' } });
        }
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to add illness', type: 'error' });
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  const childVisits = formData.child_id 
    ? visits.filter(v => v.child_id === formData.child_id)
    : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link 
            to={((location.state as { fromChild?: boolean; childId?: number })?.fromChild && (location.state as { childId?: number }).childId)
              ? `/children/${(location.state as { childId: number }).childId}`
              : '/'} 
            state={{ tab: 'illnesses' }}
            className="breadcrumb"
          >
            ← Back to {((location.state as { fromChild?: boolean; childId?: number })?.fromChild) ? (children.find(c => c.id === (location.state as { childId?: number })?.childId)?.name || 'Child') : 'Illnesses'}
          </Link>
          <h1>Add Illness</h1>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <Card title="Illness">
          {!initialChildId && (
            <FormField
              label="Child"
              type="select"
              value={formData.child_id ? formData.child_id.toString() : ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, child_id: parseInt(e.target.value) })}
              required
              disabled={submitting}
              options={[
                { value: '', label: 'Select a child...' },
                ...children.map(child => ({ value: child.id.toString(), label: child.name }))
              ]}
            />
          )}

          <div className="form-field">
            <label className="form-label">Illness Type</label>
            <IllnessesInput
              value={selectedIllnesses}
              onChange={(ills) => {
                setSelectedIllnesses(ills);
                setFormData({ ...formData, illness_type: ills && ills.length > 0 ? ills[0] : ('' as IllnessType) });
              }}
              disabled={submitting}
            />
          </div>

          <FormField
            label="Start Date"
            type="date"
            value={formData.start_date || ''}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
            disabled={submitting}
            max={getTodayDate()}
          />

          <FormField
            label="End Date (optional - leave blank if ongoing)"
            type="date"
            value={formData.end_date || ''}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
            disabled={submitting}
            min={formData.start_date}
            max={getTodayDate()}
          />

          <FormField
            label="Symptoms"
            type="textarea"
            value={formData.symptoms || ''}
            onChange={(e) => setFormData({ ...formData, symptoms: e.target.value || null })}
            disabled={submitting}
            placeholder="Describe symptoms..."
            rows={3}
          />

          <Checkbox
            label="Fever"
            checked={formData.temperature !== null}
            onChange={(checked) => setFormData({ 
              ...formData, 
              temperature: checked ? 100.4 : null 
            })}
            disabled={submitting}
          />

          <SeveritySelector
            value={formData.severity || null}
            onChange={(severity) => setFormData({ ...formData, severity })}
            disabled={submitting}
          />

          {childVisits.length > 0 && (
            <FormField
              label="Link to Visit (optional)"
              type="select"
              value={formData.visit_id ? formData.visit_id.toString() : ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, visit_id: e.target.value ? parseInt(e.target.value) : null })}
              disabled={submitting}
              options={[
                { value: '', label: 'No visit link' },
                ...childVisits.map(visit => ({ 
                  value: visit.id.toString(), 
                  label: `Visit on ${visit.visit_date}` 
                }))
              ]}
            />
          )}

          <FormField
            label="Notes"
            type="textarea"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
            disabled={submitting}
            placeholder="Any additional notes..."
            rows={3}
          />
        </Card>

        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding Illness...' : 'Add Illness'}
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            disabled={submitting}
            onClick={() => {
              // Navigate back to where we came from, or to Home illnesses tab if no origin
              const state = location.state as { fromChild?: boolean; childId?: number; fromTab?: string } | null;
              if (state?.fromChild && state?.childId != null) {
                navigate(`/children/${state.childId}`, { state: { tab: state.fromTab ?? 'illnesses' } });
              } else {
                navigate('/', { state: { tab: 'illnesses' } });
              }
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddIllnessPage;
