import type { VisitType } from '../types/api';
import Button from './Button';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuClipboard, LuEye, LuPill } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import modalStyles from './Modal.module.css';
import styles from './VisitTypeModal.module.css';
import vi from '../styles/VisitIcons.module.css';

interface VisitTypeModalProps {
  isOpen: boolean;
  onSelect: (visitType: VisitType) => void;
  onClose: () => void;
}

function VisitTypeModal({ isOpen, onSelect, onClose }: VisitTypeModalProps) {
  if (!isOpen) return null;

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <h2 className={modalStyles.title}>Select Visit Type</h2>
        <p className={modalStyles.subtitle}>Choose the type of visit you want to add</p>

        <div className={styles.selection}>
          <button
            className={`${styles.button} ${styles.buttonWellness}`}
            onClick={() => onSelect('wellness')}
          >
            <div className={`${styles.iconWrapper} ${vi.typeIcon}`}>
              <div className={`${vi.iconOutline} ${vi.iconWellness}`}>
                <LuClipboard className={vi.typeSvg} />
              </div>
            </div>
            <div className={styles.label}>Wellness Visit</div>
            <div className={styles.description}>Routine checkup with measurements</div>
          </button>

          <button
            className={`${styles.button} ${styles.buttonSick}`}
            onClick={() => onSelect('sick')}
          >
            <div className={`${styles.iconWrapper} ${vi.typeIcon}`}>
              <div className={`${vi.iconOutline} ${vi.iconSick}`}>
                <LuPill className={vi.typeSvg} />
              </div>
            </div>
            <div className={styles.label}>Sick Visit</div>
            <div className={styles.description}>Illness with symptoms and prescriptions</div>
          </button>

          <button
            className={`${styles.button} ${styles.buttonInjury}`}
            onClick={() => onSelect('injury')}
          >
            <div className={`${styles.iconWrapper} ${vi.typeIcon}`}>
              <div className={`${vi.iconOutline} ${vi.iconInjury}`}>
                <MdOutlinePersonalInjury className={`${vi.typeSvg} ${vi.typeSvgFilled}`} />
              </div>
            </div>
            <div className={styles.label}>Injury Visit</div>
            <div className={styles.description}>Sprains, cuts, fractures, and other injuries</div>
          </button>

          <button
            className={`${styles.button} ${styles.buttonDental}`}
            onClick={() => onSelect('dental')}
          >
            <div className={`${styles.iconWrapper} ${vi.typeIcon}`}>
              <div className={`${vi.iconOutline} ${vi.iconDental}`}>
                <HugeiconsIcon icon={DentalToothIcon} className={vi.typeSvg} size={24} color="currentColor" />
              </div>
            </div>
            <div className={styles.label}>Dental Visit</div>
            <div className={styles.description}>Cleanings, checkups, and dental procedures</div>
          </button>

          <button
            className={`${styles.button} ${styles.buttonVision}`}
            onClick={() => onSelect('vision')}
          >
            <div className={`${styles.iconWrapper} ${vi.typeIcon}`}>
              <div className={`${vi.iconOutline} ${vi.iconVision}`}>
                <LuEye className={vi.typeSvg} />
              </div>
            </div>
            <div className={styles.label}>Vision Visit</div>
            <div className={styles.description}>Eye exams, prescriptions, and vision care</div>
          </button>
        </div>

        <div className={modalStyles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VisitTypeModal;
