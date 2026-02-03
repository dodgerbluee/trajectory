import { useState, FormEvent, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Child, CreateVisitInput, VisitType, IllnessType } from '../types/api';
import { getTodayDate } from '../lib/validation';
import { isFutureDate } from '../lib/date-utils';
import Card from '../shared/components/Card';
import Button from '../shared/components/Button';
import Notification from '../shared/components/Notification';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import VisitTypeModal from '../shared/components/VisitTypeModal';
import { getDefaultSectionsForVisitType } from '../visit-form/visitTypeDefaults';
import { getSectionById } from '../visit-form/sectionRegistry';
import { SectionWrapper } from '../visit-form/SectionWrapper';
import { VisitFormSidebar } from '../visit-form/VisitFormSidebar';
import layoutStyles from '../shared/styles/visit-detail-layout.module.css';
import pageLayout from '../shared/styles/page-layout.module.css';
import formLayout from '../shared/styles/VisitFormLayout.module.css';
import styles from './AddVisitPage.module.css';



function AddVisitPage() {
  const { childId: childIdFromUrl } = useParams<{ childId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showVisitTypeModal, setShowVisitTypeModal] = useState(false);

  const visitTypeFromUrl = searchParams.get('type') as VisitType | null;
  const initialVisitType = visitTypeFromUrl || null;

  const [formData, setFormData] = useState<CreateVisitInput>({
    child_id: 0,
    visit_date: '',
    visit_time: null,
    visit_type: initialVisitType || 'wellness',
    location: null,
    doctor_name: null,
    title: null,
    weight_value: null,
    weight_ounces: null,
    weight_percentile: null,
    height_value: null,
    height_percentile: null,
    head_circumference_value: null,
    head_circumference_percentile: null,
    bmi_value: null,
    bmi_percentile: null,
    blood_pressure: null,
    heart_rate: null,
    symptoms: null,
    temperature: null,
    illness_start_date: null,
    end_date: null,
    injury_type: null,
    injury_location: null,
    treatment: null,
    vision_prescription: null,
    ordered_glasses: null,
    ordered_contacts: null,
    vision_refraction: { od: { sphere: null, cylinder: null, axis: null }, os: { sphere: null, cylinder: null, axis: null }, notes: undefined } as any,
    dental_procedure_type: null,
    dental_notes: null,
    cleaning_type: null,
    cavities_found: null,
    cavities_filled: null,
    xrays_taken: null,
    fluoride_treatment: null,
    sealants_applied: null,
    next_appointment_date: null,
    dental_procedures: null,
    vaccines_administered: [],
    prescriptions: [],
    tags: [],
    notes: null,
    create_illness: false,
    illness_severity: null,
  });

  // Support multiple illnesses client-side (kept simple and compatible)
  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);
  // Ref so submit always sees latest (avoids stale closure when user clicks Save then Submit quickly)
  // Ref updated only in setter so we never overwrite with stale state (e.g. after Save in popup + formData update)
  const selectedIllnessesRef = useRef<IllnessType[]>([]);
  const setSelectedIllnessesAndRef: Dispatch<SetStateAction<IllnessType[]>> = (value) => {
    if (typeof value === 'function') {
      setSelectedIllnesses((prev) => {
        const next = value(prev);
        selectedIllnessesRef.current = next;
        return next;
      });
    } else {
      selectedIllnessesRef.current = value;
      setSelectedIllnesses(value);
    }
  };

  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [recentDoctors, setRecentDoctors] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  /** When user clicks "Use full visit form" on a future-dated add, show full form. */
  const [userChoseFullForm, setUserChoseFullForm] = useState(false);

  /** No date yet: form starts with only visit details at top. */
  const hasDate = !!(formData.visit_date && formData.visit_date.trim());
  const noDateYet = !hasDate;
  /** When date is future → limited form unless user chose full form. */
  const isDateFuture = hasDate && isFutureDate(formData.visit_date);
  const useShortenedForm = isDateFuture && !userChoseFullForm;

  /** activeSections: no date = only visit-information; future date (limited) = visit-information + notes; past/today or user chose full = full default. */
  const [activeSections, setActiveSections] = useState<string[]>(() => ['visit-information']);

  /** Sync sections when date is entered/changed, visit type, or user chose full form. */
  useEffect(() => {
    if (noDateYet) {
      setActiveSections(['visit-information']);
    } else if (useShortenedForm) {
      setActiveSections(['visit-information', 'notes']);
    } else {
      setActiveSections(getDefaultSectionsForVisitType(formData.visit_type));
    }
  }, [formData.visit_type, noDateYet, useShortenedForm]);

  const removeSection = (sectionId: string) => {
    setActiveSections((prev) => prev.filter((id) => id !== sectionId));
  };

  const addSection = (sectionId: string) => {
    setActiveSections((prev) => {
      if (prev.includes(sectionId)) return prev;
      const notesIndex = prev.indexOf('notes');
      const insertAt = notesIndex === -1 ? prev.length : notesIndex;
      return [...prev.slice(0, insertAt), sectionId, ...prev.slice(insertAt)];
    });
  };

  useEffect(() => {
    loadChildren();
    // Show modal if visit type not provided in URL
    if (!visitTypeFromUrl) {
      setShowVisitTypeModal(true);
    }
  }, [visitTypeFromUrl]);

  // Determine origin for back/cancel navigation
  const fromState = (location.state || {}) as any;
  const originFrom = typeof fromState.from === 'string' ? fromState.from : null;
  const originFromTab = fromState.fromTab as string | undefined; // e.g. 'visits' when returning to home tab
  const originFromChild = !!fromState.fromChild;
  const originChildId = fromState.childId ? parseInt(fromState.childId) : (childIdFromUrl ? parseInt(childIdFromUrl) : null);
  const originFromVisits = !!fromState.fromVisits;

  useEffect(() => {
    // Set initial child selection
    if (children.length > 0 && selectedChildId === null) {
      const initialChildId = childIdFromUrl
        ? parseInt(childIdFromUrl)
        : children[0].id;

      if (children.find(c => c.id === initialChildId)) {
        setSelectedChildId(initialChildId);
        setFormData(prev => ({ ...prev, child_id: initialChildId }));
        loadRecentData(initialChildId);
      }
    }
  }, [children, childIdFromUrl]);

  useEffect(() => {
    // Update form data when selected child changes
    if (selectedChildId) {
      setFormData(prev => ({ ...prev, child_id: selectedChildId }));
      loadRecentData(selectedChildId);
    }
  }, [selectedChildId]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const response = await childrenApi.getAll();
      setChildren(response.data);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecentData = async (childId: number) => {
    try {
      const response = await visitsApi.getAll({ child_id: childId });
      const locations = [...new Set(response.data.map(v => v.location).filter(Boolean))] as string[];
      const doctors = [...new Set(response.data.map(v => v.doctor_name).filter(Boolean))] as string[];
      setRecentLocations(locations);
      setRecentDoctors(doctors);
    } catch (error) {
      // Silently fail - recent data is optional
    }
  };

  const handleFileUpload = (files: File | File[]) => {
    const arr = Array.isArray(files) ? files : [files];
    setPendingFiles((prev) => [...prev, ...arr]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  /** Limited form when no date yet or future date and user hasn't chosen full form (no outcome sections). */
  const isLimitedForm = noDateYet || useShortenedForm;

  /** Must run unconditionally (before any early return) to satisfy Rules of Hooks. */
  const visitFormContext = useMemo(
    () => ({
      mode: 'add' as const,
      formData,
      setFormData,
      submitting,
      showTitle: formData.visit_type === 'wellness',
      recentLocations,
      recentDoctors,
      getTodayDate,
      selectedIllnesses,
      setSelectedIllnesses: setSelectedIllnessesAndRef,
      pendingFiles,
      handleRemoveFile,
      handleFileUpload,
      children,
      selectedChildId: selectedChildId ?? null,
      setSelectedChildId,
      isFutureVisit: isLimitedForm,
    }),
    [
      formData,
      submitting,
      recentLocations,
      recentDoctors,
      selectedIllnesses,
      pendingFiles,
      children,
      selectedChildId,
      isLimitedForm,
    ]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.visit_date || !formData.visit_date.trim()) {
      setNotification({ message: 'Please enter a visit date', type: 'error' });
      return;
    }

    if (useShortenedForm) {
      // Future visit: no outcome/type-specific validation; backend allows pending appointments without injury_type/illnesses
    } else {
      // Use ref so we always have latest illnesses (avoids stale closure when Save then Submit quickly)
      const illnessesToSend = formData.visit_type === 'sick' ? selectedIllnessesRef.current : null;
      if (formData.visit_type === 'sick' && (!illnessesToSend || illnessesToSend.length === 0)) {
        setNotification({ message: 'Please select at least one illness for sick visits', type: 'error' });
        return;
      }

      if (formData.visit_type === 'injury' && !formData.injury_type) {
        setNotification({ message: 'Please enter an injury type', type: 'error' });
        return;
      }
    }

    setSubmitting(true);

    try {
      // Build payload. For future date, send only pre-appointment fields.
      let payload: CreateVisitInput;
      if (useShortenedForm) {
        payload = {
          child_id: formData.child_id,
          visit_date: formData.visit_date,
          visit_time: formData.visit_time ?? null,
          visit_type: formData.visit_type,
          location: formData.location ?? null,
          doctor_name: formData.doctor_name ?? null,
          title: formData.title ?? null,
          notes: formData.notes ?? null,
          tags: formData.tags ?? null,
        };
      } else {
        payload = { ...formData };
        const illnessesToSend = formData.visit_type === 'sick' ? selectedIllnessesRef.current : null;
        if (formData.visit_type === 'sick' && illnessesToSend && illnessesToSend.length > 0) {
          (payload as any).illnesses = illnessesToSend;
        }
      }
      // Create the visit
      const response = await visitsApi.create(payload);
      const visitId = response.data.id;

      // Upload pending files only for past/today visits (full form)
      if (!useShortenedForm && pendingFiles.length > 0) {
        try {
          await Promise.all(
            pendingFiles.map(file => visitsApi.uploadAttachment(visitId, file))
          );
        } catch (uploadError) {
          // Visit was created but file upload failed - still show success but warn
          console.error('Failed to upload some attachments:', uploadError);
          setNotification({
            message: 'Visit created successfully, but some attachments failed to upload.',
            type: 'error'
          });
          setTimeout(() => {
            navigate(`/visits/${visitId}`);
          }, 2000);
          setSubmitting(false);
          return;
        }
      }

      setNotification({ message: useShortenedForm ? 'Future visit added!' : 'Visit added successfully!', type: 'success' });
      setTimeout(() => {
        navigate(`/visits/${visitId}`);
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to add visit', type: 'error' });
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (children.length === 0) {
    return (
      <div className={pageLayout.pageContainer}>
        <Card>
          <p className={pageLayout.emptyState}>
            No children added yet. <Link to="/children/new">Add a child</Link> first to create visits.
          </p>
        </Card>
      </div>
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);
  const childName = selectedChild?.name || 'Child';

  const handleCancel = () => {
    if (originFromTab || originFromVisits) {
      navigate('/', { state: { tab: originFromTab || 'visits' } });
    } else if (originFrom) {
      navigate(originFrom);
    } else if (originFromChild && originChildId) {
      navigate(`/children/${originChildId}`);
    } else if (childIdFromUrl) {
      navigate(`/children/${childIdFromUrl}`);
    } else {
      navigate('/', { state: { tab: 'visits' } });
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
          <div className={`${formLayout.root} ${formLayout.hasDateBanner}`}>
            <div className={formLayout.backRow}>
              <Link
                to={selectedChildId ? `/children/${selectedChildId}` : '/'}
                className={`${pageLayout.breadcrumb} ${formLayout.backLink}`}
              >
                ← Back to {childName}
              </Link>
              <div className={styles.visitDetailActions}>
                <Button type="submit" disabled={submitting} size="sm">
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="secondary" size="sm" disabled={submitting} onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
            <div className={formLayout.sidebarCell}>
              <VisitFormSidebar
                activeSections={activeSections}
                onAddSection={addSection}
                isFutureVisit={isLimitedForm}
                showUseFullFormButton={isDateFuture && useShortenedForm}
                onUseFullForm={isDateFuture ? () => setUserChoseFullForm(true) : undefined}
              />
            </div>
            <div className={formLayout.topRow}>
              <h2 className={`${layoutStyles.headerTitle} ${formLayout.headerTitle}`}>
                Add {formData.visit_type === 'wellness' ? 'Wellness' :
                  formData.visit_type === 'sick' ? 'Sick' :
                    formData.visit_type === 'injury' ? 'Injury' :
                      formData.visit_type === 'vision' ? 'Vision' :
                        formData.visit_type === 'dental' ? 'Dental' : 'Visit'} Visit
              </h2>
            </div>
            <div className={formLayout.dateBanner} role="status">
              {noDateYet ? (
                <>
                  <strong>How it works:</strong> The form depends on the date you enter.<br />
                  <div className={formLayout.dateBannerBullets}>
                    <div className={formLayout.dateBannerBullet}>• A <strong>visit</strong> is a past or current date and shows the full form (measurements, illness, vaccines, etc.).</div>
                    <div className={formLayout.dateBannerBullet}>• A <strong>scheduled visit</strong> is a future date and shows a limited form (details and notes only).</div>
                  </div>
                  Enter a visit date to continue.
                </>
              ) : useShortenedForm ? (
                <>
                  <strong>Scheduled visit</strong> (future date). This limited form captures details and notes. Add outcome information after the visit, or use the sidebar to switch to the full form.
                </>
              ) : (
                <>
                  <strong>Visit</strong> (past or current date). Use the full form below to add measurements, illness, vaccines, and other outcome details.
                </>
              )}
            </div>
            <div className={`${formLayout.bodyCell} ${layoutStyles.detailBody}`}>
              {(() => {
                type SectionId = import('../visit-form/sectionRegistry').SectionId;
                const sectionsToRender: { sectionId: SectionId; entry: NonNullable<ReturnType<typeof getSectionById>> }[] = [];
                for (const id of activeSections) {
                  const entry = getSectionById(id as SectionId);
                  if (entry) sectionsToRender.push({ sectionId: id as SectionId, entry });
                }
                return sectionsToRender.map(({ sectionId, entry }, index) => {
                  const Component = entry.component;
                  const isLast = index === sectionsToRender.length - 1;
                  return (
                    <SectionWrapper
                      key={sectionId}
                      sectionId={sectionId}
                      label={entry.label}
                      hideTitle={entry.hideTitle}
                      removable={entry.removable}
                      onRemove={() => removeSection(sectionId)}
                      isLast={isLast}
                    >
                      <Component sectionId={sectionId} context={visitFormContext} />
                    </SectionWrapper>
                  );
                });
              })()}
            </div>
          </div>
        </Card>
      </form>

      <VisitTypeModal
        isOpen={showVisitTypeModal}
        onSelect={(visitType: VisitType) => {
          setFormData({ ...formData, visit_type: visitType });
          setShowVisitTypeModal(false);
        }}
        onClose={() => {
          setShowVisitTypeModal(false);
          handleCancel();
        }}
      />
    </div>
  );
}

export default AddVisitPage;
