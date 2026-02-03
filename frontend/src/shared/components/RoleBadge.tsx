import type { FamilyRole } from '../../types/api';
import styles from './RoleBadge.module.css';

interface RoleBadgeProps {
  role: FamilyRole;
  className?: string;
}

const LABELS: Record<FamilyRole, string> = {
  owner: 'Owner',
  parent: 'Parent',
  read_only: 'View only',
};

const ROLE_CLASS: Record<FamilyRole, string> = {
  owner: styles.owner,
  parent: styles.parent,
  read_only: styles.readOnly,
};

function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  return (
    <span
      className={[styles.root, ROLE_CLASS[role], className].filter(Boolean).join(' ')}
      title={LABELS[role]}
    >
      {LABELS[role]}
    </span>
  );
}

export default RoleBadge;
