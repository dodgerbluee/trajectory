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
    hideChildFilter?: boolean;
}

export default function VisitsSidebar({ stats, childrenList, selectedChildId, onSelectChild, hideChildFilter = false }: Props) {
    const location = useLocation();
    const isHome = location.pathname === '/';
    const fromPath = isHome ? '/' : `${location.pathname}${location.search}`;
    const fromTab = isHome ? 'visits' : undefined;
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
                            <AddVisitButton
                                fromPath={fromPath}
                                fromTab={fromTab}
                                currentPath={location.pathname + (location.search || '')}
                            />
                        </div>
                    </div>
                )}

                {hideChildFilter && (
                    <div className="sidebar-action" style={{ marginTop: 12 }}>
                        <AddVisitButton
                            fromPath={fromPath}
                            fromTab={fromTab}
                            currentPath={location.pathname + (location.search || '')}
                        />
                    </div>
                )}
            </div>
        </aside>
    );
}

                function AddVisitButton({ fromPath, fromTab, currentPath }: { fromPath: string; fromTab?: string; currentPath: string }) {
                    const navigate = useNavigate();
                    const handle = () => {
                        const state = fromTab ? { openAddVisit: true, from: fromPath, fromTab } : { from: fromPath };
                        if (currentPath === '/') {
                            navigate(currentPath, { state });
                        } else {
                            navigate('/visits/new', { state: { from: fromPath, fromTab } });
                        }
                    };

                    return (
                        <Button type="button" onClick={handle} className="sidebar-add-btn" size="lg">
                            Add Visit
                        </Button>
                    );
                }
