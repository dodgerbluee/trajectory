import { useState } from 'react';
import type { Prescription } from '../types/api';
import Button from './Button';
import FormField from './FormField';

interface PrescriptionInputProps {
  value: Prescription[];
  onChange: (prescriptions: Prescription[]) => void;
  disabled?: boolean;
}

function PrescriptionInput({ value, onChange, disabled }: PrescriptionInputProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempPrescription, setTempPrescription] = useState<Prescription>({
    medication: '',
    dosage: '',
    duration: '',
    notes: '',
  });

  const handleAdd = () => {
    setEditingIndex(value.length);
    setTempPrescription({ medication: '', dosage: '', duration: '', notes: '' });
  };

  const handleSave = () => {
    if (!tempPrescription.medication || !tempPrescription.dosage || !tempPrescription.duration) {
      alert('Medication, dosage, and duration are required');
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
    setEditingIndex(null);
    setTempPrescription({ medication: '', dosage: '', duration: '', notes: '' });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setTempPrescription({ medication: '', dosage: '', duration: '', notes: '' });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setTempPrescription({ ...value[index] });
  };

  const handleDelete = (index: number) => {
    if (window.confirm('Delete this prescription?')) {
      const newPrescriptions = value.filter((_, i) => i !== index);
      onChange(newPrescriptions);
    }
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="prescription-list">
          {value.map((rx, index) => (
            editingIndex === index ? null : (
              <div key={index} className="prescription-item">
                <div className="prescription-details">
                  <strong>{rx.medication}</strong>
                  <span> - {rx.dosage}, {rx.duration}</span>
                  {rx.notes && <div className="prescription-notes">{rx.notes}</div>}
                </div>
                <div className="prescription-actions">
                  <Button variant="secondary" onClick={() => handleEdit(index)} disabled={disabled}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(index)} disabled={disabled}>
                    Delete
                  </Button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {editingIndex !== null && (
        <div className="prescription-editor">
          <FormField
            label="Medication Name"
            type="text"
            value={tempPrescription.medication}
            onChange={(e) => setTempPrescription({ ...tempPrescription, medication: e.target.value })}
            required
            disabled={disabled}
            placeholder="e.g., Amoxicillin"
          />
          <FormField
            label="Dosage"
            type="text"
            value={tempPrescription.dosage}
            onChange={(e) => setTempPrescription({ ...tempPrescription, dosage: e.target.value })}
            required
            disabled={disabled}
            placeholder="e.g., 250mg twice daily"
          />
          <FormField
            label="Duration"
            type="text"
            value={tempPrescription.duration}
            onChange={(e) => setTempPrescription({ ...tempPrescription, duration: e.target.value })}
            required
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
          <div className="form-actions">
            <Button onClick={handleSave} disabled={disabled}>
              {editingIndex >= value.length ? 'Add' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={handleCancel} disabled={disabled}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {editingIndex === null && (
        <div className={value.length === 0 ? 'prescription-empty' : 'prescription-add-wrap'}>
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
        </div>
      )}
    </div>
  );
}

export default PrescriptionInput;
