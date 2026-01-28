interface Option {
  label: string;
  value: string;
}

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  options: Option[];
  className?: string;
}

function SegmentedControl({ value, onValueChange, options, className = '' }: Props) {
  return (
    <div className={`segmented-control ${className}`.trim()} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={`segmented-control-item ${value === opt.value ? 'active' : ''}`}
          onClick={() => onValueChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
