import { useNavigate } from 'react-router-dom';
import { HiPlus } from 'react-icons/hi';
import type { IconType } from 'react-icons';
import { VisitStats } from '@features/visits';
import { PersonSelector } from '@features/people';
import Button from '@shared/components/Button';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
import type { Person } from '@shared/types/api';
import layout from '@shared/styles/VisitsLayout.module.css';

interface Stat {
  label: string;
  value: number;
  icon?: IconType;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}

interface Props {
  stats: Stat[];
  peopleList: Person[];
  selectedPersonId?: number | undefined;
  onSelectPerson: (id?: number) => void;
  hidePersonFilter?: boolean;
  /** When set (e.g. on person detail page), Add Illness link includes person_id and return state so Cancel goes back here. */
  addIllnessPersonId?: number | undefined;
}

export default function IllnessesSidebar({ stats, peopleList, selectedPersonId, onSelectPerson, hidePersonFilter = false, addIllnessPersonId }: Props) {
  const navigate = useNavigate();
  const { canEdit } = useFamilyPermissions();

  const handleAddIllness = () => {
    const path = addIllnessPersonId != null ? `/illnesses/new?person_id=${addIllnessPersonId}` : '/illnesses/new';
    const state = addIllnessPersonId != null ? { fromPerson: true, personId: addIllnessPersonId, fromTab: 'illnesses' } : undefined;
    navigate(path, { state });
  };

  return (
    <aside className={layout.sidebar}>
      <div className={layout.sidebarInner}>
        <header>
          <div className={layout.sidebarBrand}>Filters</div>
        </header>

        <div className={layout.sidebarDivider} />

        <nav className={layout.sidebarStats}>
          <VisitStats stats={stats} vertical />
        </nav>

        {!hidePersonFilter && (
          <div className={layout.childSidebarSection}>
            <h4 className={layout.sidebarSectionTitle}>Person Filter</h4>
            <PersonSelector peopleList={peopleList} selectedPersonId={selectedPersonId} onSelect={onSelectPerson} />

            {canEdit && (
            <div className={layout.sidebarAction} style={{ marginTop: 12 }}>
              <Button type="button" onClick={handleAddIllness} className={layout.sidebarAddVisitBtn} size="lg" variant="secondary">
                <HiPlus className={layout.sidebarAddVisitBtnIcon} aria-hidden />
                <span>Add Illness</span>
              </Button>
            </div>
            )}
          </div>
        )}

        {hidePersonFilter && canEdit && (
          <div className={layout.sidebarAction} style={{ marginTop: 12 }}>
            <Button type="button" onClick={handleAddIllness} className={layout.sidebarAddVisitBtn} size="lg" variant="secondary">
              <HiPlus className={layout.sidebarAddVisitBtnIcon} aria-hidden />
              <span>Add Illness</span>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
