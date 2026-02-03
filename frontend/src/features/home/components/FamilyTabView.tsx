import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { DentalToothIcon } from '@hugeicons/core-free-icons';
import { LuHeart, LuPill, LuEye, LuActivity } from 'react-icons/lu';
import { MdOutlinePersonalInjury } from 'react-icons/md';
import type { Child, Family, Visit } from '../../../shared/types/api';
import { calculateAge, formatAge, formatDate, isFutureDate } from '../../../shared/lib/date-utils';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorMessage from '../../../shared/components/ErrorMessage';
import Card from '../../../shared/components/Card';
import { ChildAvatar } from '../../children';
import tl from '../../../shared/components/TimelineList.module.css';
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

  const visitTypeLabel = (t: Visit['visit_type']) => {
    switch (t) {
      case 'wellness': return 'Wellness';
      case 'sick': return 'Sick';
      case 'injury': return 'Injury';
      case 'vision': return 'Vision';
      case 'dental': return 'Dental';
      default: return 'Visit';
    }
  };

  const VisitTypeIcon = ({ visitType }: { visitType: Visit['visit_type'] }) => {
    if (visitType === 'wellness') return <LuHeart className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'sick') return <LuPill className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'injury') return <MdOutlinePersonalInjury className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'vision') return <LuEye className={styles.upcomingIcon} aria-hidden />;
    if (visitType === 'dental') return <HugeiconsIcon icon={DentalToothIcon} className={styles.upcomingIcon} size={16} color="currentColor" aria-hidden />;
    return <LuActivity className={styles.upcomingIcon} aria-hidden />;
  };

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
            <div className={styles.tabsContentBox}>
              <section className={styles.upcomingSection} aria-labelledby="home-upcoming-heading">
                <h2 id="home-upcoming-heading" className={styles.upcomingTitle}>Upcoming Visits</h2>
                <div className={styles.upcomingByChild}>
                  {upcomingByChild.map(({ child, visits }) => (
                    <div key={child.id} className={styles.upcomingChildRow}>
                      <span className={styles.upcomingChildLabel}>{child.name}</span>
                      <div className={styles.upcomingChips} role="list">
                        {visits.map((v) => {
                          const isOverdue = !isFutureDate(v.visit_date);
                          return (
                            <Link
                              key={v.id}
                              to={`/visits/${v.id}`}
                              className={isOverdue ? `${styles.upcomingChip} ${styles.upcomingChipOverdue}` : styles.upcomingChip}
                              role="listitem"
                              title={isOverdue ? 'Past due – add visit outcome' : undefined}
                            >
                              <VisitTypeIcon visitType={v.visit_type} />
                              <span className={styles.upcomingChipText}>
                                {visitTypeLabel(v.visit_type)} · {formatDate(v.visit_date)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {[...families]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map((family) => {
              const kids = childrenByFamilyId[family.id] ?? [];
              const canEditFamily = family.role === 'owner' || family.role === 'parent';
              return (
                <div key={family.id} className={styles.tabsContentBox}>
                  <section className={styles.familySection} aria-labelledby={`home-family-heading-${family.id}`}>
                    <h2 id={`home-family-heading-${family.id}`} className={styles.familyTabTitle}>
                      {family.name}
                    </h2>
                    {kids.length === 0 && !canEditFamily ? (
                      <p className={tl.empty}>No children in this family.</p>
                    ) : kids.length === 0 ? (
                      <Card>
                        <p className={tl.empty}>No children yet.</p>
                      </Card>
                    ) : (
                      <div className={styles.grid}>
                        {kids.map((child) => {
                          const age = calculateAge(child.date_of_birth);
                          const ageText = formatAge(age.years, age.months);
                          const birthdateText = formatDate(child.date_of_birth);
                          return (
                            <Link key={child.id} to={`/children/${child.id}`} className={styles.cardLink} data-onboarding="child-card">
                              <Card className={styles.compact}>
                                <div className={styles.avatar}>
                                  <ChildAvatar
                                    avatar={child.avatar}
                                    gender={child.gender}
                                    alt={`${child.name}'s avatar`}
                                    className={styles.avatarLarge}
                                  />
                                </div>
                                <div className={styles.content}>
                                  <div className={styles.header}>
                                    <h2 className={styles.name}>{child.name}</h2>
                                  </div>
                                  <div className={styles.details}>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailIcon} aria-hidden>🎂</span>
                                      <span className={styles.detailText}>{ageText}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <span className={styles.detailIcon} aria-hidden>📅</span>
                                      <span className={styles.detailText}>{birthdateText}</span>
                                    </div>
                                  </div>
                                  <span className={styles.arrow} aria-hidden>→</span>
                                </div>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              );
            })}

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
