import type { FamilyRole } from '../types/api';

interface RoleBadgeProps {
  role: FamilyRole;
  className?: string;
}

const LABELS: Record<FamilyRole, string> = {
  owner: 'Owner',
  parent: 'Parent',
  read_only: 'View only',
};

function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  return (
    <span
      className={`role-badge role-badge--${role.replace(/_/g, '-')} ${className}`}
      title={LABELS[role]}
    >
      {LABELS[role]}
    </span>
  );
}

export default RoleBadge;
