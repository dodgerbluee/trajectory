/**
 * Measurements Input – healthcare UI
 * Dark-mode–friendly, clear hierarchy, units as suffixes, collapsible secondary sections.
 */

import { useState, useId } from 'react';
import mui from '../styles/MeasurementsUI.module.css';

interface MeasurementsInputProps {
  weightValue: number | null;
  weightOunces: number | null;
  weightPercentile: number | null;
  heightValue: number | null;
  heightPercentile: number | null;
  headCircumferenceValue: number | null;
  headCircumferencePercentile: number | null;
  bmiValue: number | null;
  bmiPercentile: number | null;
  bloodPressure: string | null;
  heartRate: number | null;
  onWeightChange: (value: number | null) => void;
  onWeightOuncesChange: (value: number | null) => void;
  onWeightPercentileChange: (value: number | null) => void;
  onHeightChange: (value: number | null) => void;
  onHeightPercentileChange: (value: number | null) => void;
  onHeadCircumferenceChange: (value: number | null) => void;
  onHeadCircumferencePercentileChange: (value: number | null) => void;
  onBmiChange: (value: number | null) => void;
  onBmiPercentileChange: (value: number | null) => void;
  onBloodPressureChange: (value: string | null) => void;
  onHeartRateChange: (value: number | null) => void;
  disabled?: boolean;
}

interface MeasurementFieldWithSuffixProps {
  label: string;
  value: number | string;
  onChange?: (v: number | null) => void;
  onTextChange?: (v: string | null) => void;
  suffix: string;
  type?: 'number' | 'text';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  disabled?: boolean;
  helper?: string;
}

function MeasurementFieldWithSuffix({
  label,
  value,
  onChange,
  onTextChange,
  suffix,
  type = 'number',
  placeholder = '—',
  min,
  max,
  step,
  disabled,
  helper,
}: MeasurementFieldWithSuffixProps) {
  const id = useId();
  const isText = type === 'text';
  const strVal = value === '' || value == null ? '' : String(value);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (isText) {
      onTextChange?.(raw === '' ? null : raw);
      return;
    }
    if (raw === '') {
      onChange?.(null);
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) onChange?.(n);
  };
  return (
    <div className={mui.field}>
      <label htmlFor={id} className={mui.fieldLabel}>{label}</label>
      <div className={mui.inputWithSuffix}>
        <input
          id={id}
          type={type}
          className={mui.input}
          value={strVal}
          onChange={handleChange}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />
        {suffix ? <span className={mui.suffix}>{suffix}</span> : null}
      </div>
      {helper ? <span className={mui.fieldHelper}>{helper}</span> : null}
    </div>
  );
}

