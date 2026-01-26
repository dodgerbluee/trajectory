import React, { useId } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

const InjuryIcon: React.FC<IconProps> = ({ size = 48, className, title = 'Injury Visit' }) => {
  const id = useId();
  const gid = `injury-grad-${id}`;
  const fid = `injury-shadow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0b3d91" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect x="6" y="6" width="52" height="52" rx="12" fill={`url(#${gid})`} filter={`url(#${fid})`} />

      {/* bandage icon */}
      <rect x="14" y="26" width="36" height="12" rx="6" fill="#ffffff" />
      <rect x="22" y="22" width="20" height="4" rx="2" fill="#ffffff" opacity="0.9" />
      <circle cx="32" cy="32" r="2" fill="#E6F0FF" />
      <circle cx="26" cy="32" r="1.2" fill="#E6F0FF" />
      <circle cx="38" cy="32" r="1.2" fill="#E6F0FF" />
    </svg>
  );
};

export default InjuryIcon;
