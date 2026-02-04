/**
 * Step 5: Section content components.
 *
 * Each section receives sectionId and context; no visit-type conditionals.
 * The page decides which sections are active via activeSections; these
 * components only render their UI using context (formData, setFormData, etc.).
 */

import FormField from '@shared/components/FormField';
import TagInput from '@shared/components/TagInput';
import { VaccineInput, MeasurementsInput, PrescriptionInput, VisionRefractionCard } from '@features/medical';
import { IllnessEntryFormFields } from '@features/illnesses';
import FileUpload from '@shared/components/FileUpload';
import fileUploadStyles from '@shared/components/FileUpload.module.css';
import loadingStyles from '@shared/components/LoadingSpinner.module.css';
import { VisitAttachmentsList } from '@features/visits';
import Checkbox from '@shared/components/Checkbox';
import type { VisionRefraction } from '@features/medical';
import type { SectionId } from '../sectionRegistry';
import type { VisitFormContext } from '../visitFormContext';
import type { CreateVisitInput, UpdateVisitInput } from '@shared/types/api';
import { isFutureDate } from '@lib/date-utils';
import sectionStyles from './SectionContents.module.css';
import mui from '@shared/styles/MeasurementsUI.module.css';

export interface SectionContentPropsWithContext {
  sectionId: SectionId;
  context: VisitFormContext;
}

