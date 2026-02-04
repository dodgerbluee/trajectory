/**
 * Vision Refraction Card – matches measurement data entry section.
 * Uses measurement-card structure and measurement-field / measurement-input styling.
 */

import { useId } from 'react';
import mui from '@shared/styles/MeasurementsUI.module.css';

export type EyeRefraction = {
  sphere: number | null;
  cylinder: number | null;
  axis: number | null;
};

export type VisionRefraction = {
  od: EyeRefraction;
  os: EyeRefraction;
  notes?: string;
};

type VisionRefractionCardProps = {
  value: VisionRefraction | null | undefined;
  onChange: (value: VisionRefraction) => void;
  readOnly?: boolean;
};

function hasRefractionValue(value: VisionRefraction): boolean {
  const { od, os, notes } = value;
  const eyeHasVal = (e: EyeRefraction) =>
    e.sphere != null || e.cylinder != null || e.axis != null;
  return eyeHasVal(od) || eyeHasVal(os) || (notes != null && notes.trim() !== '');
}

export function VisionRefractionCard({
  value,
  onChange,
  readOnly = false,
}: VisionRefractionCardProps) {
  const defaultValue: VisionRefraction = {
    od: { sphere: null, cylinder: null, axis: null },
    os: { sphere: null, cylinder: null, axis: null },
    notes: undefined,
  };
  const actualValue = value ?? defaultValue;
  
  const updateEye = (side: 'od' | 'os', eye: EyeRefraction) =>
    onChange({ ...actualValue, [side]: eye });

  const hasValue = hasRefractionValue(actualValue);

  return (
    <div className={mui.card} data-key="refraction" aria-labelledby="vision-refraction-heading">
      <div className={`${mui.cardHeader} ${hasValue ? mui.hasValue : ''}`}>
        <span className={mui.cardIcon} aria-hidden>
          👁
        </span>
        <span className={mui.cardTitle} id="vision-refraction-heading">
          Refraction
        </span>
      </div>
      <div className={mui.cardBody}>
        <div className={mui.cardInner}>
          <div className={mui.visionRefractionFields}>
            <div className={`${mui.visionRefractionRow} ${mui.visionRefractionRowHeader}`}>
              <span className={mui.visionRefractionEyeLabel} aria-hidden />
              <span className={mui.fieldLabel}>Sphere</span>
              <span className={mui.fieldLabel}>Cylinder</span>
              <span className={mui.fieldLabel}>Axis</span>
            </div>
            <div className={mui.visionRefractionRow}>
              <span className={mui.visionRefractionEyeLabel}>OD</span>
              <RefractionNumberInput
                value={actualValue.od.sphere}
                onChange={(v) => updateEye('od', { ...actualValue.od, sphere: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OD sphere"
                suffix="D"
              />
              <RefractionNumberInput
                value={actualValue.od.cylinder}
                onChange={(v) => updateEye('od', { ...actualValue.od, cylinder: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OD cylinder"
                suffix="D"
              />
              <RefractionNumberInput
                value={actualValue.od.axis}
                onChange={(v) => updateEye('od', { ...actualValue.od, axis: v })}
                min={0}
                max={180}
                step={1}
                readOnly={readOnly}
                ariaLabel="OD axis"
              />
            </div>
            <div className={mui.visionRefractionRow}>
              <span className={mui.visionRefractionEyeLabel}>OS</span>
              <RefractionNumberInput
                value={actualValue.os.sphere}
                onChange={(v) => updateEye('os', { ...actualValue.os, sphere: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OS sphere"
                suffix="D"
              />
              <RefractionNumberInput
                value={actualValue.os.cylinder}
                onChange={(v) => updateEye('os', { ...actualValue.os, cylinder: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OS cylinder"
                suffix="D"
              />
              <RefractionNumberInput
                value={actualValue.os.axis}
                onChange={(v) => updateEye('os', { ...actualValue.os, axis: v })}
                min={0}
                max={180}
                step={1}
                readOnly={readOnly}
                ariaLabel="OS axis"
              />
            </div>
          </div>
          <div className={`${mui.field} ${mui.visionRefractionNotesField}`}>
            <label htmlFor="vision-refraction-notes" className={mui.fieldLabel}>
              Notes
            </label>
            <textarea
              id="vision-refraction-notes"
              className={`${mui.input} ${mui.visionInputTextarea}`}
              placeholder="Refraction notes"
              value={actualValue.notes ?? ''}
              onChange={(e) => onChange({ ...actualValue, notes: e.target.value })}
              disabled={readOnly}
              rows={2}
              aria-label="Refraction notes"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type RefractionNumberInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  readOnly?: boolean;
  ariaLabel: string;
  suffix?: string;
};

function RefractionNumberInput({
  value,
  onChange,
  step,
  min,
  max,
  readOnly,
  ariaLabel,
  suffix,
}: RefractionNumberInputProps) {
  const id = useId();
  return (
    <div className={mui.field}>
      <label htmlFor={id} className={mui.visuallyHidden}>
        {ariaLabel}
      </label>
      <div className={mui.inputWithSuffix}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={mui.input}
          aria-label={ariaLabel}
          value={value ?? ''}
          step={step}
          min={min}
          max={max}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
          disabled={readOnly}
          placeholder="—"
        />
        {suffix ? <span className={mui.suffix}>{suffix}</span> : null}
      </div>
    </div>
  );
}
