import { useMemo } from 'react';
import type { Person, Family, Visit } from '@shared/types/api';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import ErrorMessage from '@shared/components/ErrorMessage';
import Card from '@shared/components/Card';
import tl from '@shared/components/TimelineList.module.css';
import FamilySection from './FamilySection';
import UpcomingVisitsSection from './UpcomingVisitsSection';
import styles from './FamilyTabView.module.css';

interface FamilyTabViewProps {
  people: Person[];
  families: Family[];
  upcomingVisits: Visit[];
  loading: boolean;
  error: string | null;
  loadingUpcoming: boolean;
  onRetry: () => void;
}

export default function FamilyTabView({
  people,
  families,
  upcomingVisits,
  loading,
  error,
  loadingUpcoming,
  onRetry,
}: FamilyTabViewProps) {
  const peopleByFamilyId = useMemo(() => {
    const map: Record<number, Person[]> = {};
    for (const f of families) map[f.id] = [];
    for (const c of people) {
      const fid = c.family_id ?? families[0]?.id;
      if (fid != null && map[fid]) map[fid].push(c);
    }
    for (const id of Object.keys(map)) {
      map[Number(id)].sort(
        (a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime()
      );
    }
    return map;
  }, [families, people]);

  const upcomingByPerson = useMemo(() => {
    const byPersonId = new Map<number, Visit[]>();
    for (const v of upcomingVisits) {
      const list = byPersonId.get(v.person_id) ?? [];
      list.push(v);
      byPersonId.set(v.person_id, list);
    }
    for (const list of byPersonId.values()) {
      list.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
    }
    const personIds = Array.from(byPersonId.keys());
    const withPeople = personIds
      .map((id) => ({ person: people.find((c) => c.id === id), visits: byPersonId.get(id)! }))
      .filter((x) => x.person != null) as { person: Person; visits: Visit[] }[];
    withPeople.sort((a, b) => (a.person.name || '').localeCompare(b.person.name || ''));
    return withPeople;
  }, [upcomingVisits, people]);

  return (
    <div className={styles.familyTab}>
      {loading && <LoadingSpinner message="Loading family..." />}
      {error && <ErrorMessage message={error} onRetry={onRetry} />}
      {!loading && !error && (
        <div className={styles.tabsContent}>
          {!loadingUpcoming && upcomingVisits.length > 0 && (
            <UpcomingVisitsSection upcomingByPerson={upcomingByPerson} />
          )}

          {[...families]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map((family) => (
              <FamilySection
                key={family.id}
                family={family}
                people={peopleByFamilyId[family.id] ?? []}
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