export function VisitInformationSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData: _setFormData, submitting, showTitle, recentLocations, recentDoctors, getTodayDate, children, selectedChildId, setSelectedChildId } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  // Add mode: no date restriction (user can pick any date; form expands to full or limited based on date).
  // Edit mode: allow future if form's date is already future, else max today.
  const formDateIsFuture = !!(formData.visit_date && isFutureDate(formData.visit_date));
  const allowFutureDate = context.mode === 'edit' && formDateIsFuture;
  const futureDateConstraint = context.mode === 'add' ? {} : allowFutureDate ? {} : { max: getTodayDate() };
  return (
    <div className={sectionStyles.root}>
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
      <div className={sectionStyles.primary}>
        <FormField
          label="Visit Date"
          type="date"
          value={formData.visit_date ?? ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, visit_date: e.target.value }))}
          required
          disabled={submitting}
          {...futureDateConstraint}
        />
        <FormField
          label="Time (optional)"
          type="time"
          value={formData.visit_time ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev) => ({ ...prev, visit_time: e.target.value || null }))}
          disabled={submitting}
        />
        <FormField
          label="Location"
          type="text"
          value={formData.location || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value || null }))}
          disabled={submitting}
          placeholder="e.g., Dr. Smith Pediatrics"
          list="locations"
        />
        <FormField
          label="Doctor"
          type="text"
          value={formData.doctor_name || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, doctor_name: e.target.value || null }))}
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
      <div className={sectionStyles.optional}>
        <div className={sectionStyles.optionalFields}>
          {showTitle && (
            <FormField
              label="Title"
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value || null }))}
              disabled={submitting}
              placeholder="e.g., 1 Year Appointment"
            />
          )}
          <div className={sectionStyles.tagsField}>
            <label className={sectionStyles.formLabel}>Tags</label>
            <TagInput
              tags={formData.tags || []}
              onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
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
  const { formData, setFormData: _setFormData, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  return (
    <FormField
      type="textarea"
      value={formData.notes || ''}
      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value || null }))}
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
          <div className={loadingStyles.attachmentLoading}>Loading attachments...</div>
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
        <div className={fileUploadStyles.pendingAttachments}>
          <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Pending Attachments ({pendingFiles.length})</h4>
          <ul className={fileUploadStyles.attachmentsList}>
            {pendingFiles.map((file, index) => (
              <li key={index} className={fileUploadStyles.attachmentItem}>
                <span className={fileUploadStyles.attachmentIcon}>
                  {file.type.startsWith('image/') ? '🖼️' : file.type === 'application/pdf' ? '📄' : '📎'}
                </span>
                <span className={fileUploadStyles.attachmentInfo}>
                  <span className={fileUploadStyles.attachmentFilename}>{file.name}</span>
                  <span className={fileUploadStyles.attachmentMeta}>{(file.size / 1024).toFixed(1)} KB</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  disabled={submitting}
                  className={fileUploadStyles.btnDeleteAttachment}
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
  const { formData, setFormData: _setFormData, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  const weightValue = 'weight_value' in formData ? formData.weight_value : null;
  const weightOunces = 'weight_ounces' in formData ? formData.weight_ounces : null;
  const weightPercentile = 'weight_percentile' in formData ? formData.weight_percentile : null;
  const heightValue = 'height_value' in formData ? formData.height_value : null;
  const heightPercentile = 'height_percentile' in formData ? formData.height_percentile : null;
  const headCircumferenceValue = 'head_circumference_value' in formData ? formData.head_circumference_value : null;
  const headCircumferencePercentile = 'head_circumference_percentile' in formData ? formData.head_circumference_percentile : null;
  const bmiValue = 'bmi_value' in formData ? formData.bmi_value : null;
  const bmiPercentile = 'bmi_percentile' in formData ? formData.bmi_percentile : null;
  const bloodPressure = 'blood_pressure' in formData ? formData.blood_pressure : null;
  const heartRate = 'heart_rate' in formData ? formData.heart_rate : null;
  return (
    <MeasurementsInput
      weightValue={weightValue ?? null}
      weightOunces={weightOunces ?? null}
      weightPercentile={weightPercentile ?? null}
      heightValue={heightValue ?? null}
      heightPercentile={heightPercentile ?? null}
      headCircumferenceValue={headCircumferenceValue ?? null}
      headCircumferencePercentile={headCircumferencePercentile ?? null}
      bmiValue={bmiValue ?? null}
      bmiPercentile={bmiPercentile ?? null}
      bloodPressure={bloodPressure ?? null}
      heartRate={heartRate ?? null}
      onWeightChange={(v) => setFormData((prev) => ({ ...prev, weight_value: v }))}
      onWeightOuncesChange={(v) => setFormData((prev) => ({ ...prev, weight_ounces: v }))}
      onWeightPercentileChange={(v) => setFormData((prev) => ({ ...prev, weight_percentile: v }))}
      onHeightChange={(v) => setFormData((prev) => ({ ...prev, height_value: v }))}
      onHeightPercentileChange={(v) => setFormData((prev) => ({ ...prev, height_percentile: v }))}
      onHeadCircumferenceChange={(v) => setFormData((prev) => ({ ...prev, head_circumference_value: v }))}
      onHeadCircumferencePercentileChange={(v) => setFormData((prev) => ({ ...prev, head_circumference_percentile: v }))}
      onBmiChange={(v) => setFormData((prev) => ({ ...prev, bmi_value: v }))}
      onBmiPercentileChange={(v) => setFormData((prev) => ({ ...prev, bmi_percentile: v }))}
      onBloodPressureChange={(v) => setFormData((prev) => ({ ...prev, blood_pressure: v }))}
      onHeartRateChange={(v) => setFormData((prev) => ({ ...prev, heart_rate: v }))}
      disabled={submitting}
    />
  );
}

export function IllnessSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData: _setFormData, selectedIllnesses, setSelectedIllnesses, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  const illnessSeverity = 'illness_severity' in formData ? formData.illness_severity : null;
  const value = {
    ...formData,
    illness_severity: illnessSeverity ?? null,
  };
  return (
    <>
      <IllnessEntryFormFields
        value={value}
        onChange={(next) => setFormData((prev) => ({ ...prev, ...next }))}
        selectedIllnesses={selectedIllnesses}
        onSelectedIllnessesChange={setSelectedIllnesses}
        disabled={submitting}
        dateMode="visit"
        maxStartDate={formData.visit_date ?? undefined}
        minEndDate={formData.illness_start_date || formData.visit_date || undefined}
      />
      {selectedIllnesses.length > 0 && (
        <div className={`${sectionStyles.formField} illness-create-entry-field`}>
          <Checkbox
            label="Create illness entry (auto-track this illness)"
            checked={('create_illness' in formData && formData.create_illness) || false}
            onChange={(checked) => setFormData((prev) => ({ ...prev, create_illness: checked }))}
            disabled={submitting}
          />
          <p className={`${sectionStyles.formFieldHint} ${sectionStyles.formFieldHintItalic}`}>
            This will create a separate illness record that can be tracked independently from the visit.
          </p>
        </div>
      )}
    </>
  );
}

export function InjurySection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData: _setFormData, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  return (
    <>
      <div className={sectionStyles.formRow}>
        <FormField
          label="Injury Type"
          type="text"
          value={formData.injury_type || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, injury_type: e.target.value || null }))}
          required
          disabled={submitting}
          placeholder="e.g., sprain, laceration, fracture, bruise, burn"
        />
        <FormField
          label="Injury Location"
          type="text"
          value={formData.injury_location || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, injury_location: e.target.value || null }))}
          disabled={submitting}
          placeholder="e.g., left ankle, forehead, right arm"
        />
      </div>
      <FormField
        label="Treatment"
        type="textarea"
        value={formData.treatment || ''}
        onChange={(e) => setFormData((prev) => ({ ...prev, treatment: e.target.value || null }))}
        disabled={submitting}
        placeholder="e.g., stitches, splint, ice and rest, bandage"
        rows={3}
      />
    </>
  );
}

