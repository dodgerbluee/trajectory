import { useLocation, useNavigate } from 'react-router-dom';
import { HiPlus } from 'react-icons/hi';
import type { IconType } from 'react-icons';
import { VisitStats } from '@features/visits';
import { PersonSelector } from '@features/people';
import Button from '@shared/components/Button';
import { useFamilyPermissions } from '../../../contexts/FamilyPermissionsContext';
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
    /** When set, Add Visit opens this modal on the current page instead of navigating away. */
    onAddVisitClick?: () => void;
}

export default function VisitFilterSidebar({ stats, peopleList, selectedPersonId, onSelectPerson, hidePersonFilter = false, onAddVisitClick }: Props) {
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
                    <VisitStats stats={stats} vertical />
                </nav>

                {!hidePersonFilter && (
                    <div className={layout.childSidebarSection}>
                        <h4 className={layout.sidebarSectionTitle}>Person Filter</h4>
                        <PersonSelector peopleList={peopleList} selectedPersonId={selectedPersonId} onSelect={onSelectPerson} />

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

                {hidePersonFilter && canEdit && (
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

