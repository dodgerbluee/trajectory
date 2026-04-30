import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  /** "circle" → 50%; "text" → tight pill height; "rect" (default) → rectangle. */
  variant?: 'rect' | 'circle' | 'text';
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/**
 * Generic shimmer placeholder used to compose feature-specific loading states
 * (ChildCardSkeleton, VisitCardSkeleton, etc). Replaces spinners — telegraphs
 * "your content is materializing here" instead of "this page is broken until
 * I tell you otherwise."
 *
 * Respects prefers-reduced-motion: animation is disabled (still visible as a
 * static muted block) so the effect doesn't pulse for motion-sensitive users.
 */
function Skeleton({
  width,
  height,
  borderRadius,
  variant = 'rect',
  className,
  style,
  ariaLabel,
}: SkeletonProps) {
  const finalStyle: CSSProperties = {
    width,
    height: variant === 'text' ? height ?? '1em' : height,
    borderRadius:
      borderRadius ?? (variant === 'circle' ? '50%' : variant === 'text' ? '0.4em' : undefined),
    ...style,
  };

  return (
    <span
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={finalStyle}
      aria-busy="true"
      aria-label={ariaLabel}
      role={ariaLabel ? 'status' : undefined}
    />
  );
}

export default Skeleton;
