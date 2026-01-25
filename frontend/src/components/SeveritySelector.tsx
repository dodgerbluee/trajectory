/**
 * Severity selector with emoji faces (1-10 scale)
 */

interface SeveritySelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

const SEVERITY_OPTIONS = [
  { value: 1, emoji: '😊', label: '1 - Barely noticeable' },
  { value: 2, emoji: '🙂', label: '2 - Mild discomfort' },
  { value: 3, emoji: '😐', label: '3 - Slightly uncomfortable' },
  { value: 4, emoji: '😕', label: '4 - Uncomfortable' },
  { value: 5, emoji: '😟', label: '5 - Moderate discomfort' },
  { value: 6, emoji: '😣', label: '6 - Noticeable pain' },
  { value: 7, emoji: '😖', label: '7 - Significant pain' },
  { value: 8, emoji: '😫', label: '8 - Severe pain' },
  { value: 9, emoji: '😩', label: '9 - Very severe pain' },
  { value: 10, emoji: '🤢', label: '10 - Extreme pain' },
];

export default function SeveritySelector({ value, onChange, disabled }: SeveritySelectorProps) {
  return (
    <div className="severity-selector">
      <label className="form-label">
        Severity (1-10)
      </label>
      <div className="severity-options">
        {SEVERITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`severity-option ${value === option.value ? 'selected' : ''}`}
            onClick={() => onChange(value === option.value ? null : option.value)}
            disabled={disabled}
            title={option.label}
          >
            <span className="severity-emoji">{option.emoji}</span>
            <span className="severity-number">{option.value}</span>
          </button>
        ))}
        {value !== null && (
          <button
            type="button"
            className="severity-clear"
            onClick={() => onChange(null)}
            disabled={disabled}
            title="Clear severity"
          >
            Clear
          </button>
        )}
      </div>
      {value !== null && (
        <div className="severity-selected">
          Selected: {SEVERITY_OPTIONS.find(o => o.value === value)?.label}
        </div>
      )}
    </div>
  );
}
