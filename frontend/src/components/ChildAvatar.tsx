import { useState, useEffect, useRef } from 'react';
import { childrenApi } from '../lib/api-client';

interface ChildAvatarProps {
  avatar: string | null | undefined;
  gender: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Fetch default avatar as blob URL (public, no auth required)
 */
async function fetchDefaultAvatarBlobUrl(gender: string): Promise<string | null> {
  const defaultUrl = childrenApi.getDefaultAvatarUrl(gender);
  try {
    const res = await fetch(defaultUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Renders a child avatar. Fetches with Authorization header and displays via blob URL
 * so avatars load reliably for all accounts (browsers don't send auth for img src).
 */
function ChildAvatar({ avatar, gender, alt = 'Avatar', className, style }: ChildAvatarProps) {
  const [src, setSrc] = useState<string>('');
  const blobRef = useRef<string | null>(null);
  const defaultBlobRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fetch default avatar first
    fetchDefaultAvatarBlobUrl(gender).then((blobUrl) => {
      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        return;
      }
      if (defaultBlobRef.current) {
        URL.revokeObjectURL(defaultBlobRef.current);
      }
      if (blobUrl) {
        defaultBlobRef.current = blobUrl;
        if (!avatar) {
          setSrc(blobUrl);
        }
      }
    });

    if (!avatar) {
      return () => {
        cancelled = true;
        if (defaultBlobRef.current) {
          URL.revokeObjectURL(defaultBlobRef.current);
          defaultBlobRef.current = null;
        }
      };
    }

    // Fetch custom avatar
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
        // Fallback to default if custom avatar fails
        if (defaultBlobRef.current) {
          setSrc(defaultBlobRef.current);
        } else {
          // If default not loaded yet, fetch it now
          fetchDefaultAvatarBlobUrl(gender).then((defaultBlob) => {
            if (!cancelled && defaultBlob) {
              defaultBlobRef.current = defaultBlob;
              setSrc(defaultBlob);
            }
          });
        }
      }
    });

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      if (defaultBlobRef.current) {
        URL.revokeObjectURL(defaultBlobRef.current);
        defaultBlobRef.current = null;
      }
    };
  }, [avatar, gender]);

  // Fallback error handler
  const handleError = () => {
    if (defaultBlobRef.current) {
      setSrc(defaultBlobRef.current);
    } else {
      fetchDefaultAvatarBlobUrl(gender).then((blobUrl) => {
        if (blobUrl) {
          defaultBlobRef.current = blobUrl;
          setSrc(blobUrl);
        }
      });
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
    />
  );
}

export default ChildAvatar;
