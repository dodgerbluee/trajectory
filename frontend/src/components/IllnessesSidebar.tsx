import { Link } from 'react-router-dom';
import VisitStats from './VisitStats';
import ChildSelector from './ChildSelector';
import Button from './Button';
import type { Child } from '../types/api';

interface Stat {
  label: string;
  value: number;
  icon?: any;
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
  return (
    <aside className="visits-sidebar">
      <div className="visits-sidebar-inner">
        <header>
          <div className="sidebar-brand">Filters</div>
        </header>

        <div className="sidebar-divider" />

        <nav className="sidebar-stats">
          <VisitStats stats={stats as any} vertical />
        </nav>

        {!hideChildFilter && (
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Child Filter</h4>
            <ChildSelector childrenList={childrenList} selectedChildId={selectedChildId} onSelect={onSelectChild} />

            <div className="sidebar-action" style={{ marginTop: 12 }}>
              <Link to="/illnesses/new" className="sidebar-action-link">
                <Button className="sidebar-add-btn" size="lg">Add Illness</Button>
              </Link>
            </div>
          </div>
        )}

        {hideChildFilter && (
          <div className="sidebar-action" style={{ marginTop: 12 }}>
            <Link
              to={addIllnessChildId != null ? `/illnesses/new?child_id=${addIllnessChildId}` : '/illnesses/new'}
              state={addIllnessChildId != null ? { fromChild: true, childId: addIllnessChildId, fromTab: 'illnesses' } : undefined}
              className="sidebar-action-link"
            >
              <Button className="sidebar-add-btn" size="lg">Add Illness</Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
