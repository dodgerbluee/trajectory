import Button from '../Button';
import RoleBadge from '../RoleBadge';
import type { FamilyInvite } from '../../types/api';
import type { FamilyRole } from '../../types/api';

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
    <div className="family-settings-invite-row" role="row">
      <div className="family-settings-invite-row__main">
        <RoleBadge role={invite.role as FamilyRole} className="family-settings-invite-row__badge" />
        <span className="family-settings-invite-row__expires">Expires {expiresAt}</span>
      </div>
      <div className="family-settings-invite-row__actions">
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
