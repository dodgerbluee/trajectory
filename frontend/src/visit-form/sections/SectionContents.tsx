/**
 * Step 5: Section content components.
 *
 * Each section receives sectionId and context; no visit-type conditionals.
 * The page decides which sections are active via activeSections; these
 * components only render their UI using context (formData, setFormData, etc.).
 */

import FormField from '../../components/FormField';
import TagInput from '../../components/TagInput';
import VaccineInput from '../../components/VaccineInput';
import IllnessEntryFormFields from '../../components/IllnessEntryFormFields';
import MeasurementsInput from '../../components/MeasurementsInput';
import PrescriptionInput from '../../components/PrescriptionInput';
import FileUpload from '../../components/FileUpload';
import VisitAttachmentsList from '../../components/VisitAttachmentsList';
import Checkbox from '../../components/Checkbox';
import { VisionRefractionCard } from '../../components/VisionRefractionCard';
import type { VisionRefraction } from '../../components/VisionRefractionCard';
import type { SectionId } from '../sectionRegistry';
import type { VisitFormContext } from '../visitFormContext';
import { isFutureDate } from '../../lib/date-utils';

export interface SectionContentPropsWithContext {
  sectionId: SectionId;
  context: VisitFormContext;
}

export function VisitInformationSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting, showTitle, recentLocations, recentDoctors, getTodayDate, children, selectedChildId, setSelectedChildId } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  // Add mode: no date restriction (user can pick any date; form expands to full or limited based on date).
  // Edit mode: allow future if form's date is already future, else max today.
  const formDateIsFuture = !!(formData.visit_date && isFutureDate(formData.visit_date));
  const allowFutureDate = context.mode === 'edit' && formDateIsFuture;
  const futureDateConstraint = context.mode === 'add' ? {} : allowFutureDate ? {} : { max: getTodayDate() };
  return (
    <div className="visit-info-form">
      {context.mode === 'add' && children && children.length > 0 && setSelectedChildId && (
        <FormField
          label="Child"
          type="select"
          value={selectedChildId?.toString() || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedChildId(parseInt(e.target.value) || null)}
          options={children.map((c) => ({ value: c.id.toString(), label: c.name }))}
          required
          disabled={submitting}
        />
      )}
      <div className="visit-info-primary">
        <FormField
          label="Visit Date"
          type="date"
          value={formData.visit_date ?? ''}
          onChange={(e) => setForm((prev: any) => ({ ...prev, visit_date: e.target.value }))}
          required
          disabled={submitting}
          {...futureDateConstraint}
        />
        <FormField
          label="Time (optional)"
          type="time"
          value={formData.visit_time ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev: any) => ({ ...prev, visit_time: e.target.value || null }))}
          disabled={submitting}
        />
        <FormField
          label="Location"
          type="text"
          value={formData.location || ''}
          onChange={(e) => setForm((prev: any) => ({ ...prev, location: e.target.value || null }))}
          disabled={submitting}
          placeholder="e.g., Dr. Smith Pediatrics"
          list="locations"
        />
        <FormField
          label="Doctor"
          type="text"
          value={formData.doctor_name || ''}
          onChange={(e) => setForm((prev: any) => ({ ...prev, doctor_name: e.target.value || null }))}
          disabled={submitting}
          placeholder="e.g., Dr. Sarah Johnson"
          list="doctors"
        />
      </div>
      <datalist id="locations">
        {recentLocations.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
      <datalist id="doctors">
        {recentDoctors.map((doc) => (
          <option key={doc} value={doc} />
        ))}
      </datalist>
      <div className="visit-info-optional">
        <div className="visit-info-optional-fields">
          {showTitle && (
            <FormField
              label="Title"
              type="text"
              value={formData.title || ''}
              onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value || null }))}
              disabled={submitting}
              placeholder="e.g., 1 Year Appointment"
            />
          )}
          <div className="visit-info-tags-field">
            <label className="form-label">Tags</label>
            <TagInput
              tags={formData.tags || []}
              onChange={(tags) => setForm((prev: any) => ({ ...prev, tags }))}
              disabled={submitting}
              placeholder="e.g., follow-up, urgent, routine"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotesSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  return (
    <FormField
      type="textarea"
      value={formData.notes || ''}
      onChange={(e) => setForm((prev: any) => ({ ...prev, notes: e.target.value || null }))}
      disabled={submitting}
      placeholder="Any additional notes about this visit..."
      rows={4}
    />
  );
}

