import type { VisitType } from '../types/api';
import Button from './Button';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuClipboard, LuEye, LuPill } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
// removed phosphor-react Pill import; using Lucide `LuPill` instead

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
        <h2 className="modal-title">Select Visit Type</h2>
        <p className="modal-subtitle">Choose the type of visit you want to add</p>

        <div className="visit-type-selection">
          <button
            className="visit-type-button wellness"
            onClick={() => onSelect('wellness')}
          >
            <div className="visit-type-icon">
              <div className="visit-icon-outline visit-icon--wellness">
                <LuClipboard className="visit-type-svg" />
              </div>
            </div>
            <div className="visit-type-label">Wellness Visit</div>
            <div className="visit-type-description">Routine checkup with measurements</div>
          </button>

          <button
            className="visit-type-button sick"
            onClick={() => onSelect('sick')}
          >
            <div className="visit-type-icon">
              <div className="visit-icon-outline visit-icon--sick">
                <LuPill className="visit-type-svg" />
              </div>
            </div>
            <div className="visit-type-label">Sick Visit</div>
            <div className="visit-type-description">Illness with symptoms and prescriptions</div>
          </button>

          <button
            className="visit-type-button injury"
            onClick={() => onSelect('injury')}
          >
            <div className="visit-type-icon">
              <div className="visit-icon-outline visit-icon--injury">
                <MdOutlinePersonalInjury className="visit-type-svg visit-type-svg--filled" />
              </div>
            </div>
            <div className="visit-type-label">Injury Visit</div>
            <div className="visit-type-description">Sprains, cuts, fractures, and other injuries</div>
          </button>

          <button
            className="visit-type-button dental"
            onClick={() => onSelect('dental')}
          >
            <div className="visit-type-icon">
              <div className="visit-icon-outline visit-icon--dental">
                <HugeiconsIcon icon={DentalToothIcon} className="visit-type-svg" size={24} color="currentColor" />
              </div>
            </div>
            <div className="visit-type-label">Dental Visit</div>
            <div className="visit-type-description">Cleanings, checkups, and dental procedures</div>
          </button>

          <button
            className="visit-type-button vision"
            onClick={() => onSelect('vision')}
          >
            <div className="visit-type-icon">
              <div className="visit-icon-outline visit-icon--vision">
                <LuEye className="visit-type-svg" />
              </div>
            </div>
            <div className="visit-type-label">Vision Visit</div>
            <div className="visit-type-description">Eye exams, prescriptions, and vision care</div>
          </button>
        </div>

        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VisitTypeModal;