export function VisionSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData: _setFormData, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  const visionRefraction = 'vision_refraction' in formData ? formData.vision_refraction : undefined;
  const orderedGlasses = 'ordered_glasses' in formData ? formData.ordered_glasses : false;
  const orderedContacts = 'ordered_contacts' in formData ? formData.ordered_contacts : false;
  return (
    <div className={`${mui.root} ${mui.visionUi}`}>
      <div className={`${mui.cards} ${mui.visionRefractionCards}`}>
        <VisionRefractionCard
          value={visionRefraction}
          onChange={(v: VisionRefraction) => setFormData((prev) => ({ ...prev, vision_refraction: v }))}
          readOnly={submitting}
        />
      </div>
      <div className={mui.visionCheckboxes}>
        <Checkbox
          label="Ordered Glasses"
          checked={orderedGlasses || false}
          onChange={(checked) => setFormData((prev) => ({ ...prev, ordered_glasses: checked }))}
          disabled={submitting}
        />
        <Checkbox
          label="Ordered Contacts"
          checked={orderedContacts || false}
          onChange={(checked) => setFormData((prev) => ({ ...prev, ordered_contacts: checked }))}
          disabled={submitting}
        />
      </div>
    </div>
  );
}

export function DentalSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData: _setFormData, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  const dentalProcedureType = 'dental_procedure_type' in formData ? formData.dental_procedure_type : null;
  const cleaningType = 'cleaning_type' in formData ? formData.cleaning_type : null;
  const xraysTaken = 'xrays_taken' in formData ? formData.xrays_taken : false;
  const fluorideTreatment = 'fluoride_treatment' in formData ? formData.fluoride_treatment : false;
  const sealantsApplied = 'sealants_applied' in formData ? formData.sealants_applied : false;
  const cavitiesFound = 'cavities_found' in formData ? formData.cavities_found : null;
  const cavitiesFilled = 'cavities_filled' in formData ? formData.cavities_filled : null;
  
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
    <div className={sectionStyles.dentalUi}>
      <div className={sectionStyles.dentalFormFields}>
        <FormField
          label="Dental Visit Type"
          type="select"
          value={dentalProcedureType || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, dental_procedure_type: e.target.value || null }))}
          options={procedureTypes}
          disabled={submitting}
        />
        
        {dentalProcedureType === 'cleaning' && (
          <FormField
            label="Cleaning Type"
            type="select"
            value={cleaningType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, cleaning_type: e.target.value || null }))}
            options={cleaningTypes}
            disabled={submitting}
          />
        )}
        
        <div className={sectionStyles.dentalCheckboxes}>
          <Checkbox
            label="X-Rays Taken"
            checked={xraysTaken || false}
            onChange={(checked) => setFormData((prev) => ({ ...prev, xrays_taken: checked }))}
            disabled={submitting}
          />
          <Checkbox
            label="Fluoride Treatment"
            checked={fluorideTreatment || false}
            onChange={(checked) => setFormData((prev) => ({ ...prev, fluoride_treatment: checked }))}
            disabled={submitting}
          />
          <Checkbox
            label="Sealants Applied"
            checked={sealantsApplied || false}
            onChange={(checked) => setFormData((prev) => ({ ...prev, sealants_applied: checked }))}
            disabled={submitting}
          />
        </div>
        
        <div className={sectionStyles.dentalNumbers}>
          <div style={{ flex: 1 }}>
            <FormField
              label="Cavities Found"
              type="number"
              value={cavitiesFound ?? ''}
              onChange={(e) => {
              const v = e.target.value;
              const n = v === '' ? null : (() => { const num = parseInt(v, 10); return Number.isNaN(num) ? null : num; })();
              setFormData((prev) => ({ ...prev, cavities_found: n }));
            }}
              min="0"
              disabled={submitting}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FormField
              label="Cavities Filled"
              type="number"
              value={cavitiesFilled ?? ''}
              onChange={(e) => {
              const v = e.target.value;
              const n = v === '' ? null : (() => { const num = parseInt(v, 10); return Number.isNaN(num) ? null : num; })();
              setFormData((prev) => ({ ...prev, cavities_filled: n }));
            }}
              min="0"
              max={cavitiesFound ?? undefined}
              disabled={submitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VaccinesSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData: _setFormData, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  return (
    <VaccineInput
      value={formData.vaccines_administered || []}
      onChange={(vaccines) => setFormData((prev) => ({ ...prev, vaccines_administered: vaccines }))}
      disabled={submitting}
    />
  );
}

export function PrescriptionsSection({ context }: SectionContentPropsWithContext) {
  const { formData, setFormData: _setFormData, submitting } = context;
  const setFormData = _setFormData as React.Dispatch<React.SetStateAction<CreateVisitInput & UpdateVisitInput>>;
  return (
    <PrescriptionInput
      value={formData.prescriptions || []}
      onChange={(prescriptions) => setFormData((prev) => ({ ...prev, prescriptions }))}
      disabled={submitting}
    />
  );
}
