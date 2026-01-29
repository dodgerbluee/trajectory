import { useState, FormEvent, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Child, CreateVisitInput, VisitType, IllnessType } from '../types/api';
import { getTodayDate } from '../lib/validation';
import Card from '../components/Card';
import Button from '../components/Button';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import VisitTypeModal from '../components/VisitTypeModal';
import { getDefaultSectionsForVisitType } from '../visit-form/visitTypeDefaults';
import { getSectionById } from '../visit-form/sectionRegistry';
import { SectionWrapper } from '../visit-form/SectionWrapper';
import { VisitFormSidebar } from '../visit-form/VisitFormSidebar';



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
    visit_date: getTodayDate(),
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
    vaccines_administered: [],
    prescriptions: [],
    tags: [],
    notes: null,
    create_illness: false,
    illness_severity: null,
  });

  // Support multiple illnesses client-side (kept simple and compatible)
  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);

  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [recentDoctors, setRecentDoctors] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  /** Step 5: active sections driven by config; no visit-type conditionals in render. */
  const [activeSections, setActiveSections] = useState<string[]>(() =>
    getDefaultSectionsForVisitType(formData.visit_type)
  );

  /** Reset active sections when visit type changes (e.g. from modal). */
  useEffect(() => {
    setActiveSections(getDefaultSectionsForVisitType(formData.visit_type));
  }, [formData.visit_type]);

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
    ]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.visit_type === 'sick' && selectedIllnesses.length === 0) {
      setNotification({ message: 'Please select at least one illness for sick visits', type: 'error' });
      return;
    }

    if (formData.visit_type === 'injury' && !formData.injury_type) {
      setNotification({ message: 'Please enter an injury type', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      // ensure formData.illness_type remains compatible with API (use first selected illness)
      if (formData.visit_type === 'sick') {
        // send full illnesses array (no legacy `illness_type`)
        (formData as any).illnesses = selectedIllnesses.length > 0 ? selectedIllnesses : null;
      }
      // Create the visit first
      const response = await visitsApi.create(formData);
      const visitId = response.data.id;

      // Upload all pending files
      if (pendingFiles.length > 0) {
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

      setNotification({ message: 'Visit added successfully!', type: 'success' });
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
      <div className="page-container">
        <Card>
          <p className="empty-state">
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
                to={selectedChildId ? `/children/${selectedChildId}` : '/'}
                className="breadcrumb visit-form-back"
              >
                ← Back to {childName}
              </Link>
              <div className="visit-detail-actions">
                <Button type="submit" disabled={submitting} size="sm">
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="secondary" size="sm" disabled={submitting} onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
            <div className="visit-form-sidebar-cell">
              <VisitFormSidebar activeSections={activeSections} onAddSection={addSection} />
            </div>
            <div className="visit-form-top-row">
              <h2 className="visit-header-title">
                Add {formData.visit_type === 'wellness' ? 'Wellness' :
                  formData.visit_type === 'sick' ? 'Sick' :
                    formData.visit_type === 'injury' ? 'Injury' :
                      'Vision'} Visit
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
