import { useMemo } from 'react';
import { childrenApi } from '../../../lib/api-client';

interface ChildAvatarProps {
  avatar: string | null | undefined;
  gender: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a child avatar. Uses direct image URLs only (no blob fetch, no revoke).
 * Default = public URL; custom = URL with token in query. Stays correct when navigating.
 */
function ChildAvatar({ avatar, gender, alt = 'Avatar', className, style }: ChildAvatarProps) {
  const src = useMemo(() => {
    if (avatar) {
      return childrenApi.getAvatarUrl(avatar);
    }
    return childrenApi.getDefaultAvatarUrl(gender);
  }, [avatar, gender]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      key={avatar || `default-${gender}`}
    />
  );
}

export default ChildAvatar;
