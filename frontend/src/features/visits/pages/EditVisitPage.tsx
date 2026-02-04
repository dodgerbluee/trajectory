import { useState, FormEvent, useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '@lib/api-client';
import type { Child, UpdateVisitInput, IllnessType, Visit, VisitAttachment } from '@shared/types/api';
import { getTodayDate } from '@lib/validation';
import { isFutureVisit, isFutureDate } from '@lib/date-utils';
import { visitHasOutcomeData } from '@lib/visit-utils';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Notification from '@shared/components/Notification';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useFormState } from '@shared/hooks';
import { VISIT_TYPE_DEFAULTS, getSectionById, SectionWrapper, VisitFormSidebar } from '@visit-form';
import layoutStyles from '@shared/styles/visit-detail-layout.module.css';
import pageLayout from '@shared/styles/page-layout.module.css';
import formLayout from '@shared/styles/VisitFormLayout.module.css';
import styles from './EditVisitPage.module.css';

interface VisitFormState {
  visit: UpdateVisitInput;
  selectedIllnesses: IllnessType[];
}

/**
 * Page for editing an existing visit
 * Handles both limited (future) and full (past) visit editing
 * Allows toggling between limited and full form for future visits
 */
function EditVisitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [userChoseFullForm, setUserChoseFullForm] = useState(false);
  const forceFullForm = searchParams.get('full') === '1' || (location.state as { editAsFullVisit?: boolean } | null)?.editAsFullVisit === true || userChoseFullForm;

  const [child, setChild] = useState<Child | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { state: formState, update: updateForm, getCurrent: getCurrentForm } = useFormState<VisitFormState>({
    initialValue: {
      visit: {
        visit_date: '',
        visit_time: null,
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
        illness_type: null,
        symptoms: null,
        temperature: null,
        end_date: null,
        vision_prescription: null,
        vision_refraction: { od: { sphere: null, cylinder: null, axis: null }, os: { sphere: null, cylinder: null, axis: null }, notes: undefined },
        ordered_glasses: null,
        ordered_contacts: null,
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
      },
      selectedIllnesses: [],
    },
  });

  const { visit: formData, selectedIllnesses } = formState;

  const setFormData = useCallback<Dispatch<SetStateAction<UpdateVisitInput>>>(
    (value) => {
      const current = getCurrentForm().visit;
      const next = typeof value === 'function' ? (value as (prev: UpdateVisitInput) => UpdateVisitInput)(current) : value;
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
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  /** Step 5: active sections driven by config; no visit-type conditionals in render. */
  const [activeSections, setActiveSections] = useState<string[]>([]);

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
    if (id) {
      loadData(forceFullForm);
    }
  }, [id]); // forceFullForm intentionally omitted: "Use full visit form" expands via separate effect

  const loadData = async (forceFull: boolean) => {
    if (!id) return;

    try {
      setLoading(true);
      const visitResponse = await visitsApi.getById(parseInt(id));
      const visitData = visitResponse.data;
      const childResponse = await childrenApi.getById(visitData.child_id);
      const childData = childResponse.data;
      
      setVisit(visitData);
      setChild(childData);
      
      // Load attachments
      await loadAttachments(parseInt(id));
      
      // Populate form with existing visit data
      setFormData({
        visit_date: visitData.visit_date,
        visit_time: visitData.visit_time ?? null,
        location: visitData.location,
        doctor_name: visitData.doctor_name,
        title: visitData.title,
        weight_value: visitData.weight_value,
        weight_ounces: visitData.weight_ounces,
        weight_percentile: visitData.weight_percentile,
        height_value: visitData.height_value,
        height_percentile: visitData.height_percentile,
        head_circumference_value: visitData.head_circumference_value,
        head_circumference_percentile: visitData.head_circumference_percentile,
        bmi_value: visitData.bmi_value,
        bmi_percentile: visitData.bmi_percentile,
        blood_pressure: visitData.blood_pressure,
        heart_rate: visitData.heart_rate,
        // illness_type removed; illnesses are handled separately
        symptoms: visitData.symptoms,
        temperature: visitData.temperature,
        illness_start_date: visitData.illness_start_date ?? null,
        end_date: visitData.end_date,
        injury_type: visitData.injury_type,
        injury_location: visitData.injury_location,
        treatment: visitData.treatment,
        vision_prescription: visitData.vision_prescription,
        vision_refraction: ('vision_refraction' in visitData) ? visitData.vision_refraction : { od: { sphere: null, cylinder: null, axis: null }, os: { sphere: null, cylinder: null, axis: null }, notes: undefined },
        ordered_glasses: ('ordered_glasses' in visitData) ? visitData.ordered_glasses : ((visitData as Visit).needs_glasses ?? null),
        ordered_contacts: ('ordered_contacts' in visitData) ? visitData.ordered_contacts : null,
        dental_procedure_type: ('dental_procedure_type' in visitData) ? visitData.dental_procedure_type : null,
        dental_notes: ('dental_notes' in visitData) ? visitData.dental_notes : null,
        cleaning_type: ('cleaning_type' in visitData) ? visitData.cleaning_type : null,
        cavities_found: ('cavities_found' in visitData) ? visitData.cavities_found : null,
        cavities_filled: ('cavities_filled' in visitData) ? visitData.cavities_filled : null,
        xrays_taken: ('xrays_taken' in visitData) ? visitData.xrays_taken : null,
        fluoride_treatment: ('fluoride_treatment' in visitData) ? visitData.fluoride_treatment : null,
        sealants_applied: ('sealants_applied' in visitData) ? visitData.sealants_applied : null,
        next_appointment_date: ('next_appointment_date' in visitData) ? visitData.next_appointment_date : null,
        dental_procedures: ('dental_procedures' in visitData) ? visitData.dental_procedures : null,
        vaccines_administered: visitData.vaccines_administered || [],
        prescriptions: visitData.prescriptions || [],
        tags: visitData.tags || [],
        notes: visitData.notes,
      });

      // Initialize selected illnesses from new `illnesses` array or legacy `illness_type`
      const loadedIllnesses = ('illnesses' in visitData && Array.isArray(visitData.illnesses) && visitData.illnesses.length > 0)
        ? visitData.illnesses
        : [];
      setSelectedIllnesses(loadedIllnesses);
      
      // Load recent data for autocomplete
      const visitsResponse = await visitsApi.getAll({ child_id: visitData.child_id });
      const locations = [...new Set(visitsResponse.data.map(v => v.location).filter(Boolean))] as string[];
      const doctors = [...new Set(visitsResponse.data.map(v => v.doctor_name).filter(Boolean))] as string[];
      setRecentLocations(locations);
      setRecentDoctors(doctors);
      const futureVisit = isFutureVisit(visitData);
      const hasOutcome = visitHasOutcomeData(visitData);
      const useLimitedForm = futureVisit && !forceFull && !hasOutcome;
      setActiveSections(useLimitedForm ? ['visit-information', 'notes'] : VISIT_TYPE_DEFAULTS[visitData.visit_type]);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to load visit', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async (visitId: number) => {
    try {
      setLoadingAttachments(true);
      const response = await visitsApi.getAttachments(visitId);
      setAttachments(response.data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleFileUpload = async (files: File | File[]) => {
    if (!id) return;
    const arr = Array.isArray(files) ? files : [files];
    for (const file of arr) {
      try {
        const response = await visitsApi.uploadAttachment(parseInt(id), file);
        setAttachments((prev) => [...prev, response.data]);
        setNotification({ message: 'File uploaded successfully', type: 'success' });
      } catch (error) {
        if (error instanceof ApiClientError) {
          setNotification({ message: error.message, type: 'error' });
        } else {
          setNotification({ message: 'Failed to upload file', type: 'error' });
        }
        throw error;
      }
    }
  };

  const handleAttachmentDelete = (attachmentId: number) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  // Drive limited vs full by current form date: future date => short form (no outcome validation).
  // If visit already has outcome data (user saved full form), always show full form.
  const isCurrentlyFutureVisit = formData.visit_date
    ? isFutureDate(formData.visit_date)
    : (visit ? isFutureVisit(visit) : false);
  const useLimitedForm = isCurrentlyFutureVisit && !forceFullForm && !(visit ? visitHasOutcomeData(visit) : false);

  // Sync sections when limited/full mode changes (e.g. user enters future date or clicks "Use full visit form")
  useEffect(() => {
    if (!visit) return;
    setActiveSections(
      useLimitedForm ? ['visit-information', 'notes'] : VISIT_TYPE_DEFAULTS[visit.visit_type]
    );
  }, [visit, useLimitedForm]);

  const visitFormContext = useMemo(
    () => ({
      mode: 'edit' as const,
      formData,
      setFormData,
      submitting,
      showTitle: visit?.visit_type === 'wellness',
      recentLocations,
      recentDoctors,
      getTodayDate,
      selectedIllnesses,
      setSelectedIllnesses,
      pendingFiles: [] as File[],
      handleRemoveFile: () => {},
      handleFileUpload,
      visit: visit ?? undefined,
      visitId: id ? parseInt(id, 10) : undefined,
      attachments,
      loadingAttachments,
      handleAttachmentDelete,
      onRefreshAttachments: id ? () => loadAttachments(parseInt(id, 10)) : undefined,
      isFutureVisit: useLimitedForm,
    }),
    [
      formData,
      setFormData,
      submitting,
      visit,
      id,
      recentLocations,
      recentDoctors,
      selectedIllnesses,
      setSelectedIllnesses,
      attachments,
      loadingAttachments,
      useLimitedForm,
    ]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!id || !visit) return;

    const { visit: currentVisit, selectedIllnesses: currentIllnesses } = getCurrentForm();

    if (!useLimitedForm) {
      const illnessesToSend = currentVisit.visit_type === 'sick' ? currentIllnesses : null;
      if (currentVisit.visit_type === 'sick' && (!illnessesToSend || illnessesToSend.length === 0)) {
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
      const payload = useLimitedForm
        ? {
            visit_date: currentVisit.visit_date,
            visit_time: currentVisit.visit_time ?? null,
            visit_type: currentVisit.visit_type,
            location: currentVisit.location,
            doctor_name: currentVisit.doctor_name,
            title: currentVisit.title,
            notes: currentVisit.notes,
            tags: currentVisit.tags,
          }
        : { ...currentVisit };
      if (!useLimitedForm && currentVisit.visit_type === 'sick') {
        const illnessesToSend = currentIllnesses;
        if (illnessesToSend && illnessesToSend.length > 0) {
          payload.illnesses = illnessesToSend;
        }
      }
      await visitsApi.update(parseInt(id), payload);
      setNotification({ message: 'Visit updated successfully!', type: 'success' });
      setTimeout(() => {
        navigate(`/visits/${id}`);
      }, 1000);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to update visit', type: 'error' });
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading visit..." />;
  }

  if (!child || !visit) {
    return <div>Visit not found</div>;
  }

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
          <div className={formLayout.root}>
            <div className={formLayout.backRow}>
              <Link
                to={`/children/${visit.child_id}`}
                className={`${pageLayout.breadcrumb} ${formLayout.backLink}`}
              >
                ← Back to {child.name}
              </Link>
              <div className={styles.visitDetailActions}>
                <Button type="submit" disabled={submitting} size="sm">
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
                <Link to={`/visits/${id}`}>
                  <Button type="button" variant="secondary" size="sm" disabled={submitting}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
            <div className={formLayout.sidebarCell}>
              <VisitFormSidebar
              activeSections={activeSections}
              onAddSection={addSection}
              isFutureVisit={useLimitedForm}
              showUseFullFormButton={useLimitedForm}
              onUseFullForm={() => setUserChoseFullForm(true)}
            />
            </div>
            <div className={formLayout.topRow}>
              <h2 className={`${layoutStyles.headerTitle} ${formLayout.headerTitle}`}>
                Edit {visit.visit_type === 'wellness' ? 'Wellness' : 
                     visit.visit_type === 'sick' ? 'Sick' : 
                     visit.visit_type === 'injury' ? 'Injury' :
                     visit.visit_type === 'vision' ? 'Vision' :
                     visit.visit_type === 'dental' ? 'Dental' : 'Visit'} Visit
              </h2>
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
    </div>
  );
}

export default EditVisitPage;
