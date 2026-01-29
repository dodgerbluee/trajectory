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
import IllnessEntryFormFields from '../components/IllnessEntryFormFields';

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

  type AddIllnessFormData = Omit<CreateIllnessInput, 'illness_type'> & { illness_type: IllnessType | null };
  const [formData, setFormData] = useState<AddIllnessFormData>({
    child_id: initialChildId,
    illness_type: null,
    start_date: getTodayDate(),
    end_date: null,
    symptoms: null,
    temperature: null,
    severity: null,
    visit_id: null,
    notes: null,
  });

  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);

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
      const payload: CreateIllnessInput = { ...formData, illness_type: formData.illness_type };
      const res = await illnessesApi.create(payload);
      setNotification({ message: 'Illness added successfully!', type: 'success' });
      setTimeout(() => {
        const state = location.state as { fromChild?: boolean; childId?: number; fromTab?: string } | null;
        if (res.data?.id != null) {
          navigate(`/illnesses/${res.data.id}`, { state: state ?? undefined });
        } else if (state?.fromChild && state?.childId != null) {
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

  const backHref = ((location.state as { fromChild?: boolean; childId?: number })?.fromChild && (location.state as { childId?: number }).childId)
    ? `/children/${(location.state as { childId: number }).childId}`
    : '/';
  const backLabel = ((location.state as { fromChild?: boolean })?.fromChild)
    ? (children.find(c => c.id === (location.state as { childId?: number })?.childId)?.name || 'Child')
    : 'Illnesses';

  const illnessEntryValue = {
    ...formData,
    illness_severity: formData.severity,
  };

  const handleIllnessEntryChange = (next: import('../components/IllnessEntryFormFields').IllnessEntryFormValue) => {
    setFormData(prev => ({
      ...prev,
      illness_type: next.illness_type ?? prev.illness_type,
      symptoms: next.symptoms,
      temperature: next.temperature,
      severity: next.illness_severity ?? null,
      start_date: next.start_date ?? prev.start_date,
      end_date: next.end_date,
    }));
  };

  return (
    <div className="page-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="visit-detail-body">
            <div className="visit-detail-header">
              <Link to={backHref} state={{ tab: 'illnesses' }} className="breadcrumb">
                ← Back to {backLabel}
              </Link>
              <div className="visit-detail-actions">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding Illness...' : 'Add Illness'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => {
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
            </div>

            <h2 className="visit-header-title">Add Illness</h2>

            <section className="visit-detail-section visit-detail-section-last">
              <div className="visit-detail-section-header">
                <h3 className="visit-detail-section-title">Illness</h3>
              </div>
              <div className="visit-detail-section-body">
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
                      ...children.map(child => ({ value: child.id.toString(), label: child.name })),
                    ]}
                  />
                )}

                <IllnessEntryFormFields
                  value={illnessEntryValue}
                  onChange={handleIllnessEntryChange}
                  selectedIllnesses={selectedIllnesses}
                  onSelectedIllnessesChange={(ills) => {
                    setSelectedIllnesses(ills);
                    setFormData(prev => ({ ...prev, illness_type: ills?.length ? ills[0] : null }));
                  }}
                  disabled={submitting}
                  dateMode="standalone"
                  maxStartDate={getTodayDate()}
                  minEndDate={formData.start_date ?? undefined}
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
                        label: `Visit on ${visit.visit_date}`,
                      })),
                    ]}
                  />
                )}

                <FormField
                  label="Notes"
                  type="textarea"
                  value={formData.notes ?? ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  disabled={submitting}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </section>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default AddIllnessPage;
