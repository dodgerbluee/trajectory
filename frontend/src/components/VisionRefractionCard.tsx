/**
 * Vision Refraction Card – matches measurement data entry section.
 * Uses measurement-card structure and measurement-field / measurement-input styling.
 */

import { useId } from 'react';

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
  value: VisionRefraction;
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
  const updateEye = (side: 'od' | 'os', eye: EyeRefraction) =>
    onChange({ ...value, [side]: eye });

  const hasValue = hasRefractionValue(value);

  return (
    <div className="measurement-card" data-key="refraction" aria-labelledby="vision-refraction-heading">
      <div className={`measurement-card-header ${hasValue ? 'has-value' : ''}`}>
        <span className="measurement-card-icon" aria-hidden>
          👁
        </span>
        <span className="measurement-card-title" id="vision-refraction-heading">
          Refraction
        </span>
      </div>
      <div className="measurement-card-body expanded">
        <div className="measurement-card-inner">
          <div className="vision-refraction-fields">
            <div className="vision-refraction-row vision-refraction-row-header">
              <span className="vision-refraction-eye-label" aria-hidden />
              <span className="measurement-field-label">Sphere</span>
              <span className="measurement-field-label">Cylinder</span>
              <span className="measurement-field-label">Axis</span>
            </div>
            <div className="vision-refraction-row">
              <span className="vision-refraction-eye-label">OD</span>
              <RefractionNumberInput
                value={value.od.sphere}
                onChange={(v) => updateEye('od', { ...value.od, sphere: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OD sphere"
                suffix="D"
              />
              <RefractionNumberInput
                value={value.od.cylinder}
                onChange={(v) => updateEye('od', { ...value.od, cylinder: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OD cylinder"
                suffix="D"
              />
              <RefractionNumberInput
                value={value.od.axis}
                onChange={(v) => updateEye('od', { ...value.od, axis: v })}
                min={0}
                max={180}
                step={1}
                readOnly={readOnly}
                ariaLabel="OD axis"
              />
            </div>
            <div className="vision-refraction-row">
              <span className="vision-refraction-eye-label">OS</span>
              <RefractionNumberInput
                value={value.os.sphere}
                onChange={(v) => updateEye('os', { ...value.os, sphere: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OS sphere"
                suffix="D"
              />
              <RefractionNumberInput
                value={value.os.cylinder}
                onChange={(v) => updateEye('os', { ...value.os, cylinder: v })}
                step={0.25}
                readOnly={readOnly}
                ariaLabel="OS cylinder"
                suffix="D"
              />
              <RefractionNumberInput
                value={value.os.axis}
                onChange={(v) => updateEye('os', { ...value.os, axis: v })}
                min={0}
                max={180}
                step={1}
                readOnly={readOnly}
                ariaLabel="OS axis"
              />
            </div>
          </div>
          <div className="measurement-field vision-refraction-notes-field">
            <label htmlFor="vision-refraction-notes" className="measurement-field-label">
              Notes
            </label>
            <textarea
              id="vision-refraction-notes"
              className="measurement-input vision-input-textarea"
              placeholder="Refraction notes"
              value={value.notes ?? ''}
              onChange={(e) => onChange({ ...value, notes: e.target.value })}
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
    <div className="measurement-field">
      <label htmlFor={id} className="visually-hidden">
        {ariaLabel}
      </label>
      <div className="measurement-input-with-suffix">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="measurement-input"
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
        {suffix ? <span className="measurement-suffix">{suffix}</span> : null}
      </div>
    </div>
  );
}
