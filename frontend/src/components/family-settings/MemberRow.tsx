import Button from '../Button';
import RoleBadge from '../RoleBadge';
import InitialsAvatar from './InitialsAvatar';
import type { FamilyMember as FamilyMemberType, FamilyRole } from '../../types/api';

export type EditableRole = 'parent' | 'read_only';

interface MemberRowProps {
  member: FamilyMemberType;
  currentUserId?: number;
  canEdit: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onRoleChange?: (userId: number, newRole: EditableRole) => void;
  savingUserId?: number | null;
}

function MemberRow({
  member,
  currentUserId,
  canEdit,
  canRemove,
  onRemove,
  onRoleChange,
  savingUserId,
}: MemberRowProps) {
  const isOwner = member.role === 'owner';
  const isCurrentUser = currentUserId === member.user_id;
  const showRemove = canRemove && !isOwner && !isCurrentUser;
  const canChangeRole = canEdit && !isOwner && onRoleChange != null;
  const isSaving = savingUserId === member.user_id;
  const displayRole: EditableRole =
    member.role === 'parent' || member.role === 'read_only' ? member.role : 'parent';

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRoleChange?.(member.user_id, e.target.value as EditableRole);
  };

  return (
    <div className="family-settings-member-row" role="row">
      <div className="family-settings-member-row__main">
        <InitialsAvatar name={member.name} className="family-settings-member-row__avatar" size={40} />
        <div className="family-settings-member-row__info">
          <span className="family-settings-member-row__name">
            {member.name}
            {isCurrentUser && (
              <span className="family-settings-member-row__you" aria-label="You"> (you)</span>
            )}
          </span>
          {member.email && (
            <span className="family-settings-member-row__email">{member.email}</span>
          )}
        </div>
        {canChangeRole ? (
          <select
            className="family-settings-member-row__role-select form-input"
            value={displayRole}
            onChange={handleRoleSelect}
            disabled={isSaving}
            aria-label={`Role for ${member.name}`}
          >
            <option value="parent">Parent</option>
            <option value="read_only">Read only</option>
          </select>
        ) : (
          <RoleBadge role={member.role as FamilyRole} className="family-settings-member-row__badge" />
        )}
      </div>
      {showRemove && (
        <div className="family-settings-member-row__actions">
          <Button variant="secondary" size="sm" onClick={onRemove} className="family-settings-btn-remove">
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

export default MemberRow;
