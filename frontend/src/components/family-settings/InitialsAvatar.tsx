/**
 * Avatar showing initials (e.g. "JD" for John Doe). Used in member rows.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic color index from name for consistent avatar background. */
function getColorIndex(name: string): number {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return Math.abs(n) % 6;
}

const AVATAR_COLORS = [
  'var(--color-primary)',
  'var(--color-vision, #7c3aed)',
  'var(--color-success)',
  'var(--color-info)',
  'var(--color-warning)',
  'var(--color-secondary)',
];

interface InitialsAvatarProps {
  name: string;
  className?: string;
  size?: number;
}

function InitialsAvatar({ name, className = '', size = 40 }: InitialsAvatarProps) {
  const initials = getInitials(name);
  const color = AVATAR_COLORS[getColorIndex(name)];

  return (
    <div
      className={`family-settings-initials-avatar ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: 'var(--color-text-inverse, #fff)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size <= 32 ? 12 : 14,
        fontWeight: 600,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export default InitialsAvatar;
