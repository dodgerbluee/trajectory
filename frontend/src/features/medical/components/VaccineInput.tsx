import { useState, useEffect, useRef } from 'react';
import { HiX } from 'react-icons/hi';
import styles from './VaccineInput.module.css';

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
    <div className={styles.root}>
      <div className={styles.badgesList}>
        {value.map((vaccine) => (
          <span key={vaccine} className={styles.badgeItem}>
            <span className={styles.badgeIcon}>💉</span>
            <span className={styles.badgeText}>{vaccine}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(vaccine)}
                className={styles.badgeRemove}
                title="Remove vaccine"
              >
                <HiX />
              </button>
            )}
          </span>
        ))}
        <div className={value.length === 0 ? styles.empty : ''}>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={disabled}
            className={styles.addButton}
            title="Add Vaccine"
          >
            <span aria-hidden>💉</span>
            {value.length === 0 && <span>Add Vaccine</span>}
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} ref={modalRef}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Select Vaccines</h3>
              <button
                type="button"
                onClick={handleCancel}
                className={styles.modalClose}
                title="Close"
              >
                <HiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.search}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vaccines..."
                  className={styles.searchInput}
                  autoFocus
                />
              </div>

              <div className={styles.list}>
                {filteredVaccines.length === 0 ? (
                  <p className={styles.listEmpty}>No vaccines found matching "{searchQuery}"</p>
                ) : (
                  filteredVaccines.map((vaccine) => (
                    <label key={vaccine} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={selectedInModal.includes(vaccine)}
                        onChange={() => handleToggleVaccine(vaccine)}
                        className={styles.checkbox}
                      />
                      <span className={styles.checkboxLabel}>{vaccine}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={handleCancel}
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`${styles.modalButton} ${styles.modalButtonSave}`}
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
