import { useNavigate } from 'react-router-dom';
import { HiPlus } from 'react-icons/hi';
import type { IconType } from 'react-icons';
import { VisitStats } from '@features/visits';
import { ChildSelector } from '@features/children';
import Button from '@shared/components/Button';
import { useFamilyPermissions } from '@/contexts/FamilyPermissionsContext';
import type { Child } from '@shared/types/api';
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
  childrenList: Child[];
  selectedChildId?: number | undefined;
  onSelectChild: (id?: number) => void;
  hideChildFilter?: boolean;
  /** When set (e.g. on child detail page), Add Illness link includes child_id and return state so Cancel goes back here. */
  addIllnessChildId?: number | undefined;
}

export default function IllnessesSidebar({ stats, childrenList, selectedChildId, onSelectChild, hideChildFilter = false, addIllnessChildId }: Props) {
  const navigate = useNavigate();
  const { canEdit } = useFamilyPermissions();

  const handleAddIllness = () => {
    const path = addIllnessChildId != null ? `/illnesses/new?child_id=${addIllnessChildId}` : '/illnesses/new';
    const state = addIllnessChildId != null ? { fromChild: true, childId: addIllnessChildId, fromTab: 'illnesses' } : undefined;
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

        {!hideChildFilter && (
          <div className={layout.childSidebarSection}>
            <h4 className={layout.sidebarSectionTitle}>Child Filter</h4>
            <ChildSelector childrenList={childrenList} selectedChildId={selectedChildId} onSelect={onSelectChild} />

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

        {hideChildFilter && canEdit && (
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
