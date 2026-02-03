import { useMemo } from 'react';
import type { Child, Family, Visit } from '@shared/types/api';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import tl from '@shared/components/TimelineList.module.css';
import FamilySection from './FamilySection';
import UpcomingVisitsSection from './UpcomingVisitsSection';
import styles from './FamilyTabView.module.css';

interface FamilyTabViewProps {
  children: Child[];
  families: Family[];
  upcomingVisits: Visit[];
  loading: boolean;
  error: string | null;
  loadingUpcoming: boolean;
  onRetry: () => void;
}

export default function FamilyTabView({
  children,
  families,
  upcomingVisits,
  loading,
  error,
  loadingUpcoming,
  onRetry,
}: FamilyTabViewProps) {
  const childrenByFamilyId = useMemo(() => {
    const map: Record<number, Child[]> = {};
    for (const f of families) map[f.id] = [];
    for (const c of children) {
      const fid = c.family_id ?? families[0]?.id;
      if (fid != null && map[fid]) map[fid].push(c);
    }
    for (const id of Object.keys(map)) {
      map[Number(id)].sort(
        (a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime()
      );
    }
    return map;
  }, [families, children]);

  const upcomingByChild = useMemo(() => {
    const byChildId = new Map<number, Visit[]>();
    for (const v of upcomingVisits) {
      const list = byChildId.get(v.child_id) ?? [];
      list.push(v);
      byChildId.set(v.child_id, list);
    }
    for (const list of byChildId.values()) {
      list.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
    }
    const childIds = Array.from(byChildId.keys());
    const withChildren = childIds
      .map((id) => ({ child: children.find((c) => c.id === id), visits: byChildId.get(id)! }))
      .filter((x) => x.child != null) as { child: Child; visits: Visit[] }[];
    withChildren.sort((a, b) => (a.child.name || '').localeCompare(b.child.name || ''));
    return withChildren;
  }, [upcomingVisits, children]);

  return (
    <div className={styles.familyTab}>
      {loading && <LoadingSpinner message="Loading family..." />}
      {error && <ErrorMessage message={error} onRetry={onRetry} />}
      {!loading && !error && (
        <div className={styles.tabsContent}>
          {!loadingUpcoming && upcomingVisits.length > 0 && (
            <UpcomingVisitsSection upcomingByChild={upcomingByChild} />
          )}

          {[...families]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map((family) => (
              <FamilySection
                key={family.id}
                family={family}
                children={childrenByFamilyId[family.id] ?? []}
              />
            ))}

          {families.length === 0 && (
            <div className={styles.tabsContentBox}>
              <Card>
                <p className={tl.empty}>No families yet. Join a family via an invite link or create an account.</p>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
