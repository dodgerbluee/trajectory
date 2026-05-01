import { useState, FormEvent, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { illnessesApi, peopleApi, visitsApi, ApiClientError } from '@lib/api-client';
import type { Person, CreateIllnessInput, IllnessType } from '@shared/types/api';
import { getTodayDate } from '@lib/validation';
import Card from '@shared/components/Card';
import FormField from '@shared/components/FormField';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { IllnessEntryFormFields } from '@features/illnesses';
import { SectionWrapper } from '@visit-form';
import layoutStyles from '@shared/styles/visit-detail-layout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';

function AddIllnessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [people, setPeople] = useState<Person[]>([]);
  const [visits, setVisits] = useState<{ id: number; visit_date: string; person_id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const personIdFromUrl = searchParams.get('person_id');
  const initialChildId = personIdFromUrl ? parseInt(personIdFromUrl) : 0;

  type AddIllnessFormData = Omit<CreateIllnessInput, 'illness_types'> & { illness_types: IllnessType[] };
  const [formData, setFormData] = useState<AddIllnessFormData>({
    person_id: initialChildId,
    illness_types: [],
    start_date: getTodayDate(),
    end_date: null,
    symptoms: null,
    temperature: null,
    severity: null,
    visit_id: null,
    notes: null,
  });

  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);
  const selectedIllnessesRef = useRef<IllnessType[]>([]);

  useEffect(() => {
    loadData();
  }, [initialChildId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [peopleResponse, visitsResponse] = await Promise.all([
        peopleApi.getAll(),
        initialChildId
          ? visitsApi.getAll({ person_id: initialChildId, visit_type: 'sick', limit: 100 })
          : visitsApi.getAll({ visit_type: 'sick', limit: 100 }),
      ]);
      setPeople(peopleResponse.data);
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

    if (!formData.person_id) {
      setNotification({ message: 'Please select a person', type: 'error' });
      return;
    }

    const illnessTypes = selectedIllnessesRef.current.length > 0 ? selectedIllnessesRef.current : formData.illness_types;
    if (illnessTypes.length === 0) {
      setNotification({ message: 'Please select at least one illness type', type: 'error' });
      return;
    }

    if (formData.end_date && formData.end_date < formData.start_date) {
      setNotification({ message: 'End date must be after start date', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await illnessesApi.create({
        person_id: formData.person_id,
        illness_types: illnessTypes,
        start_date: formData.start_date,
        end_date: formData.end_date ?? undefined,
        symptoms: formData.symptoms ?? undefined,
        temperature: formData.temperature ?? undefined,
        severity: formData.severity ?? undefined,
        visit_id: formData.visit_id ?? undefined,
        notes: formData.notes ?? undefined,
      });
      setNotification({ message: 'Illness added successfully!', type: 'success' });
      setTimeout(() => {
        const state = location.state as { fromChild?: boolean; personId?: number; fromTab?: string } | null;
        if (res.data?.id != null) {
          navigate(`/illnesses/${res.data.id}`, { state: state ?? undefined });
        } else if (state?.fromChild && state?.personId != null) {
          navigate(`/people/${state.personId}`, { state: { tab: state.fromTab ?? 'illnesses' } });
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

  const personVisits = formData.person_id
    ? visits.filter(v => v.person_id === formData.person_id)
    : [];

  const backHref = ((location.state as { fromChild?: boolean; personId?: number })?.fromChild && (location.state as { personId?: number }).personId)
    ? `/people/${(location.state as { personId: number }).personId}`
    : '/';
  const backLabel = ((location.state as { fromChild?: boolean })?.fromChild)
    ? (people.find(c => c.id === (location.state as { personId?: number })?.personId)?.name || 'Person')
    : 'Illnesses';

  const illnessEntryValue = {
    ...formData,
    illness_severity: formData.severity,
  };

  const handleIllnessEntryChange = (next: import('../components/IllnessEntryFormFields').IllnessEntryFormValue) => {
    setFormData(prev => ({
      ...prev,
      symptoms: next.symptoms,
      temperature: next.temperature,
      severity: next.illness_severity ?? null,
      start_date: next.start_date ?? prev.start_date,
      end_date: next.end_date,
    }));
  };

  const handleCancel = () => {
    const state = location.state as { fromChild?: boolean; personId?: number; fromTab?: string } | null;
    if (state?.fromChild && state?.personId != null) {
      navigate(`/people/${state.personId}`, { state: { tab: state.fromTab ?? 'illnesses' } });
    } else {
      navigate('/', { state: { tab: 'illnesses' } });
    }
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
              <Link to={backHref} state={{ tab: 'illnesses' }} className={pageLayout.breadcrumb}>
                ← Back to {backLabel}
              </Link>
              <div className={`${layoutStyles.detailActions} ${layoutStyles.detailActionsHideOnMobile}`}>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding Illness...' : 'Add Illness'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>

            <h2 className={layoutStyles.headerTitle}>Add Illness</h2>

            <SectionWrapper sectionId="illness" label="Illness" removable={false} isLast>
                {!initialChildId && (
                  <FormField
                    label="Person"
                    type="select"
                    value={formData.person_id ? formData.person_id.toString() : ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, person_id: parseInt(e.target.value) })}
                    required
                    disabled={submitting}
                    options={[
                      { value: '', label: 'Select a person...' },
                      ...people.map(person => ({ value: person.id.toString(), label: person.name })),
                    ]}
                  />
                )}

                <IllnessEntryFormFields
                  value={illnessEntryValue}
                  onChange={handleIllnessEntryChange}
                  selectedIllnesses={selectedIllnesses}
                  onSelectedIllnessesChange={(ills) => {
                    selectedIllnessesRef.current = ills;
                    setSelectedIllnesses(ills);
                  }}
                  disabled={submitting}
                  dateMode="standalone"
                  maxStartDate={getTodayDate()}
                  minEndDate={formData.start_date ?? undefined}
                />

                {personVisits.length > 0 && (
                  <FormField
                    label="Link to Visit (optional)"
                    type="select"
                    value={formData.visit_id ? formData.visit_id.toString() : ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, visit_id: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={submitting}
                    options={[
                      { value: '', label: 'No visit link' },
                      ...personVisits.map(visit => ({
                        value: visit.id.toString(),
                        label: `Visit on ${visit.visit_date}`,
                      })),
                    ]}
                  />
                )}

                <div style={{ marginTop: 'var(--spacing-md)' }}>
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
            </SectionWrapper>

            {/* Mobile-only bottom actions — header row hides Save/Cancel on
                phones; users finish the form and see the actions at the end. */}
            <div className={layoutStyles.bottomActions}>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding Illness...' : 'Add Illness'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default AddIllnessPage;
