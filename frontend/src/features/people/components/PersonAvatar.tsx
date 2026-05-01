import { useMemo } from 'react';
import { peopleApi } from '@lib/api-client';

interface PersonAvatarProps {
  avatar: string | null | undefined;
  gender: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a person avatar. Uses direct image URLs only (no blob fetch, no revoke).
 * Default = public URL; custom = URL with token in query. Stays correct when navigating.
 */
function PersonAvatar({ avatar, gender, alt = 'Avatar', className, style }: PersonAvatarProps) {
  const src = useMemo(() => {
    if (avatar) {
      return peopleApi.getAvatarUrl(avatar);
    }
    return peopleApi.getDefaultAvatarUrl(gender);
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

export default PersonAvatar;
