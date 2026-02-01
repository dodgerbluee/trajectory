/**
 * Visit form sidebar: add buttons for addable sections (Measurements, Illness,
 * Injury, Vision, Vaccines, Prescriptions). Buttons hidden for sections already
 * in the form. Uses same structure/classes as kids/visits sidebar; buttons
 * match "Add BMI" style.
 */

import { getAddableSectionIds, getSectionById } from './sectionRegistry';

export interface VisitFormSidebarProps {
  /** Currently active section IDs; buttons hidden for sections already added. */
  activeSections: string[];
  /** Add a section by id (appends to active sections). */
  onAddSection: (sectionId: string) => void;
  /** When true (Add Future Visit), no outcome sections can be added. */
  isFutureVisit?: boolean;
  /** When true (editing a future visit in limited mode), show "Use full visit form" button. */
  showUseFullFormButton?: boolean;
  /** Called when user clicks "Use full visit form". */
  onUseFullForm?: () => void;
}

const ADDABLE_LABELS: Record<string, string> = {
  measurements: 'Measurements',
  illness: 'Illness',
  injury: 'Injury',
  vision: 'Vision',
  vaccines: 'Vaccines',
  prescriptions: 'Prescriptions',
};

const ADDABLE_ICONS: Record<string, string> = {
  measurements: '📊',
  illness: '🤒',
  injury: '🩹',
  vision: '👁️',
  vaccines: '💉',
  prescriptions: '💊',
};

export function VisitFormSidebar({ activeSections, onAddSection, isFutureVisit, showUseFullFormButton, onUseFullForm }: VisitFormSidebarProps) {
  const addableIds = isFutureVisit ? [] : getAddableSectionIds();
  const activeSet = new Set(activeSections);

  const buttons = addableIds
    .filter((id) => !activeSet.has(id))
    .map((id) => {
      const entry = getSectionById(id);
      const label = entry?.label ?? ADDABLE_LABELS[id] ?? id;
      const icon = ADDABLE_ICONS[id] ?? '+';
      return (
        <button
          key={id}
          type="button"
          className="measurement-card-add"
          onClick={() => onAddSection(id)}
          title={`Add ${label} to this visit`}
        >
          <span className="measurement-card-icon" aria-hidden>
            {icon}
          </span>
          <span className="measurement-card-add-label">Add {label}</span>
        </button>
      );
    });

  return (
    <aside className="visits-sidebar" aria-label="Add to visit">
      <div className="visits-sidebar-inner">
        <header>
          <div className="sidebar-brand">Add to visit</div>
        </header>
        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Add section</h4>
          <div className="sidebar-action" style={{ marginTop: 12 }}>
            {showUseFullFormButton && onUseFullForm ? (
              <button
                type="button"
                className="measurement-card-add visit-form-use-full"
                onClick={onUseFullForm}
                title="Show all visit fields and save as a full visit"
              >
                <span className="measurement-card-icon" aria-hidden>📋</span>
                <span className="measurement-card-add-label">Use full visit form</span>
              </button>
            ) : buttons.length === 0 ? (
              <p className="visit-form-sidebar-empty">No more sections to add.</p>
            ) : buttons.length === 1 ? (
              buttons[0]
            ) : (
              <div className="sidebar-action-stack">{buttons}</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
