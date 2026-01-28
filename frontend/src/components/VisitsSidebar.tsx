import { useLocation, useNavigate } from 'react-router-dom';
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
}

export default function VisitsSidebar({ stats, childrenList, selectedChildId, onSelectChild }: Props) {
    const location = useLocation();
    const fromPath = (location.pathname === '/' ? '/?tab=visits' : `${location.pathname}${location.search}`);
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

                <div className="sidebar-section">
                    <h4 className="sidebar-section-title">Child Filter</h4>
                    <ChildSelector childrenList={childrenList} selectedChildId={selectedChildId} onSelect={onSelectChild} />

                                    <div className="sidebar-action" style={{ marginTop: 12 }}>
                                        {/* Trigger add-visit modal via navigation state when on Home, avoid changing URL */}
                                        <AddVisitButton
                                            fromPath={fromPath}
                                            currentPath={location.pathname + location.search}
                                        />
                                    </div>
                </div>
            </div>
        </aside>
    );
}

                function AddVisitButton({ fromPath, currentPath }: { fromPath: string; currentPath: string }) {
                    const navigate = useNavigate();
                    const handle = () => {
                        if (currentPath === '/' || currentPath.startsWith('/?')) {
                            navigate(currentPath, { state: { openAddVisit: true, from: fromPath } });
                        } else {
                            navigate('/visits/new', { state: { from: fromPath } });
                        }
                    };

                    return (
                        <button type="button" onClick={handle} className="sidebar-action-link">
                            <Button className="sidebar-add-btn" size="lg">Add Visit</Button>
                        </button>
                    );
                }