function MeasurementsInput({
  weightValue,
  weightOunces,
  weightPercentile,
  heightValue,
  heightPercentile,
  headCircumferenceValue,
  headCircumferencePercentile,
  bmiValue,
  bmiPercentile,
  bloodPressure,
  heartRate,
  onWeightChange,
  onWeightOuncesChange,
  onWeightPercentileChange,
  onHeightChange,
  onHeightPercentileChange,
  onHeadCircumferenceChange,
  onHeadCircumferencePercentileChange,
  onBmiChange,
  onBmiPercentileChange,
  onBloodPressureChange,
  onHeartRateChange,
  disabled = false,
}: MeasurementsInputProps) {
  type SectionKey = 'weight' | 'height' | 'vitals' | 'head' | 'bmi';
  const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(() => {
    const s = new Set<SectionKey>(['weight', 'height', 'vitals']);
    if (headCircumferenceValue != null || headCircumferencePercentile != null) s.add('head');
    if (bmiValue != null || bmiPercentile != null) s.add('bmi');
    return s;
  });

  const removeSection = (key: SectionKey) => {
    setVisibleSections((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const addSection = (key: SectionKey) => {
    setVisibleSections((prev) => new Set(prev).add(key));
  };

  const hasVal = (key: string): boolean => {
    switch (key) {
      case 'weight':
        return weightValue != null && weightValue !== undefined;
      case 'height':
        return heightValue != null && heightValue !== undefined;
      case 'head':
        return headCircumferenceValue != null && headCircumferenceValue !== undefined;
      case 'bmi':
        return bmiValue != null && bmiValue !== undefined;
      case 'vitals':
        return (bloodPressure != null && bloodPressure !== '') || (heartRate != null && heartRate !== undefined);
      default:
        return false;
    }
  };

  const renderCard = (
    key: SectionKey,
    title: string,
    icon: string,
    children: React.ReactNode
  ) => {
    const hasValue = hasVal(key);

    return (
      <div className={mui.card} data-key={key}>
        <div className={`${mui.cardHeader} ${hasValue ? mui.hasValue : ''}`}>
          <span className={mui.cardIcon} aria-hidden>{icon}</span>
          <span className={mui.cardTitle}>{title}</span>
          <button
            type="button"
            className={mui.cardRemove}
            onClick={() => removeSection(key)}
            disabled={disabled}
            title={`Remove ${title}`}
            aria-label={`Remove ${title}`}
          >
            ×
          </button>
        </div>
        <div className={mui.cardBody}>
          <div className={mui.cardInner}>{children}</div>
        </div>
      </div>
    );
  };

  const addable: { key: SectionKey; title: string; icon: string }[] = [];
  if (!visibleSections.has('weight')) addable.push({ key: 'weight', title: 'Weight', icon: '⚖' });
  if (!visibleSections.has('height')) addable.push({ key: 'height', title: 'Height', icon: '📏' });
  if (!visibleSections.has('vitals')) addable.push({ key: 'vitals', title: 'Vitals', icon: '❤' });
  if (!visibleSections.has('head')) addable.push({ key: 'head', title: 'Head Circumference', icon: '👤' });
  if (!visibleSections.has('bmi')) addable.push({ key: 'bmi', title: 'BMI', icon: '📊' });

  return (
    <div className="measurements-ui">
      <div className="measurements-cards">
        {visibleSections.has('weight') &&
          renderCard(
            'weight',
            'Weight',
            '⚖',
            <div className="measurement-fields">
              <MeasurementFieldWithSuffix
                label="Weight"
                value={weightValue ?? ''}
                onChange={onWeightChange}
                suffix="lbs"
                placeholder="—"
                step="0.1"
                disabled={disabled}
                helper="0–15 oz optional"
              />
              <MeasurementFieldWithSuffix
                label="Ounces"
                value={weightOunces ?? ''}
                onChange={onWeightOuncesChange}
                suffix="oz"
                min={0}
                max={15}
                step="1"
                placeholder="—"
                disabled={disabled}
              />
              <MeasurementFieldWithSuffix
                label="Percentile"
                value={weightPercentile ?? ''}
                onChange={onWeightPercentileChange}
                suffix="%ile"
                min={0}
                max={100}
                step="0.1"
                placeholder="—"
                disabled={disabled}
              />
            </div>
          )}

        {visibleSections.has('height') &&
          renderCard(
            'height',
            'Height',
            '📏',
            <div className={mui.fields}>
              <MeasurementFieldWithSuffix
                label="Height"
                value={heightValue ?? ''}
                onChange={onHeightChange}
                suffix="in"
                step="0.1"
                placeholder="—"
                disabled={disabled}
              />
              <MeasurementFieldWithSuffix
                label="Percentile"
                value={heightPercentile ?? ''}
                onChange={onHeightPercentileChange}
                suffix="%ile"
                min={0}
                max={100}
                step="0.1"
                placeholder="—"
                disabled={disabled}
              />
            </div>
          )}

        {visibleSections.has('vitals') &&
          renderCard(
            'vitals',
            'Vitals',
            '❤',
            <div className="measurement-fields">
              <MeasurementFieldWithSuffix
                label="Blood pressure"
                value={bloodPressure ?? ''}
                onTextChange={onBloodPressureChange}
                suffix=""
                type="text"
                placeholder="e.g. 120/80"
                disabled={disabled}
              />
              <MeasurementFieldWithSuffix
                label="Heart rate"
                value={heartRate ?? ''}
                onChange={onHeartRateChange}
                suffix="bpm"
                min={40}
                max={250}
                step="1"
                placeholder="—"
                disabled={disabled}
              />
            </div>
          )}

        {visibleSections.has('head') &&
          renderCard(
            'head',
            'Head Circumference',
            '👤',
            <div className={mui.fields}>
              <MeasurementFieldWithSuffix
                label="Head circ"
                value={headCircumferenceValue ?? ''}
                onChange={onHeadCircumferenceChange}
                suffix="in"
                step="0.1"
                placeholder="—"
                disabled={disabled}
              />
              <MeasurementFieldWithSuffix
                label="Percentile"
                value={headCircumferencePercentile ?? ''}
                onChange={onHeadCircumferencePercentileChange}
                suffix="%ile"
                min={0}
                max={100}
                step="0.1"
                placeholder="—"
                disabled={disabled}
              />
            </div>
          )}

        {visibleSections.has('bmi') &&
          renderCard(
            'bmi',
            'BMI',
            '📊',
            <div className="measurement-fields">
              <MeasurementFieldWithSuffix
                label="BMI"
                value={bmiValue ?? ''}
                onChange={onBmiChange}
                suffix=""
                step="0.1"
                placeholder="—"
                disabled={disabled}
              />
              <MeasurementFieldWithSuffix
                label="Percentile"
                value={bmiPercentile ?? ''}
                onChange={onBmiPercentileChange}
                suffix="%ile"
                min={0}
                max={100}
                step="0.1"
                placeholder="—"
                disabled={disabled}
              />
            </div>
          )}
      </div>

      {addable.length > 0 && (
        <div className={mui.addRow}>
          {addable.map(({ key, title, icon }) => (
            <button
              key={key}
              type="button"
              className={mui.cardAdd}
              onClick={() => addSection(key)}
              disabled={disabled}
            >
              <span className={mui.cardIcon} aria-hidden>{icon}</span>
              <span className={mui.cardAddLabel}>Add {title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MeasurementsInput;

