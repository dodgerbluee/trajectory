import { useLocation, useNavigate } from 'react-router-dom';
import { HiPlus } from 'react-icons/hi';
import VisitStats from '../../../shared/components/VisitStats';
import ChildSelector from '../../../shared/components/ChildSelector';
import Button from '../../../shared/components/Button';
import { useFamilyPermissions } from '../../../contexts/FamilyPermissionsContext';
import type { Child } from '../../../shared/types/api';
import layout from '../../../shared/styles/VisitsLayout.module.css';

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
    /** When set, Add Visit opens this modal on the current page instead of navigating away. */
    onAddVisitClick?: () => void;
}

export default function VisitFilterSidebar({ stats, childrenList, selectedChildId, onSelectChild, hideChildFilter = false, onAddVisitClick }: Props) {
    const location = useLocation();
    const { canEdit } = useFamilyPermissions();
    const isHome = location.pathname === '/';
    const fromPath = isHome ? '/' : `${location.pathname}${location.search}`;
    const fromTab = isHome ? 'visits' : undefined;
    return (
        <aside className={layout.sidebar}>
            <div className={layout.sidebarInner}>
                <header>
                    <div className={layout.sidebarBrand}>Filters</div>
                </header>

                <div className={layout.sidebarDivider} />

                <nav className={layout.sidebarStats}>
                    <VisitStats stats={stats as any} vertical />
                </nav>

                {!hideChildFilter && (
                    <div className={layout.childSidebarSection}>
                        <h4 className={layout.sidebarSectionTitle}>Child Filter</h4>
                        <ChildSelector childrenList={childrenList} selectedChildId={selectedChildId} onSelect={onSelectChild} />

                        {canEdit && (
                        <div className={layout.sidebarAction} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <AddVisitButton
                                fromPath={fromPath}
                                fromTab={fromTab}
                                currentPath={location.pathname + (location.search || '')}
                                onAddVisitClick={onAddVisitClick}
                            />
                        </div>
                        )}
                    </div>
                )}

                {hideChildFilter && canEdit && (
                    <div className={layout.sidebarAction} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <AddVisitButton
                            fromPath={fromPath}
                            fromTab={fromTab}
                            currentPath={location.pathname + (location.search || '')}
                            onAddVisitClick={onAddVisitClick}
                        />
                    </div>
                )}
            </div>
        </aside>
    );
}

                function AddVisitButton({ fromPath, fromTab, currentPath, onAddVisitClick }: { fromPath: string; fromTab?: string; currentPath: string; onAddVisitClick?: () => void }) {
                    const navigate = useNavigate();
                    const handle = () => {
                        if (onAddVisitClick) {
                            onAddVisitClick();
                            return;
                        }
                        const state = fromTab ? { openAddVisit: true, from: fromPath, fromTab } : { from: fromPath };
                        if (currentPath === '/') {
                            navigate(currentPath, { state });
                        } else {
                            navigate('/visits/new', { state: { from: fromPath, fromTab } });
                        }
                    };

                    return (
                        <Button type="button" onClick={handle} className={layout.sidebarAddVisitBtn} size="lg" variant="secondary">
                            <HiPlus className={layout.sidebarAddVisitBtnIcon} aria-hidden />
                            <span>Add Visit</span>
                        </Button>
                    );
                }

