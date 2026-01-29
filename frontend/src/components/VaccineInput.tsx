import { useState, useEffect, useRef } from 'react';
import { HiX } from 'react-icons/hi';

interface VaccineInputProps {
  value: string[];
  onChange: (vaccines: string[]) => void;
  disabled?: boolean;
}

const COMMON_VACCINES = [
  'DTaP', 'Tdap', 'Hib', 'IPV', 'PCV13', 'Rotavirus',
  'MMR', 'Varicella', 'Hepatitis A', 'Hepatitis B',
  'Influenza', 'COVID-19', 'Meningococcal',
];

function VaccineInput({ value, onChange, disabled }: VaccineInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInModal, setSelectedInModal] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize selectedInModal when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setSelectedInModal([...value]);
      setSearchQuery('');
    }
  }, [isModalOpen, value]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isModalOpen]);

  const handleToggleVaccine = (vaccine: string) => {
    if (selectedInModal.includes(vaccine)) {
      setSelectedInModal(selectedInModal.filter(v => v !== vaccine));
    } else {
      setSelectedInModal([...selectedInModal, vaccine]);
    }
  };

  const handleSave = () => {
    onChange(selectedInModal);
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleRemove = (vaccine: string) => {
    onChange(value.filter(v => v !== vaccine));
  };

  const filteredVaccines = COMMON_VACCINES.filter(v =>
    v.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="vaccine-input-modern">
      <div className="vaccine-badges-list">
        {value.map((vaccine) => (
          <span key={vaccine} className="vaccine-badge-item">
            <span className="vaccine-badge-icon">💉</span>
            <span className="vaccine-badge-text">{vaccine}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(vaccine)}
                className="vaccine-badge-remove"
                title="Remove vaccine"
              >
                <HiX />
              </button>
            )}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={disabled}
          className="measurement-card-add"
          title="Add Vaccine"
        >
          <span className="measurement-card-icon" aria-hidden>💉</span>
          <span className="measurement-card-add-label">Add Vaccine</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="vaccine-modal-overlay">
          <div className="vaccine-modal-content" ref={modalRef}>
            <div className="vaccine-modal-header">
              <h3 className="vaccine-modal-title">Select Vaccines</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="vaccine-modal-close"
                title="Close"
              >
                <HiX />
              </button>
            </div>

            <div className="vaccine-modal-body">
              <div className="vaccine-search">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vaccines..."
                  className="vaccine-search-input"
                  autoFocus
                />
              </div>

              <div className="vaccine-list">
                {filteredVaccines.length === 0 ? (
                  <p className="vaccine-list-empty">No vaccines found matching "{searchQuery}"</p>
                ) : (
                  filteredVaccines.map((vaccine) => (
                    <label key={vaccine} className="vaccine-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedInModal.includes(vaccine)}
                        onChange={() => handleToggleVaccine(vaccine)}
                        className="vaccine-checkbox"
                      />
                      <span className="vaccine-checkbox-label">{vaccine}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="vaccine-modal-footer">
              <button
                type="button"
                onClick={handleCancel}
                className="vaccine-modal-button vaccine-modal-button-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="vaccine-modal-button vaccine-modal-button-save"
              >
                Save ({selectedInModal.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VaccineInput;
