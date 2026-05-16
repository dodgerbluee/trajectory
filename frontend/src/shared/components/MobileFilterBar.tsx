/**
 * MobileFilterBar – mobile-only filter UI used inside PersonDetailPage tabs
 * (Visits, Illness, Documents). Hidden on desktop via CSS.
 *
 * Renders a single "Filter" button with an active count badge, plus an
 * inline chip showing the currently active filter (clickable to clear).
 * Optionally renders a primary action button (e.g. "Add Visit") on the right.
 *
 * Tapping the filter button opens a MobileSheet with the full list of filter
 * options (chips with counts). Designed to replace the heavy left-rail
 * sidebar on small screens.
 */
import { useState } from 'react';
import { LuFilter, LuX, LuPlus } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { MobileSheet } from './MobileSheet';
import styles from './MobileFilterBar.module.css';

export interface MobileFilterOption {
  /** Stable key for React. */
  key: string;
  /** Display label (e.g. "Wellness"). */
  label: string;
  /** Count to show next to the label. */
  count: number;
  /** Optional icon. */
  icon?: IconType | ((props: { className?: string }) => React.ReactElement);
  /** True when this is the currently selected filter. */
  active: boolean;
  /** Called when the user picks this option. */
  onSelect: () => void;
  /** True for the catch-all "All" / no-filter option. Used to compute active-chip
   *  visibility and the active-count badge. */
  isDefault?: boolean;
}

export interface MobileFilterBarProps {
  /** Sheet title (e.g. "Filter visits"). */
  title: string;
  /** Filter options (rendered as chips inside the sheet). */
  options: MobileFilterOption[];
  /** Optional primary action shown on the right of the bar (e.g. Add Visit). */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: IconType;
  };
  children?: React.ReactNode;
}

export default function MobileFilterBar({ title, options, primaryAction, children }: MobileFilterBarProps) {
  const [open, setOpen] = useState(false);

  const activeOption = options.find((o) => o.active && !o.isDefault);
  const defaultOption = options.find((o) => o.isDefault);
  const activeCount = activeOption ? 1 : 0;

  const PrimaryIcon = primaryAction?.icon ?? LuPlus;

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        {children}
        <button
          type="button"
          className={styles.filterButton}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <LuFilter aria-hidden="true" />
          <span>Filter</span>
          {activeCount > 0 && (
            <span className={styles.filterCount} aria-label={`${activeCount} active`}>
              {activeCount}
            </span>
          )}
        </button>

        {activeOption && (
          <button
            type="button"
            className={styles.activeChip}
            onClick={() => defaultOption?.onSelect()}
            aria-label={`Clear filter: ${activeOption.label}`}
          >
            <span>{activeOption.label}</span>
            <LuX aria-hidden="true" />
          </button>
        )}

        {primaryAction && (
          <button
            type="button"
            className={styles.primaryAction}
            onClick={primaryAction.onClick}
          >
            <PrimaryIcon aria-hidden="true" />
            <span>{primaryAction.label}</span>
          </button>
        )}
      </div>

      <MobileSheet isOpen={open} onClose={() => setOpen(false)} title={title} size="auto">
        <div className={styles.sheetBody}>
          <div className={styles.sheetChips}>
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`${styles.sheetChip} ${opt.active ? styles.sheetChipActive : ''}`}
                  onClick={() => {
                    opt.onSelect();
                    setOpen(false);
                  }}
                  aria-pressed={opt.active}
                >
                  {Icon && (
                    <span className={styles.sheetChipIcon} aria-hidden="true">
                      <Icon />
                    </span>
                  )}
                  <span>{opt.label}</span>
                  <span className={styles.sheetChipCount}>{opt.count}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.sheetActions}>
            <button
              type="button"
              className={styles.sheetClear}
              onClick={() => {
                defaultOption?.onSelect();
                setOpen(false);
              }}
              disabled={activeCount === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.sheetApply}
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </MobileSheet>
    </div>
  );
}
