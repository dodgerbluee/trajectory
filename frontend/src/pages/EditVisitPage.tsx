import { useState, FormEvent, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Child, UpdateVisitInput, IllnessType, Visit, VisitAttachment } from '../types/api';
import { getTodayDate } from '../lib/validation';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDefaultSectionsForVisitType } from '../visit-form/visitTypeDefaults';
import { getSectionById } from '../visit-form/sectionRegistry';
import { SectionWrapper } from '../visit-form/SectionWrapper';
import { VisitFormSidebar } from '../visit-form/VisitFormSidebar';



function EditVisitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [child, setChild] = useState<Child | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = useState<UpdateVisitInput>({
    visit_date: '',
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
    vision_refraction: { od: { sphere: null, cylinder: null, axis: null }, os: { sphere: null, cylinder: null, axis: null }, notes: undefined } as any,
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
  });

  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);
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
      loadData();
    }
  }, [id]);

  const loadData = async () => {
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
        vision_refraction: (visitData as any).vision_refraction || { od: { sphere: null, cylinder: null, axis: null }, os: { sphere: null, cylinder: null, axis: null }, notes: undefined },
        ordered_glasses: (visitData as any).ordered_glasses ?? visitData.needs_glasses ?? null,
        ordered_contacts: (visitData as any).ordered_contacts ?? null,
        dental_procedure_type: (visitData as any).dental_procedure_type ?? null,
        dental_notes: (visitData as any).dental_notes ?? null,
        cleaning_type: (visitData as any).cleaning_type ?? null,
        cavities_found: (visitData as any).cavities_found ?? null,
        cavities_filled: (visitData as any).cavities_filled ?? null,
        xrays_taken: (visitData as any).xrays_taken ?? null,
        fluoride_treatment: (visitData as any).fluoride_treatment ?? null,
        sealants_applied: (visitData as any).sealants_applied ?? null,
        next_appointment_date: (visitData as any).next_appointment_date ?? null,
        dental_procedures: (visitData as any).dental_procedures ?? null,
        vaccines_administered: visitData.vaccines_administered || [],
        prescriptions: visitData.prescriptions || [],
        tags: visitData.tags || [],
        notes: visitData.notes,
      });

      // Initialize selected illnesses from new `illnesses` array or legacy `illness_type` (use setter so ref is set)
      const loadedIllnesses = (visitData as any).illnesses && (visitData as any).illnesses.length > 0
        ? (visitData as any).illnesses as IllnessType[]
        : [];
      setSelectedIllnessesAndRef(loadedIllnesses);
      
      // Load recent data for autocomplete
      const visitsResponse = await visitsApi.getAll({ child_id: visitData.child_id });
      const locations = [...new Set(visitsResponse.data.map(v => v.location).filter(Boolean))] as string[];
      const doctors = [...new Set(visitsResponse.data.map(v => v.doctor_name).filter(Boolean))] as string[];
      setRecentLocations(locations);
      setRecentDoctors(doctors);
      setActiveSections(getDefaultSectionsForVisitType(visitData.visit_type));
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
      setSelectedIllnesses: setSelectedIllnessesAndRef,
      pendingFiles: [] as File[],
      handleRemoveFile: () => {},
      handleFileUpload,
      visit: visit ?? undefined,
      visitId: id ? parseInt(id, 10) : undefined,
      attachments,
      loadingAttachments,
      handleAttachmentDelete,
      onRefreshAttachments: id ? () => loadAttachments(parseInt(id, 10)) : undefined,
    }),
    [
      formData,
      submitting,
      visit,
      id,
      recentLocations,
      recentDoctors,
      selectedIllnesses,
      attachments,
      loadingAttachments,
    ]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!id || !visit) return;

    const illnessesToSend = visit.visit_type === 'sick' ? selectedIllnessesRef.current : null;
    if (visit.visit_type === 'sick' && (!illnessesToSend || illnessesToSend.length === 0)) {
      setNotification({ message: 'Please select at least one illness for sick visits', type: 'error' });
      return;
    }

    if (visit.visit_type === 'injury' && !formData.injury_type) {
      setNotification({ message: 'Please enter an injury type', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const payload = { ...formData } as any;
      if (visit.visit_type === 'sick' && illnessesToSend && illnessesToSend.length > 0) {
        payload.illnesses = illnessesToSend;
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
          <div className="visit-form-page visit-form-layout-grid">
            <div className="visit-form-back-row">
              <Link
                to={`/children/${visit.child_id}`}
                className="breadcrumb visit-form-back"
              >
                ← Back to {child.name}
              </Link>
              <div className="visit-detail-actions">
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
            <div className="visit-form-sidebar-cell">
              <VisitFormSidebar activeSections={activeSections} onAddSection={addSection} />
            </div>
            <div className="visit-form-top-row">
              <h2 className="visit-header-title">
                Edit {visit.visit_type === 'wellness' ? 'Wellness' : 
                     visit.visit_type === 'sick' ? 'Sick' : 
                     visit.visit_type === 'injury' ? 'Injury' :
                     visit.visit_type === 'vision' ? 'Vision' :
                     visit.visit_type === 'dental' ? 'Dental' : 'Visit'} Visit
              </h2>
            </div>
            <div className="visit-form-body-cell visit-detail-body">
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
    </div>
  );
}

export default EditVisitPage;