export function AttachmentsSection({ context }: SectionContentPropsWithContext) {
  const { mode, pendingFiles, handleRemoveFile, handleFileUpload, submitting } = context;

  if (mode === 'edit' && context.visitId != null) {
    const { attachments = [], loadingAttachments, handleAttachmentDelete, onRefreshAttachments } = context;
    return (
      <>
        {loadingAttachments ? (
          <div className="attachments-loading">Loading attachments...</div>
        ) : attachments.length > 0 ? (
          <VisitAttachmentsList
            attachments={attachments}
            onDelete={handleAttachmentDelete!}
            visitId={context.visitId}
            onUpdate={onRefreshAttachments}
          />
        ) : null}
        <FileUpload
          onUpload={async (file) => { await Promise.resolve(handleFileUpload(file)); }}
          disabled={submitting || loadingAttachments}
          multiple={true}
        />
      </>
    );
  }

  return (
    <>
      {pendingFiles.length > 0 && (
        <div className="pending-attachments">
          <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Pending Attachments ({pendingFiles.length})</h4>
          <ul className="attachments-list">
            {pendingFiles.map((file, index) => (
              <li key={index} className="attachment-item">
                <span className="attachment-icon">
                  {file.type.startsWith('image/') ? '🖼️' : file.type === 'application/pdf' ? '📄' : '📎'}
                </span>
                <span className="attachment-info">
                  <span className="attachment-filename">{file.name}</span>
                  <span className="attachment-meta">{(file.size / 1024).toFixed(1)} KB</span>
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
      <FileUpload
        onUpload={async (file) => { await Promise.resolve(handleFileUpload(file)); }}
        disabled={submitting}
        multiple={true}
      />
    </>
  );
}

export function MeasurementsSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  const fd = formData as any;
  return (
    <MeasurementsInput
      weightValue={fd.weight_value ?? null}
      weightOunces={fd.weight_ounces ?? null}
      weightPercentile={fd.weight_percentile ?? null}
      heightValue={fd.height_value ?? null}
      heightPercentile={fd.height_percentile ?? null}
      headCircumferenceValue={fd.head_circumference_value ?? null}
      headCircumferencePercentile={fd.head_circumference_percentile ?? null}
      bmiValue={fd.bmi_value ?? null}
      bmiPercentile={fd.bmi_percentile ?? null}
      bloodPressure={fd.blood_pressure ?? null}
      heartRate={fd.heart_rate ?? null}
      onWeightChange={(v) => setForm((prev: any) => ({ ...prev, weight_value: v }))}
      onWeightOuncesChange={(v) => setForm((prev: any) => ({ ...prev, weight_ounces: v }))}
      onWeightPercentileChange={(v) => setForm((prev: any) => ({ ...prev, weight_percentile: v }))}
      onHeightChange={(v) => setForm((prev: any) => ({ ...prev, height_value: v }))}
      onHeightPercentileChange={(v) => setForm((prev: any) => ({ ...prev, height_percentile: v }))}
      onHeadCircumferenceChange={(v) => setForm((prev: any) => ({ ...prev, head_circumference_value: v }))}
      onHeadCircumferencePercentileChange={(v) => setForm((prev: any) => ({ ...prev, head_circumference_percentile: v }))}
      onBmiChange={(v) => setForm((prev: any) => ({ ...prev, bmi_value: v }))}
      onBmiPercentileChange={(v) => setForm((prev: any) => ({ ...prev, bmi_percentile: v }))}
      onBloodPressureChange={(v) => setForm((prev: any) => ({ ...prev, blood_pressure: v }))}
      onHeartRateChange={(v) => setForm((prev: any) => ({ ...prev, heart_rate: v }))}
      disabled={submitting}
    />
  );
}

export function IllnessSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, selectedIllnesses, setSelectedIllnesses, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  const value = {
    ...formData,
    illness_severity: (formData as any).illness_severity ?? null,
  };
  return (
    <>
      <IllnessEntryFormFields
        value={value}
        onChange={(next) => setForm((prev: any) => ({ ...prev, ...next }))}
        selectedIllnesses={selectedIllnesses}
        onSelectedIllnessesChange={setSelectedIllnesses}
        disabled={submitting}
        dateMode="visit"
        maxStartDate={formData.visit_date ?? undefined}
        minEndDate={formData.illness_start_date || formData.visit_date || undefined}
      />
      {selectedIllnesses.length > 0 && (
        <div className="form-field illness-create-entry-field">
          <Checkbox
            label="Create illness entry (auto-track this illness)"
            checked={(formData as any).create_illness || false}
            onChange={(checked) => setForm((prev: any) => ({ ...prev, create_illness: checked }))}
            disabled={submitting}
          />
          <p className="form-field-hint form-field-hint-italic">
            This will create a separate illness record that can be tracked independently from the visit.
          </p>
        </div>
      )}
    </>
  );
}

export function InjurySection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  return (
    <>
      <div className="form-row">
        <FormField
          label="Injury Type"
          type="text"
          value={formData.injury_type || ''}
          onChange={(e) => setForm((prev: any) => ({ ...prev, injury_type: e.target.value || null }))}
          required
          disabled={submitting}
          placeholder="e.g., sprain, laceration, fracture, bruise, burn"
        />
        <FormField
          label="Injury Location"
          type="text"
          value={formData.injury_location || ''}
          onChange={(e) => setForm((prev: any) => ({ ...prev, injury_location: e.target.value || null }))}
          disabled={submitting}
          placeholder="e.g., left ankle, forehead, right arm"
        />
      </div>
      <FormField
        label="Treatment"
        type="textarea"
        value={formData.treatment || ''}
        onChange={(e) => setForm((prev: any) => ({ ...prev, treatment: e.target.value || null }))}
        disabled={submitting}
        placeholder="e.g., stitches, splint, ice and rest, bandage"
        rows={3}
      />
    </>
  );
}

export function VisionSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  const fd = formData as any;
  return (
    <div className="measurements-ui vision-ui">
      <div className="measurements-cards vision-refraction-cards">
        <VisionRefractionCard
          value={fd.vision_refraction}
          onChange={(v: VisionRefraction) => setForm((prev: any) => ({ ...prev, vision_refraction: v }))}
          readOnly={submitting}
        />
      </div>
      <div className="vision-checkboxes">
        <Checkbox
          label="Ordered Glasses"
          checked={fd.ordered_glasses || false}
          onChange={(checked) => setForm((prev: any) => ({ ...prev, ordered_glasses: checked }))}
          disabled={submitting}
        />
        <Checkbox
          label="Ordered Contacts"
          checked={fd.ordered_contacts || false}
          onChange={(checked) => setForm((prev: any) => ({ ...prev, ordered_contacts: checked }))}
          disabled={submitting}
        />
      </div>
    </div>
  );
}

export function DentalSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  const fd = formData as any;
  
  const procedureTypes = [
    { value: '', label: 'Select dental visit type...' },
    { value: 'checkup', label: 'Checkup' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'filling', label: 'Filling' },
    { value: 'extraction', label: 'Extraction' },
    { value: 'xray', label: 'X-Ray' },
    { value: 'fluoride', label: 'Fluoride Treatment' },
    { value: 'sealant', label: 'Sealant' },
    { value: 'orthodontic', label: 'Orthodontic' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' },
  ];
  
  const cleaningTypes = [
    { value: '', label: 'Select cleaning type...' },
    { value: 'routine', label: 'Routine' },
    { value: 'deep', label: 'Deep' },
    { value: 'polish', label: 'Polish' },
  ];
  
  return (
    <div className="dental-ui">
      <div className="dental-form-fields">
        <FormField
          label="Dental Visit Type"
          type="select"
          value={fd.dental_procedure_type || ''}
          onChange={(e) => setForm((prev: any) => ({ ...prev, dental_procedure_type: e.target.value || null }))}
          options={procedureTypes}
          disabled={submitting}
        />
        
        {fd.dental_procedure_type === 'cleaning' && (
          <FormField
            label="Cleaning Type"
            type="select"
            value={fd.cleaning_type || ''}
            onChange={(e) => setForm((prev: any) => ({ ...prev, cleaning_type: e.target.value || null }))}
            options={cleaningTypes}
            disabled={submitting}
          />
        )}
        
        <div className="dental-checkboxes" style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
          <Checkbox
            label="X-Rays Taken"
            checked={fd.xrays_taken || false}
            onChange={(checked) => setForm((prev: any) => ({ ...prev, xrays_taken: checked }))}
            disabled={submitting}
          />
          <Checkbox
            label="Fluoride Treatment"
            checked={fd.fluoride_treatment || false}
            onChange={(checked) => setForm((prev: any) => ({ ...prev, fluoride_treatment: checked }))}
            disabled={submitting}
          />
          <Checkbox
            label="Sealants Applied"
            checked={fd.sealants_applied || false}
            onChange={(checked) => setForm((prev: any) => ({ ...prev, sealants_applied: checked }))}
            disabled={submitting}
          />
        </div>
        
        <div className="dental-numbers" style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <FormField
              label="Cavities Found"
              type="number"
              value={fd.cavities_found ?? ''}
              onChange={(e) => {
              const v = e.target.value;
              const n = v === '' ? null : (() => { const num = parseInt(v, 10); return Number.isNaN(num) ? null : num; })();
              setForm((prev: any) => ({ ...prev, cavities_found: n }));
            }}
              min="0"
              disabled={submitting}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FormField
              label="Cavities Filled"
              type="number"
              value={fd.cavities_filled ?? ''}
              onChange={(e) => {
              const v = e.target.value;
              const n = v === '' ? null : (() => { const num = parseInt(v, 10); return Number.isNaN(num) ? null : num; })();
              setForm((prev: any) => ({ ...prev, cavities_filled: n }));
            }}
              min="0"
              max={fd.cavities_found ?? undefined}
              disabled={submitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VaccinesSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  return (
    <VaccineInput
      value={formData.vaccines_administered || []}
      onChange={(vaccines) => setForm((prev: any) => ({ ...prev, vaccines_administered: vaccines }))}
      disabled={submitting}
    />
  );
}

export function PrescriptionsSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData, submitting } = context;
  const setForm = setFormData as React.Dispatch<React.SetStateAction<any>>;
  return (
    <PrescriptionInput
      value={formData.prescriptions || []}
      onChange={(prescriptions) => setForm((prev: any) => ({ ...prev, prescriptions }))}
      disabled={submitting}
    />
  );
}
