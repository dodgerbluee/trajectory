/**
 * Step 4: Section Wrapper
 *
 * Reusable wrapper for every visit form section. Renders a consistent
 * header, optional remove button when the section is removable, and
 * children (section content). All sections must use this wrapper for
 * layout, spacing, and visual consistency.
 */

import type { ReactNode } from 'react';

export interface SectionWrapperProps {
  /** Section id; used for scroll target and data attributes. */
  sectionId: string;
  /** Header label. Omit header when hideTitle is true. */
  label: string;
  /** When true, do not render the section header (e.g. for Notes). */
  hideTitle?: boolean;
  /** Whether to show the remove (✕) button. */
  removable: boolean;
  /** Called when user clicks remove. Only relevant when removable is true. */
  onRemove?: () => void;
  /** Section body content. */
  children: ReactNode;
  /** When true, removes bottom padding/border so spacing under last section matches. */
  isLast?: boolean;
}

export function SectionWrapper({
  sectionId,
  label,
  hideTitle = false,
  removable,
  onRemove,
  children,
  isLast = false,
}: SectionWrapperProps) {
  return (
    <section
      className={`visit-detail-section${isLast ? ' visit-detail-section-last' : ''}`}
      data-section-id={sectionId}
      id={`section-${sectionId}`}
    >
      {!hideTitle && (
      <div className="visit-detail-section-header">
        <h3 className="visit-detail-section-title">{label}</h3>
        {removable && (
          <button
            type="button"
            className="visit-detail-section-remove"
            onClick={onRemove}
            title={`Remove ${label}`}
            aria-label={`Remove ${label}`}
          >
            ✕
          </button>
        )}
      </div>
      )}
      <div className="visit-detail-section-body">{children}</div>
    </section>
  );
}
