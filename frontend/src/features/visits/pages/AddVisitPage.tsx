import { useState, FormEvent, useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '@lib/api-client';
import type { Child, CreateVisitInput, VisitType, IllnessType } from '@shared/types/api';
import { getTodayDate } from '@lib/validation';
import { isFutureDate } from '@lib/date-utils';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { VisitTypeModal } from '@features/visits';
import { useFormState } from '@shared/hooks';
import { VISIT_TYPE_DEFAULTS, getSectionById, SectionWrapper, VisitFormSidebar } from '@visit-form';
// Import new helpers for form initialization
import { createEmptyVisitForm } from '../lib';
import layoutStyles from '@shared/styles/visit-detail-layout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import formLayout from '@shared/styles/VisitFormLayout.module.css';
import styles from './AddVisitPage.module.css';

interface VisitFormState {
  visit: CreateVisitInput;
  selectedIllnesses: IllnessType[];
}


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

  // Initialize form state with semantic helper
  const { state: formState, update: updateForm, getCurrent: getCurrentForm } = useFormState<VisitFormState>({
    initialValue: {
      visit: createEmptyVisitForm(initialVisitType || 'wellness'),
      selectedIllnesses: [],
    },
  });

  const { visit: formData, selectedIllnesses } = formState;

  const setFormData = useCallback<Dispatch<SetStateAction<CreateVisitInput>>>(
    (value) => {
      const current = getCurrentForm().visit;
      const next = typeof value === 'function' ? (value as (prev: CreateVisitInput) => CreateVisitInput)(current) : value;
      updateForm('visit', next);
    },
    [getCurrentForm, updateForm]
  );

  const setSelectedIllnesses = useCallback<Dispatch<SetStateAction<IllnessType[]>>>(
    (value) => {
      const current = getCurrentForm().selectedIllnesses;
      const next = typeof value === 'function' ? (value as (prev: IllnessType[]) => IllnessType[])(current) : value;
      updateForm('selectedIllnesses', next);
    },
    [getCurrentForm, updateForm]
  );

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
      setActiveSections(VISIT_TYPE_DEFAULTS[formData.visit_type]);
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
  const fromState = (location.state || {}) as { from?: string; fromTab?: string; fromChild?: boolean; childId?: string | number; fromVisits?: boolean };
  const originFrom = typeof fromState.from === 'string' ? fromState.from : null;
  const originFromTab = fromState.fromTab as string | undefined; // e.g. 'visits' when returning to home tab
  const originFromChild = !!fromState.fromChild;
  const originChildId = fromState.childId ? parseInt(String(fromState.childId)) : (childIdFromUrl ? parseInt(childIdFromUrl) : null);
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
      setSelectedIllnesses,
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
      setFormData,
      submitting,
      recentLocations,
      recentDoctors,
      selectedIllnesses,
      setSelectedIllnesses,
      pendingFiles,
      children,
      selectedChildId,
      isLimitedForm,
    ]
  );

  /**
   * Handle visit form submission
   * Validates form based on date (future = limited validation, past = full validation)
   * Creates visit, uploads attachments, navigates to visit detail
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const { visit: currentVisit, selectedIllnesses: currentIllnesses } = getCurrentForm();

    // Basic validation: date is required
    if (!currentVisit.visit_date || !currentVisit.visit_date.trim()) {
      setNotification({ message: 'Please enter a visit date', type: 'error' });
      return;
    }

    // Conditional validation: future visits need less data, past/today need complete data
    if (!useShortenedForm) {
      // Past/today visits require type-specific validation
      if (currentVisit.visit_type === 'sick' && (!currentIllnesses || currentIllnesses.length === 0)) {
        setNotification({ message: 'Please select at least one illness for sick visits', type: 'error' });
        return;
      }

      if (currentVisit.visit_type === 'injury' && !currentVisit.injury_type) {
        setNotification({ message: 'Please enter an injury type', type: 'error' });
        return;
      }
    }

    setSubmitting(true);

    try {
      // Prepare payload: future visits send minimal fields, full visits send all fields
      let payload: CreateVisitInput;
      if (useShortenedForm) {
        // Future appointment: only pre-appointment fields
        payload = {
          child_id: currentVisit.child_id,
          visit_date: currentVisit.visit_date,
          visit_time: currentVisit.visit_time ?? null,
          visit_type: currentVisit.visit_type,
          location: currentVisit.location ?? null,
          doctor_name: currentVisit.doctor_name ?? null,
          title: currentVisit.title ?? null,
          notes: currentVisit.notes ?? null,
          tags: currentVisit.tags ?? null,
        };
      } else {
        // Full visit: all fields + selected illnesses
        payload = { ...currentVisit };
        if (currentVisit.visit_type === 'sick' && currentIllnesses && currentIllnesses.length > 0) {
          payload.illnesses = currentIllnesses;
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
                type SectionId = import('../visit-form').SectionId;
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
