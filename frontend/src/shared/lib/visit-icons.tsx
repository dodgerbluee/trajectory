import { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuHeart, LuPill, LuEye, LuActivity } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import type { VisitType } from '@shared/types/api';
import { VISIT_TYPE_LABELS } from './visit-labels';
import styles from '@shared/styles/VisitIcons.module.css';

/** Visit type → icon mapping. Used everywhere. */
export const VISIT_TYPE_ICON_MAP: Record<VisitType, ReactNode> = {
  wellness: <LuHeart className={styles.iconWellness} aria-hidden />,
  sick: <LuPill className={styles.iconSick} aria-hidden />,
  injury: <MdOutlinePersonalInjury className={styles.iconInjury} aria-hidden />,
  vision: <LuEye className={styles.iconVision} aria-hidden />,
  dental: <HugeiconsIcon icon={DentalToothIcon} size={16} color="currentColor" aria-hidden />,
};

/** Get icon for visit type (fallback to generic activity). */
export function getVisitTypeIcon(visitType: VisitType): ReactNode {
  return VISIT_TYPE_ICON_MAP[visitType] || <LuActivity aria-hidden />;
}

/** Get label for visit type. Re-exported for convenience. */
export function getVisitTypeLabel(visitType: VisitType): string {
  return VISIT_TYPE_LABELS[visitType] || 'Visit';
}
