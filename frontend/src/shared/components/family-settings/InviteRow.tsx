import Button from '../Button';
import RoleBadge from '../RoleBadge';
import type { FamilyInvite } from '../../types/api';
import type { FamilyRole } from '../../types/api';
import styles from './InviteRow.module.css';

interface InviteRowProps {
  invite: FamilyInvite;
  hasToken: boolean;
  onCopyLink: () => void;
  onRevoke: () => void;
}

function InviteRow({ invite, hasToken, onCopyLink, onRevoke }: InviteRowProps) {
  const expiresAt = new Date(invite.expires_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className={styles.row} role="row">
      <div className={styles.main}>
        <RoleBadge role={invite.role as FamilyRole} className={styles.badge} />
        <span className={styles.expires}>Expires {expiresAt}</span>
      </div>
      <div className={styles.actions}>
        {hasToken && (
          <Button variant="secondary" size="sm" onClick={onCopyLink}>
            Copy link
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={onRevoke}>
          Revoke
        </Button>
      </div>
    </div>
  );
}

export default InviteRow;
