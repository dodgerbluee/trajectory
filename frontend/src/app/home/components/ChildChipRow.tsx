/**
 * ChildChipRow – horizontally scrollable row of child avatars (story-rail style).
 *
 * Used at the top of the mobile home feed to scope the rest of the feed to a
 * single child. When `selectedId` is null the feed shows everyone; selecting a
 * child highlights their avatar with a colored ring. The "Show all" affordance
 * to clear the filter lives in the greeting row above the rail (rendered by
 * MobileHomeFeed) so it sits visually next to the page title rather than
 * fighting the avatar rail for horizontal space.
 */

import type { Child } from '@shared/types/api';
import { ChildAvatar } from '@features/children';
import styles from './ChildChipRow.module.css';

interface ChildChipRowProps {
  childrenList: Child[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function ChildChipRow({ childrenList, selectedId, onSelect }: ChildChipRowProps) {
  if (childrenList.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.row} role="tablist" aria-label="Filter by child">
        {childrenList.map((child) => {
          const isActive = selectedId === child.id;
          const firstName = child.name?.split(' ')[0] || child.name;
          return (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Show only ${firstName}`}
              className={`${styles.cell} ${isActive ? styles.active : ''}`}
              onClick={() => onSelect(isActive ? null : child.id)}
            >
              <span className={styles.avatarRing}>
                <ChildAvatar
                  avatar={child.avatar}
                  gender={child.gender}
                  alt=""
                  className={styles.avatar}
                />
              </span>
              <span className={styles.name}>{firstName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ChildChipRow;
