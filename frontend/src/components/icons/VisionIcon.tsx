import React, { useId } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

const VisionIcon: React.FC<IconProps> = ({ size = 48, className, title = 'Vision Visit' }) => {
  const id = useId();
  const gid = `vision-grad-${id}`;
  const fid = `vision-shadow-${id}`;

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
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#795400" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect x="6" y="6" width="52" height="52" rx="12" fill={`url(#${gid})`} filter={`url(#${fid})`} />

      {/* eye shape */}
      <ellipse cx="32" cy="32" rx="14" ry="8" fill="#ffffff" />
      <circle cx="32" cy="32" r="4" fill="#F7F7F7" />
      <circle cx="32" cy="32" r="2" fill="#FCD34D" />
    </svg>
  );
};

export default VisionIcon;
