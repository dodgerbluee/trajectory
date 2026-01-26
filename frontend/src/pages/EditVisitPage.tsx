import { useState, FormEvent, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { visitsApi, childrenApi, ApiClientError } from '../lib/api-client';
import type { Child, UpdateVisitInput, IllnessType, Visit, VisitAttachment } from '../types/api';
import { getTodayDate } from '../lib/validation';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import PrescriptionInput from '../components/PrescriptionInput';
import VaccineInput from '../components/VaccineInput';
import IllnessesInput from '../components/IllnessesInput';
import FileUpload from '../components/FileUpload';
import VisitAttachmentsList from '../components/VisitAttachmentsList';
import TagInput from '../components/TagInput';
import Checkbox from '../components/Checkbox';



function EditVisitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
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
    needs_glasses: null,
    vaccines_administered: [],
    prescriptions: [],
    tags: [],
    notes: null,
  });

  const [selectedIllnesses, setSelectedIllnesses] = useState<IllnessType[]>([]);

  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [recentDoctors, setRecentDoctors] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

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
        end_date: visitData.end_date,
        injury_type: visitData.injury_type,
        injury_location: visitData.injury_location,
        treatment: visitData.treatment,
        follow_up_date: visitData.follow_up_date,
        vision_prescription: visitData.vision_prescription,
        needs_glasses: visitData.needs_glasses,
        vaccines_administered: visitData.vaccines_administered || [],
        prescriptions: visitData.prescriptions || [],
        tags: visitData.tags || [],
        notes: visitData.notes,
      });

      // Initialize selected illnesses from new `illnesses` array or legacy `illness_type`
      setSelectedIllnesses((visitData as any).illnesses && (visitData as any).illnesses.length > 0
        ? (visitData as any).illnesses as IllnessType[]
        : []);
      
      // Load recent data for autocomplete
      const visitsResponse = await visitsApi.getAll({ child_id: visitData.child_id });
      const locations = [...new Set(visitsResponse.data.map(v => v.location).filter(Boolean))] as string[];
      const doctors = [...new Set(visitsResponse.data.map(v => v.doctor_name).filter(Boolean))] as string[];
      setRecentLocations(locations);
      setRecentDoctors(doctors);
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

  const handleFileUpload = async (file: File) => {
    if (!id) return;
    try {
      const response = await visitsApi.uploadAttachment(parseInt(id), file);
      setAttachments([...attachments, response.data]);
      setNotification({ message: 'File uploaded successfully', type: 'success' });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setNotification({ message: error.message, type: 'error' });
      } else {
        setNotification({ message: 'Failed to upload file', type: 'error' });
      }
      throw error;
    }
  };

  const handleAttachmentDelete = (attachmentId: number) => {
    setAttachments(attachments.filter(a => a.id !== attachmentId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!id || !visit) return;

    // Validation (require at least one selected illness for sick visits)
    if (visit.visit_type === 'sick' && selectedIllnesses.length === 0) {
      setNotification({ message: 'Please select at least one illness for sick visits', type: 'error' });
      return;
    }

    if (visit.visit_type === 'injury' && !formData.injury_type) {
      setNotification({ message: 'Please enter an injury type', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      // Send illnesses array and keep `illness_type` for backward compatibility
      if (visit.visit_type === 'sick') {
        (formData as any).illnesses = selectedIllnesses.length > 0 ? selectedIllnesses : null;
      }
      await visitsApi.update(parseInt(id), formData as any);
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
      <div className="page-header">
        <div>
          <Link 
            to={((location.state as any)?.fromChild && (location.state as any)?.childId)
              ? `/children/${(location.state as any).childId}` 
              : `/visits/${id}`} 
            className="breadcrumb"
          >
            ← Back to {((location.state as any)?.fromChild) ? (child?.name || 'Child') : 'Visit'}
          </Link>
          <h1>Edit {visit.visit_type === 'wellness' ? 'Wellness' : 
                   visit.visit_type === 'sick' ? 'Sick' : 
                   visit.visit_type === 'injury' ? 'Injury' :
                   'Vision'} Visit for {child.name}</h1>
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

              {visit.visit_type === 'wellness' && (
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

            {visit.visit_type === 'sick' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Illness Information</h3>
                <IllnessesInput
                  value={selectedIllnesses}
                  onChange={(ills) => setSelectedIllnesses(ills)}
                  disabled={submitting}
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
              </div>
            )}

            {visit.visit_type === 'injury' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Injury Information</h3>
                <FormField
                  label="Injury Type"
                  type="text"
                  value={formData.injury_type !== undefined ? (formData.injury_type || '') : (visit.injury_type || '')}
                  onChange={(e) => setFormData({ ...formData, injury_type: e.target.value || null })}
                  required
                  disabled={submitting}
                  placeholder="e.g., sprain, laceration, fracture, bruise, burn"
                />

                <FormField
                  label="Injury Location"
                  type="text"
                  value={formData.injury_location !== undefined ? (formData.injury_location || '') : (visit.injury_location || '')}
                  onChange={(e) => setFormData({ ...formData, injury_location: e.target.value || null })}
                  disabled={submitting}
                  placeholder="e.g., left ankle, forehead, right arm"
                />

                <FormField
                  label="Treatment"
                  type="textarea"
                  value={formData.treatment !== undefined ? (formData.treatment || '') : (visit.treatment || '')}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value || null })}
                  disabled={submitting}
                  placeholder="e.g., stitches, splint, ice and rest, bandage"
                  rows={3}
                />

                <FormField
                  label="Follow-up Date (optional)"
                  type="date"
                  value={formData.follow_up_date !== undefined ? (formData.follow_up_date || '') : (visit.follow_up_date || '')}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value || null })}
                  disabled={submitting}
                  min={formData.visit_date || visit.visit_date}
                />
              </div>
            )}

            {visit.visit_type === 'wellness' && (
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
                    value={formData.blood_pressure !== undefined ? (formData.blood_pressure || '') : (visit.blood_pressure || '')}
                    onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value || null })}
                    disabled={submitting}
                    placeholder="e.g., 120/80"
                  />

                  <FormField
                    label="Heart Rate (bpm)"
                    type="number"
                    value={formData.heart_rate !== undefined ? (formData.heart_rate || '') : (visit.heart_rate || '')}
                    onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={submitting}
                    min="40"
                    max="250"
                    placeholder="40-250"
                  />
                </div>
              </div>
            )}

            {visit.visit_type === 'vision' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Vision Information</h3>
                <FormField
                  label="Prescription"
                  type="textarea"
                  value={formData.vision_prescription !== undefined ? (formData.vision_prescription || '') : (visit.vision_prescription || '')}
                  onChange={(e) => setFormData({ ...formData, vision_prescription: e.target.value || null })}
                  disabled={submitting}
                  placeholder="Enter prescription details..."
                  rows={3}
                />

                <Checkbox
                  label="Needs Glasses"
                  checked={formData.needs_glasses !== undefined ? (formData.needs_glasses === true) : (visit.needs_glasses === true)}
                  onChange={(checked) => setFormData({ ...formData, needs_glasses: checked ? true : null })}
                  disabled={submitting}
                />
              </div>
            )}

            {visit.visit_type === 'wellness' && (
              <div className="visit-detail-section">
                <h3 className="visit-detail-section-title">Vaccines</h3>
                <VaccineInput
                  value={formData.vaccines_administered || []}
                  onChange={(vaccines) => setFormData({ ...formData, vaccines_administered: vaccines })}
                  disabled={submitting}
                />
              </div>
            )}

            {(visit.visit_type === 'sick' || visit.visit_type === 'injury') && (
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
                disabled={submitting || loadingAttachments}
              />
              {loadingAttachments ? (
                <div className="attachments-loading">Loading attachments...</div>
              ) : (
                <VisitAttachmentsList
                  attachments={attachments}
                  onDelete={handleAttachmentDelete}
                  visitId={parseInt(id!)}
                  onUpdate={() => loadAttachments(parseInt(id!))}
                />
              )}
            </div>
          </div>
        </Card>

        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Updating Visit...' : 'Update Visit'}
          </Button>
          <Link to={`/visits/${id}`}>
            <Button type="button" variant="secondary" disabled={submitting}>
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default EditVisitPage;
