import React, { useId } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

const SickIcon: React.FC<IconProps> = ({ size = 48, className, title = 'Sick Visit' }) => {
  const id = useId();
  const gid = `sick-grad-${id}`;
  const fid = `sick-shadow-${id}`;

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
          <stop offset="0%" stopColor="#FFD6A5" />
          <stop offset="100%" stopColor="#FF6B6B" />
        </linearGradient>
        <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#3b1f00" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect x="6" y="6" width="52" height="52" rx="12" fill={`url(#${gid})`} filter={`url(#${fid})`} />

      {/* pill shape */}
      <rect x="16" y="20" width="32" height="12" rx="6" fill="#ffffff" />
      <rect x="28" y="18" width="8" height="16" rx="4" fill="#FFEFE6" />
      {/* small sparkle */}
      <circle cx="44" cy="22" r="2" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
};

export default SickIcon;
