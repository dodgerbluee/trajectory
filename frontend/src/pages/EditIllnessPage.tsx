import { useState, FormEvent, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { illnessesApi, childrenApi, visitsApi, ApiClientError } from '../lib/api-client';
import type { Child, UpdateIllnessInput, IllnessType, Illness } from '../types/api';
import { getTodayDate } from '../lib/validation';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import SeveritySelector from '../components/SeveritySelector';
import IllnessesInput from '../components/IllnessesInput';

function EditIllnessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [illness, setIllness] = useState<Illness | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [visits, setVisits] = useState<{ id: number; visit_date: string; child_id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = useState<UpdateIllnessInput>({});
  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [illnessResponse, childrenResponse, visitsResponse] = await Promise.all([
        illnessesApi.getById(parseInt(id!)),
        childrenApi.getAll(),
        visitsApi.getAll({ visit_type: 'sick', limit: 100 }),
      ]);
      
      const fetchedIllness = illnessResponse.data;
      setIllness(fetchedIllness);
      setChildren(childrenResponse.data);
      setVisits(visitsResponse.data);

      // Populate form data
      setFormData({
        illness_type: fetchedIllness.illness_type,
        start_date: fetchedIllness.start_date,
        end_date: fetchedIllness.end_date,
        symptoms: fetchedIllness.symptoms,
        temperature: fetchedIllness.temperature,
        severity: fetchedIllness.severity,
        visit_id: fetchedIllness.visit_id,
        notes: fetchedIllness.notes,
      });
      setSelectedIllnesses(fetchedIllness.illness_type ? [fetchedIllness.illness_type] : []);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to load illness data', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!illness) return;

    const startDate = formData.start_date || illness.start_date;
    const endDate = formData.end_date !== undefined ? formData.end_date : illness.end_date;
    
    if (endDate && endDate < startDate) {
      setNotification({ message: 'End date must be after start date', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      await illnessesApi.update(illness.id, formData);
      setNotification({ message: 'Illness updated successfully!', type: 'success' });
      setTimeout(() => {
        // Navigate back to child page if we came from there, otherwise go to illnesses page
        const navChildId = (location.state as any)?.childId || illness.child_id;
        const fromChild = (location.state as any)?.fromChild || false;
        if (fromChild && navChildId) {
          navigate(`/children/${navChildId}`);
        } else {
          navigate('/illnesses');
        }
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to update illness', type: 'error' });
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (!illness) {
    return <div>Illness not found</div>;
  }

  const child = children.find(c => c.id === illness.child_id);
  const childVisits = visits.filter(v => v.child_id === illness.child_id);
  const childId = (location.state as any)?.childId || illness.child_id;
  const fromChild = (location.state as any)?.fromChild || false;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link 
            to={fromChild ? `/children/${childId}` : '/illnesses'} 
            className="breadcrumb"
          >
            ← Back to {fromChild ? (child?.name || 'Child') : 'Illnesses'}
          </Link>
          <h1>Edit Illness{child ? ` for ${child.name}` : ''}</h1>
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
          <div className="form-field">
            <label className="form-label">Child</label>
            <div className="form-readonly">{child?.name || `Child #${illness.child_id}`}</div>
          </div>

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
            value={formData.start_date || illness.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
            disabled={submitting}
            max={getTodayDate()}
          />

          <FormField
            label="End Date (optional - leave blank if ongoing)"
            type="date"
            value={formData.end_date !== undefined ? (formData.end_date || '') : (illness.end_date || '')}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
            disabled={submitting}
            min={formData.start_date || illness.start_date}
            max={getTodayDate()}
          />

          <FormField
            label="Symptoms"
            type="textarea"
            value={formData.symptoms !== undefined ? (formData.symptoms || '') : (illness.symptoms || '')}
            onChange={(e) => setFormData({ ...formData, symptoms: e.target.value || null })}
            disabled={submitting}
            placeholder="Describe symptoms..."
            rows={3}
          />

            <div className="form-field">
              <label className="form-field-label">
                <input
                  type="checkbox"
                  checked={(formData.temperature !== undefined ? formData.temperature : illness.temperature) !== null}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    temperature: e.target.checked ? 100.4 : null 
                  })}
                  disabled={submitting}
                />
                <span>Fever</span>
              </label>
            </div>

          <SeveritySelector
            value={formData.severity !== undefined ? (formData.severity || null) : (illness.severity || null)}
            onChange={(severity) => setFormData({ ...formData, severity })}
            disabled={submitting}
          />

          {childVisits.length > 0 && (
            <FormField
              label="Link to Visit (optional)"
              type="select"
              value={formData.visit_id !== undefined 
                ? (formData.visit_id ? formData.visit_id.toString() : '') 
                : (illness.visit_id ? illness.visit_id.toString() : '')}
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
            value={formData.notes !== undefined ? (formData.notes || '') : (illness.notes || '')}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
            disabled={submitting}
            placeholder="Any additional notes..."
            rows={3}
          />
        </Card>

        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Updating Illness...' : 'Update Illness'}
          </Button>
          <Link to="/illnesses">
            <Button type="button" variant="secondary" disabled={submitting}>
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default EditIllnessPage;
