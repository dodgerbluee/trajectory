import { useState, FormEvent, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { illnessesApi, childrenApi, visitsApi, ApiClientError } from '../lib/api-client';
import type { Child, UpdateIllnessInput, IllnessType, Illness } from '../types/api';
import { getTodayDate } from '../lib/validation';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import IllnessEntryFormFields from '../components/IllnessEntryFormFields';
import { SectionWrapper } from '../visit-form/SectionWrapper';
import layoutStyles from '../styles/visit-detail-layout.module.css';
import pageLayout from '../styles/page-layout.module.css';

function EditIllnessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

      setFormData({
        start_date: fetchedIllness.start_date,
        end_date: fetchedIllness.end_date,
        symptoms: fetchedIllness.symptoms,
        temperature: fetchedIllness.temperature,
        severity: fetchedIllness.severity,
        visit_id: fetchedIllness.visit_id,
        notes: fetchedIllness.notes,
      });
      setSelectedIllnesses(fetchedIllness.illness_types?.length ? [...fetchedIllness.illness_types] : []);
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

    const startDate = formData.start_date ?? illness.start_date;
    const endDate = formData.end_date !== undefined ? formData.end_date : illness.end_date;

    if (endDate && endDate < startDate) {
      setNotification({ message: 'End date must be after start date', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      await illnessesApi.update(illness.id, { ...formData, illness_types: selectedIllnesses });
      setNotification({ message: 'Illness updated successfully!', type: 'success' });
      setTimeout(() => {
        navigate(`/illnesses/${illness.id}`);
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
    return (
      <div className={pageLayout.pageContainer}>
        <Card>
          <p className="empty-state">Illness not found.</p>
        </Card>
      </div>
    );
  }

  const child = children.find(c => c.id === illness.child_id);
  const childVisits = visits.filter(v => v.child_id === illness.child_id);

  const illnessEntryValue = {
    symptoms: formData.symptoms !== undefined ? formData.symptoms : illness.symptoms,
    temperature: formData.temperature !== undefined ? formData.temperature : illness.temperature,
    illness_severity: formData.severity !== undefined ? formData.severity : illness.severity,
    start_date: formData.start_date ?? illness.start_date,
    end_date: formData.end_date !== undefined ? formData.end_date : illness.end_date,
  };

  const handleIllnessEntryChange = (next: import('../components/IllnessEntryFormFields').IllnessEntryFormValue) => {
    setFormData(prev => ({
      ...prev,
      symptoms: next.symptoms,
      temperature: next.temperature,
      severity: next.illness_severity ?? undefined,
      start_date: next.start_date ?? undefined,
      end_date: next.end_date,
    }));
  };

  return (
    <div className={pageLayout.pageContainer}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <div className={layoutStyles.detailBody}>
            <div className={layoutStyles.detailHeader}>
              <Link to={`/illnesses/${illness.id}`} className={pageLayout.breadcrumb}>
                ← Back to Illness
              </Link>
              <div className={layoutStyles.detailActions}>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating Illness...' : 'Update Illness'}
                </Button>
                <Link to={`/illnesses/${illness.id}`}>
                  <Button type="button" variant="secondary" disabled={submitting}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>

            <h2 className={layoutStyles.headerTitle}>Edit Illness{child ? ` — ${child.name}` : ''}</h2>

            <SectionWrapper sectionId="illness" label="Illness" removable={false} isLast>
                <div className="form-field">
                  <label className="form-label">Child</label>
                  <div className="form-readonly">{child?.name ?? `Child #${illness.child_id}`}</div>
                </div>

                <IllnessEntryFormFields
                  value={illnessEntryValue}
                  onChange={handleIllnessEntryChange}
                  selectedIllnesses={selectedIllnesses}
                  onSelectedIllnessesChange={(ills) => {
                    setSelectedIllnesses(ills);
                  }}
                  disabled={submitting}
                  dateMode="standalone"
                  maxStartDate={getTodayDate()}
                  minEndDate={formData.start_date ?? illness.start_date}
                />

                {childVisits.length > 0 && (
                  <FormField
                    label="Link to Visit (optional)"
                    type="select"
                    value={(formData.visit_id !== undefined ? formData.visit_id : illness.visit_id)?.toString() ?? ''}
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
                  value={(formData.notes !== undefined ? formData.notes : illness.notes) ?? ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  disabled={submitting}
                  placeholder="Any additional notes..."
                  rows={3}
                />
            </SectionWrapper>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default EditIllnessPage;
