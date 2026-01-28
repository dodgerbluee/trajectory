import React, { useId } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

const WellnessIcon: React.FC<IconProps> = ({ size = 48, className, title = 'Wellness Visit' }) => {
  const id = useId();
  const gid = `wellness-grad-${id}`;
  const fid = `wellness-shadow-${id}`;

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
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0b3d91" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* rounded square background */}
      <rect x="6" y="6" width="52" height="52" rx="12" fill={`url(#${gid})`} filter={`url(#${fid})`} />

      {/* clipboard top */}
      <rect x="22" y="10" width="20" height="8" rx="2" fill="#ffffff" opacity="0.95" />
      {/* clipboard body */}
      <rect x="18" y="20" width="28" height="30" rx="4" fill="#ffffff" />

      {/* lines */}
      <rect x="24" y="26" width="16" height="2" rx="1" fill="#E6FDF3" />
      <rect x="24" y="31" width="16" height="2" rx="1" fill="#E6FDF3" />
      <rect x="24" y="36" width="10" height="2" rx="1" fill="#E6FDF3" />
    </svg>
  );
};

export default WellnessIcon;
