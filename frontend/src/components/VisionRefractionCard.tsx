/* VisionRefractionCard — modernized markup and accessibility
   - Grid layout for quick scanning
   - Clear labels, focus styles, and compact inputs
*/

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

export function VisionRefractionCard({ value, onChange, readOnly = false }: VisionRefractionCardProps) {
  const updateEye = (side: 'od' | 'os', eye: EyeRefraction) => onChange({ ...value, [side]: eye });

  return (
    <section className="vision-refraction-card" aria-labelledby="refraction-heading">
      <header className="vision-refraction-header">
        <h3 id="refraction-heading">Refraction</h3>
      </header>

      <div className="refraction-grid">
        <div className="col-label" aria-hidden />
        <div className="col-label">Sphere</div>
        <div className="col-label">Cylinder</div>
        <div className="col-label">Axis</div>

        <div className="eye-label">OD</div>
        <NumberInput
          ariaLabel="OD sphere"
          value={value.od.sphere}
          onChange={(v) => updateEye('od', { ...value.od, sphere: v })}
          step={0.25}
          readOnly={readOnly}
        />
        <NumberInput
          ariaLabel="OD cylinder"
          value={value.od.cylinder}
          onChange={(v) => updateEye('od', { ...value.od, cylinder: v })}
          step={0.25}
          readOnly={readOnly}
        />
        <NumberInput
          ariaLabel="OD axis"
          value={value.od.axis}
          onChange={(v) => updateEye('od', { ...value.od, axis: v })}
          min={0}
          max={180}
          step={1}
          readOnly={readOnly}
        />

        <div className="eye-label">OS</div>
        <NumberInput
          ariaLabel="OS sphere"
          value={value.os.sphere}
          onChange={(v) => updateEye('os', { ...value.os, sphere: v })}
          step={0.25}
          readOnly={readOnly}
        />
        <NumberInput
          ariaLabel="OS cylinder"
          value={value.os.cylinder}
          onChange={(v) => updateEye('os', { ...value.os, cylinder: v })}
          step={0.25}
          readOnly={readOnly}
        />
        <NumberInput
          ariaLabel="OS axis"
          value={value.os.axis}
          onChange={(v) => updateEye('os', { ...value.os, axis: v })}
          min={0}
          max={180}
          step={1}
          readOnly={readOnly}
        />
      </div>

      <footer className="refraction-notes">
        <label className="visually-hidden" htmlFor="refraction-notes">Refraction notes</label>
        <textarea
          id="refraction-notes"
          className="refraction-input"
          placeholder="Notes"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          disabled={readOnly}
          rows={3} />
      </footer>
    </section>
  );
}

type NumberInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  readOnly?: boolean;
  ariaLabel?: string;
};

function NumberInput({ value, onChange, step, min, max, readOnly, ariaLabel }: NumberInputProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className="refraction-input"
      aria-label={ariaLabel}
      value={value ?? ''}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      disabled={readOnly}
    />
  );
}
