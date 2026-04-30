/**
 * QuickActionsRow – four large tap targets at the top of the mobile home feed
 * for the most common in-the-moment actions.
 *
 * Selecting an action navigates with optional state to scope to the active
 * child (so the destination page can prefill).
 */

import { useNavigate } from 'react-router-dom';
import { LuStethoscope, LuThermometer, LuRuler, LuPaperclip } from 'react-icons/lu';
import styles from './QuickActionsRow.module.css';

interface QuickActionsRowProps {
  /** When set, deep-links scope to this child where supported. */
  childId: number | null;
}

function QuickActionsRow({ childId }: QuickActionsRowProps) {
  const navigate = useNavigate();

  const goAddVisit = () => {
    // /visits/new → existing VisitTypeModal flow
    if (childId != null) {
      navigate(`/people/${childId}/visits/new`);
    } else {
      navigate('/visits/new');
    }
  };

  const goAddIllness = () => navigate('/illnesses/new');

  const goAddMeasurement = () => {
    // No standalone measurement page exists; route to wellness visit creation
    // pre-typed (uses the wellness flow which captures vitals).
    if (childId != null) {
      navigate(`/people/${childId}/visits/new?type=wellness`);
    } else {
      navigate('/visits/new?type=wellness');
    }
  };

  const goAddDocument = () => {
    // Route to child detail Documents tab where attachments are managed.
    if (childId != null) {
      navigate(`/people/${childId}`, { state: { tab: 'documents' } });
    } else {
      navigate('/');
    }
  };

  return (
    <div className={styles.row} role="group" aria-label="Quick actions">
      <button type="button" className={styles.action} onClick={goAddVisit}>
        <span className={`${styles.iconWrap} ${styles.iconVisit}`}>
          <LuStethoscope className={styles.icon} aria-hidden="true" />
        </span>
        <span className={styles.label}>Log visit</span>
      </button>

      <button type="button" className={styles.action} onClick={goAddIllness}>
        <span className={`${styles.iconWrap} ${styles.iconIllness}`}>
          <LuThermometer className={styles.icon} aria-hidden="true" />
        </span>
        <span className={styles.label}>Log illness</span>
      </button>

      <button type="button" className={styles.action} onClick={goAddMeasurement}>
        <span className={`${styles.iconWrap} ${styles.iconMeasure}`}>
          <LuRuler className={styles.icon} aria-hidden="true" />
        </span>
        <span className={styles.label}>Measure</span>
      </button>

      <button type="button" className={styles.action} onClick={goAddDocument}>
        <span className={`${styles.iconWrap} ${styles.iconDoc}`}>
          <LuPaperclip className={styles.icon} aria-hidden="true" />
        </span>
        <span className={styles.label}>Attach</span>
      </button>
    </div>
  );
}

export default QuickActionsRow;
