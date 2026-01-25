import type { VisitType } from '../types/api';
import Button from './Button';
import Card from './Card';

interface VisitTypeModalProps {
  isOpen: boolean;
  onSelect: (visitType: VisitType) => void;
  onClose: () => void;
}

function VisitTypeModal({ isOpen, onSelect, onClose }: VisitTypeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <Card>
          <h2 className="modal-title">Select Visit Type</h2>
          <p className="modal-subtitle">Choose the type of visit you want to add</p>
          
          <div className="visit-type-selection">
            <button
              className="visit-type-button wellness"
              onClick={() => onSelect('wellness')}
            >
              <div className="visit-type-icon">📋</div>
              <div className="visit-type-label">Wellness Visit</div>
              <div className="visit-type-description">Routine checkup with measurements</div>
            </button>
            
            <button
              className="visit-type-button sick"
              onClick={() => onSelect('sick')}
            >
              <div className="visit-type-icon">🤒</div>
              <div className="visit-type-label">Sick Visit</div>
              <div className="visit-type-description">Illness with symptoms and prescriptions</div>
            </button>
            
            <button
              className="visit-type-button injury"
              onClick={() => onSelect('injury')}
            >
              <div className="visit-type-icon">🩹</div>
              <div className="visit-type-label">Injury Visit</div>
              <div className="visit-type-description">Sprains, cuts, fractures, and other injuries</div>
            </button>
            
            <button
              className="visit-type-button vision"
              onClick={() => onSelect('vision')}
            >
              <div className="visit-type-icon">👁️</div>
              <div className="visit-type-label">Vision Visit</div>
              <div className="visit-type-description">Eye exams, prescriptions, and vision care</div>
            </button>
          </div>
          
          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default VisitTypeModal;
