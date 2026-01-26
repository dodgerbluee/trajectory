import { useState, FormEvent, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Child, CreateVisitInput, VisitType, IllnessType } from '../types/api';
import { getTodayDate } from '../lib/validation';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import PrescriptionInput from '../components/PrescriptionInput';
import VaccineInput from '../components/VaccineInput';
import IllnessesInput from '../components/IllnessesInput';
import VisitTypeModal from '../components/VisitTypeModal';
import TagInput from '../components/TagInput';
import FileUpload from '../components/FileUpload';
import Checkbox from '../components/Checkbox';



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
    end_date: null,
    injury_type: null,
    injury_location: null,
    treatment: null,
    follow_up_date: null,
    vision_prescription: null,
    needs_glasses: null,
    vaccines_administered: [],
    prescriptions: [],
    tags: [],
    notes: null,
    create_illness: false,
  });

  // Support multiple illnesses client-side (kept simple and compatible)
  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);

  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [recentDoctors, setRecentDoctors] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    loadChildren();
    // Show modal if visit type not provided in URL
    if (!visitTypeFromUrl) {
      setShowVisitTypeModal(true);
    }
  }, [visitTypeFromUrl]);

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

  const handleFileUpload = async (file: File) => {
    setPendingFiles(prev => [...prev, file]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link to="/" className="breadcrumb">
            ← Back to Home
          </Link>
          <h1>Add Visit</h1>
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
        <Card>
          <div className="visit-detail-body">
            {/* Basic Information Section */}
            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Visit Information</h3>
              <FormField
                label="Child"
                type="select"
                value={selectedChildId?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const newChildId = parseInt(e.target.value);
                  setSelectedChildId(newChildId);
                }}
                options={children.map(child => ({
                  value: child.id.toString(),
                  label: child.name
                }))}
                required
                disabled={submitting}
              />
              <FormField
                label="Visit Date"
                type="date"
                value={formData.visit_date}
                onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                required
                disabled={submitting}
                max={getTodayDate()}
              />

              <FormField
                label="Location"
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value || null })}
                disabled={submitting}
                placeholder="e.g., Dr. Smith Pediatrics"
                list="locations"
              />
              <datalist id="locations">
                {recentLocations.map(loc => <option key={loc} value={loc} />)}
              </datalist>

              <FormField
                label="Doctor Name"
                type="text"
                value={formData.doctor_name || ''}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value || null })}
                disabled={submitting}
                placeholder="e.g., Dr. Sarah Johnson"
                list="doctors"
              />
              <datalist id="doctors">
                {recentDoctors.map(doc => <option key={doc} value={doc} />)}
              </datalist>

              {formData.visit_type === 'wellness' && (
                <FormField
                  label="Title"
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value || null })}
                  disabled={submitting}
                  placeholder="e.g., 1 Year Appointment"
                />
              )}
            </div>

            {formData.visit_type === 'sick' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Illness Information</h3>
                <IllnessesInput
                  value={selectedIllnesses}
                  onChange={(ills) => setSelectedIllnesses(ills)}
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

                <FormField
                  label="Temperature (°F)"
                  type="number"
                  value={formData.temperature || ''}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value ? parseFloat(e.target.value) : null })}
                  disabled={submitting}
                  placeholder="e.g., 102.5"
                  step="0.1"
                  min="95"
                  max="110"
                />

                <FormField
                  label="Illness End Date (if resolved)"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                  disabled={submitting}
                  min={formData.visit_date}
                />

                {selectedIllnesses.length > 0 && (
                  <div className="form-field">
                    <label className="form-field-label">
                      <input
                        type="checkbox"
                        checked={formData.create_illness || false}
                        onChange={(e) => setFormData({ ...formData, create_illness: e.target.checked })}
                        disabled={submitting}
                      />
                      <span>Create illness entry (auto-track this illness)</span>
                    </label>
                    <p className="form-field-hint">
                      This will create a separate illness record that can be tracked independently from the visit.
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.visit_type === 'injury' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Injury Information</h3>
                <FormField
                  label="Injury Type"
                  type="text"
                  value={formData.injury_type || ''}
                  onChange={(e) => setFormData({ ...formData, injury_type: e.target.value || null })}
                  required
                  disabled={submitting}
                  placeholder="e.g., sprain, laceration, fracture, bruise, burn"
                />

                <FormField
                  label="Injury Location"
                  type="text"
                  value={formData.injury_location || ''}
                  onChange={(e) => setFormData({ ...formData, injury_location: e.target.value || null })}
                  disabled={submitting}
                  placeholder="e.g., left ankle, forehead, right arm"
                />

                <FormField
                  label="Treatment"
                  type="textarea"
                  value={formData.treatment || ''}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value || null })}
                  disabled={submitting}
                  placeholder="e.g., stitches, splint, ice and rest, bandage"
                  rows={3}
                />

                <FormField
                  label="Follow-up Date (optional)"
                  type="date"
                  value={formData.follow_up_date || ''}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value || null })}
                  disabled={submitting}
                  min={formData.visit_date}
                />
              </div>
            )}

            {formData.visit_type === 'wellness' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Measurements</h3>
                <div className="measurement-grid">
                  <FormField
                    label="Weight (lbs)"
                    type="number"
                    value={formData.weight_value || ''}
                    onChange={(e) => setFormData({ ...formData, weight_value: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    placeholder="0.0"
                  />
                  
                  <FormField
                    label="Weight (oz)"
                    type="number"
                    value={formData.weight_ounces || ''}
                    onChange={(e) => setFormData({ ...formData, weight_ounces: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={submitting}
                    min="0"
                    max="15"
                    placeholder="0-15"
                  />

                  <FormField
                    label="Weight %ile"
                    type="number"
                    value={formData.weight_percentile || ''}
                    onChange={(e) => setFormData({ ...formData, weight_percentile: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0-100"
                  />
                </div>

                <div className="measurement-grid">
                  <FormField
                    label="Height (inches)"
                    type="number"
                    value={formData.height_value || ''}
                    onChange={(e) => setFormData({ ...formData, height_value: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    placeholder="0.0"
                  />

                  <FormField
                    label="Height %ile"
                    type="number"
                    value={formData.height_percentile || ''}
                    onChange={(e) => setFormData({ ...formData, height_percentile: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0-100"
                  />
                </div>

                <div className="measurement-grid">
                  <FormField
                    label="Head Circumference (inches)"
                    type="number"
                    value={formData.head_circumference_value || ''}
                    onChange={(e) => setFormData({ ...formData, head_circumference_value: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    placeholder="0.0"
                  />

                  <FormField
                    label="Head Circ. %ile"
                    type="number"
                    value={formData.head_circumference_percentile || ''}
                    onChange={(e) => setFormData({ ...formData, head_circumference_percentile: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0-100"
                  />
                </div>

                <div className="measurement-grid">
                  <FormField
                    label="BMI"
                    type="number"
                    value={formData.bmi_value || ''}
                    onChange={(e) => setFormData({ ...formData, bmi_value: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    placeholder="0.0"
                  />

                  <FormField
                    label="BMI %ile"
                    type="number"
                    value={formData.bmi_percentile || ''}
                    onChange={(e) => setFormData({ ...formData, bmi_percentile: e.target.value ? parseFloat(e.target.value) : null })}
                    disabled={submitting}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0-100"
                  />
                </div>

                <div className="measurement-grid">
                  <FormField
                    label="Blood Pressure"
                    type="text"
                    value={formData.blood_pressure || ''}
                    onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value || null })}
                    disabled={submitting}
                    placeholder="e.g., 120/80"
                  />

                  <FormField
                    label="Heart Rate (bpm)"
                    type="number"
                    value={formData.heart_rate || ''}
                    onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={submitting}
                    min="30"
                    max="250"
                    placeholder="e.g., 75"
                  />
                </div>
              </div>
            )}

            {formData.visit_type === 'vision' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Vision Information</h3>
                <FormField
                  label="Vision Prescription"
                  type="textarea"
                  value={formData.vision_prescription || ''}
                  onChange={(e) => setFormData({ ...formData, vision_prescription: e.target.value || null })}
                  disabled={submitting}
                  placeholder="e.g., OD: -2.00, OS: -1.75"
                  rows={3}
                />

                <Checkbox
                  label="Needs Glasses"
                  checked={formData.needs_glasses || false}
                  onChange={(checked) => setFormData({ ...formData, needs_glasses: checked })}
                  disabled={submitting}
                />
              </div>
            )}

            {formData.visit_type === 'wellness' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Vaccines</h3>
                <VaccineInput
                  value={formData.vaccines_administered || []}
                  onChange={(vaccines) => setFormData({ ...formData, vaccines_administered: vaccines })}
                  disabled={submitting}
                />
              </div>
            )}

            {(formData.visit_type === 'sick' || formData.visit_type === 'injury') && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Prescriptions</h3>
                <PrescriptionInput
                  value={formData.prescriptions || []}
                  onChange={(prescriptions) => setFormData({ ...formData, prescriptions: prescriptions })}
                  disabled={submitting}
                />
              </div>
            )}

            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Tags</h3>
              <TagInput
                tags={formData.tags || []}
                onChange={(tags) => setFormData({ ...formData, tags })}
                disabled={submitting}
                placeholder="Add tags (e.g., follow-up, urgent, routine)"
              />
            </div>

            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Notes</h3>
              <FormField
                label="Additional Notes"
                type="textarea"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                disabled={submitting}
                placeholder="Any additional notes about this visit..."
                rows={4}
              />
            </div>

            <div className="visit-detail-section">
              <h3 className="visit-detail-section-title">Attachments</h3>
              <FileUpload
                onUpload={handleFileUpload}
                disabled={submitting}
              />
              
              {pendingFiles.length > 0 && (
                <div className="pending-attachments">
                  <h4 style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                    Pending Attachments ({pendingFiles.length})
                  </h4>
                  <ul className="attachments-list">
                    {pendingFiles.map((file, index) => (
                      <li key={index} className="attachment-item">
                        <span className="attachment-icon">
                          {file.type.startsWith('image/') ? '🖼️' : file.type === 'application/pdf' ? '📄' : '📎'}
                        </span>
                        <span className="attachment-info">
                          <span className="attachment-filename">{file.name}</span>
                          <span className="attachment-meta">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          disabled={submitting}
                          className="btn-delete-attachment"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding Visit...' : 'Add Visit'}
          </Button>
          <Link to="/">
            <Button type="button" variant="secondary" disabled={submitting}>
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <VisitTypeModal
        isOpen={showVisitTypeModal}
        onSelect={(visitType: VisitType) => {
          setFormData({ ...formData, visit_type: visitType });
          setShowVisitTypeModal(false);
        }}
        onClose={() => {
          setShowVisitTypeModal(false);
          // Navigate back to where we came from, or to home if no origin
          if ((location.state as any)?.fromChild && (location.state as any)?.childId) {
            navigate(`/children/${(location.state as any).childId}`);
          } else {
            navigate('/');
          }
        }}
      />
    </div>
  );
}

export default AddVisitPage;
