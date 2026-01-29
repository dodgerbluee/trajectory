import { useState, useEffect, useRef } from 'react';
import { childrenApi } from '../lib/api-client';

interface ChildAvatarProps {
  avatar: string | null | undefined;
  gender: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const defaultMale = childrenApi.getDefaultAvatarUrl('male');
const defaultFemale = childrenApi.getDefaultAvatarUrl('female');

/**
 * Renders a child avatar. Fetches with Authorization header and displays via blob URL
 * so avatars load reliably for all accounts (browsers don't send auth for img src).
 */
function ChildAvatar({ avatar, gender, alt = 'Avatar', className, style }: ChildAvatarProps) {
  const defaultUrl = gender === 'male' ? defaultMale : defaultFemale;
  const [src, setSrc] = useState<string>(defaultUrl);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!avatar) {
      setSrc(defaultUrl);
      return;
    }
    let cancelled = false;
    childrenApi.fetchAvatarBlobUrl(avatar).then((blobUrl) => {
      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        return;
      }
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      if (blobUrl) {
        blobRef.current = blobUrl;
        setSrc(blobUrl);
      } else {
        setSrc(defaultUrl);
      }
    });
    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [avatar, gender, defaultUrl]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setSrc(defaultUrl)}
    />
  );
}

export default ChildAvatar;
