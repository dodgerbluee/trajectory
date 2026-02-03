import Button from '../Button';
import RoleBadge from '../RoleBadge';
import InitialsAvatar from './InitialsAvatar';
import type { FamilyMember as FamilyMemberType, FamilyRole } from '../../../types/api';
import styles from './MemberRow.module.css';

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
    <div className={styles.row} role="row">
      <div className={styles.main}>
        <InitialsAvatar name={member.username} className={styles.avatar} size={40} />
        <div className={styles.info}>
          <span className={styles.name}>
            {member.username}
            {isCurrentUser && (
              <span className={styles.you} aria-label="You"> (you)</span>
            )}
          </span>
          {member.email && (
            <span className={styles.email}>{member.email}</span>
          )}
        </div>
        {canChangeRole ? (
          <select
            className={`${styles.roleSelect} form-input`}
            value={displayRole}
            onChange={handleRoleSelect}
            disabled={isSaving}
            aria-label={`Role for ${member.username}`}
          >
            <option value="parent">Parent</option>
            <option value="read_only">Read only</option>
          </select>
        ) : (
          <RoleBadge role={member.role as FamilyRole} className={styles.badge} />
        )}
      </div>
      {showRemove && (
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={onRemove} className={styles.btnRemove}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

export default MemberRow;
