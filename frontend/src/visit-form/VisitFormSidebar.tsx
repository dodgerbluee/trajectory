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

export function VisitFormSidebar({ activeSections, onAddSection }: VisitFormSidebarProps) {
  const addableIds = getAddableSectionIds();
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
            {buttons.length === 0 ? (
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
