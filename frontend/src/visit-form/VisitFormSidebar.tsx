/**
 * Visit form sidebar: add buttons for addable sections (Measurements, Illness,
 * Injury, Vision, Vaccines, Prescriptions). Buttons hidden for sections already
 * in the form. Uses same structure/classes as kids/visits sidebar; buttons
 * match "Add BMI" style.
 */

import { getAddableSectionIds, getSectionById } from './sectionRegistry';
import layout from '../styles/VisitsLayout.module.css';
import sidebarStyles from './VisitFormSidebar.module.css';
import mui from '../styles/MeasurementsUI.module.css';

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
  /** Optional form layout overrides (from VisitFormLayout.module.css) when used inside Add/Edit visit page. */
  formLayoutStyles?: {
    formSidebar?: string;
    formSidebarInner?: string;
    formSidebarDivider?: string;
    formSidebarSection?: string;
    formSidebarSectionTitle?: string;
    formSidebarAction?: string;
    formSidebarActionStack?: string;
    sidebarEmpty?: string;
  };
}

const ADDABLE_LABELS: Record<string, string> = {
  measurements: 'Measurements',
  illness: 'Illness',
  injury: 'Injury',
  vision: 'Vision',
  dental: 'Dental',
  vaccines: 'Vaccines',
  prescriptions: 'Prescriptions',
};

const ADDABLE_ICONS: Record<string, string> = {
  measurements: '📊',
  illness: '🤒',
  injury: '🩹',
  vision: '👁️',
  dental: '🦷',
  vaccines: '💉',
  prescriptions: '💊',
};

export function VisitFormSidebar({ activeSections, onAddSection, isFutureVisit, showUseFullFormButton, onUseFullForm, formLayoutStyles }: VisitFormSidebarProps) {
  const addableIds = isFutureVisit ? [] : getAddableSectionIds();
  const activeSet = new Set(activeSections);
  const f = formLayoutStyles;

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
          className={mui.cardAdd}
          data-measurement-add
          onClick={() => onAddSection(id)}
          title={`Add ${label} to this visit`}
        >
          <span className={mui.cardIcon} aria-hidden>
            {icon}
          </span>
          <span className={mui.cardAddLabel}>Add {label}</span>
        </button>
      );
    });

  return (
    <aside className={`${layout.sidebar} ${f?.formSidebar ?? ''}`.trim()} aria-label="Add to visit">
      <div className={`${layout.sidebarInner} ${f?.formSidebarInner ?? ''}`.trim()}>
        <header>
          <div className={layout.sidebarBrand}>Add to visit</div>
        </header>
        <div className={`${layout.sidebarDivider} ${f?.formSidebarDivider ?? ''}`.trim()} />
        <div className={`${f?.formSidebarSection ?? ''}`.trim()}>
          <h4 className={`${layout.sidebarSectionTitle} ${f?.formSidebarSectionTitle ?? ''}`.trim()}>Add section</h4>
          <div className={`${layout.sidebarAction} ${f?.formSidebarAction ?? ''}`.trim()} style={{ marginTop: 12 }}>
            {showUseFullFormButton && onUseFullForm ? (
              <button
                type="button"
                className={`${mui.cardAdd} ${sidebarStyles.useFullFormButton}`}
                data-measurement-add
                onClick={onUseFullForm}
                title="Show all visit fields and save as a full visit"
              >
                <span className={mui.cardIcon} aria-hidden>📋</span>
                <span className={mui.cardAddLabel}>Use full visit form</span>
              </button>
            ) : buttons.length === 0 ? (
              <p className={f?.sidebarEmpty ?? layout.sidebarEmpty}>No more sections to add.</p>
            ) : buttons.length === 1 ? (
              buttons[0]
            ) : (
              <div className={`${layout.sidebarActionStack} ${f?.formSidebarActionStack ?? ''}`.trim()}>{buttons}</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
