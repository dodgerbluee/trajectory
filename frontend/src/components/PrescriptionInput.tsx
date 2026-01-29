import { useState, useEffect, useRef } from 'react';
import { HiX } from 'react-icons/hi';
import type { Prescription } from '../types/api';
import Button from './Button';
import FormField from './FormField';

interface PrescriptionInputProps {
  value: Prescription[];
  onChange: (prescriptions: Prescription[]) => void;
  disabled?: boolean;
}

function PrescriptionInput({ value, onChange, disabled }: PrescriptionInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempPrescription, setTempPrescription] = useState<Prescription>({
    medication: '',
    dosage: '',
    duration: '',
    notes: '',
  });
  const modalRef = useRef<HTMLDivElement>(null);

  const isAdding = editingIndex === null || editingIndex >= value.length;
  const modalTitle = isAdding ? 'Add Prescription' : 'Edit Prescription';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeModal();
      }
    };
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModalOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setTempPrescription({ medication: '', dosage: '', duration: '', notes: '' });
  };

  const handleAdd = () => {
    setEditingIndex(value.length);
    setTempPrescription({ medication: '', dosage: '', duration: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setTempPrescription({ ...value[index] });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!tempPrescription.medication?.trim() || !tempPrescription.dosage?.trim() || !tempPrescription.duration?.trim()) {
      return;
    }
    const newPrescriptions = [...value];
    if (editingIndex !== null) {
      if (editingIndex >= value.length) {
        newPrescriptions.push(tempPrescription);
      } else {
        newPrescriptions[editingIndex] = tempPrescription;
      }
    }
    onChange(newPrescriptions);
    closeModal();
  };

  const handleCancel = () => {
    closeModal();
  };

  const handleDelete = (index: number) => {
    if (window.confirm('Delete this prescription?')) {
      onChange(value.filter((_, i) => i !== index));
    }
  };

  const canSave =
    (tempPrescription.medication?.trim() ?? '') !== '' &&
    (tempPrescription.dosage?.trim() ?? '') !== '' &&
    (tempPrescription.duration?.trim() ?? '') !== '';

  return (
    <div className="prescription-input-modern">
      {value.length > 0 && (
        <div className="prescription-list">
          {value.map((rx, index) => (
            <div key={index} className="prescription-item">
              <div className="prescription-details">
                <strong>{rx.medication}</strong>
                <span> — {rx.dosage}, {rx.duration}</span>
                {rx.notes && <div className="prescription-notes">{rx.notes}</div>}
              </div>
              <div className="prescription-actions">
                <Button variant="secondary" size="sm" onClick={() => handleEdit(index)} disabled={disabled}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(index)} disabled={disabled}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className="measurement-card-add"
        title="Add Prescription"
      >
        <span className="measurement-card-icon" aria-hidden>💊</span>
        <span className="measurement-card-add-label">Add Prescription</span>
      </button>

      {isModalOpen && (
        <div className="vaccine-modal-overlay">
          <div className="vaccine-modal-content prescription-modal-content" ref={modalRef}>
            <div className="vaccine-modal-header">
              <h3 className="vaccine-modal-title">{modalTitle}</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="vaccine-modal-close"
                title="Close"
                aria-label="Close"
              >
                <HiX />
              </button>
            </div>

            <div className="vaccine-modal-body">
              <div className="prescription-modal-fields">
                <FormField
                  label="Medication Name"
                  type="text"
                  value={tempPrescription.medication}
                  onChange={(e) => setTempPrescription({ ...tempPrescription, medication: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g., Amoxicillin"
                />
                <FormField
                  label="Dosage"
                  type="text"
                  value={tempPrescription.dosage}
                  onChange={(e) => setTempPrescription({ ...tempPrescription, dosage: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g., 250mg twice daily"
                />
                <FormField
                  label="Duration"
                  type="text"
                  value={tempPrescription.duration}
                  onChange={(e) => setTempPrescription({ ...tempPrescription, duration: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g., 10 days"
                />
                <FormField
                  label="Notes (Optional)"
                  type="textarea"
                  value={tempPrescription.notes || ''}
                  onChange={(e) => setTempPrescription({ ...tempPrescription, notes: e.target.value })}
                  disabled={disabled}
                  placeholder="Additional instructions"
                  rows={2}
                />
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
                disabled={!canSave || disabled}
                className="vaccine-modal-button vaccine-modal-button-save"
              >
                {isAdding ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrescriptionInput;
