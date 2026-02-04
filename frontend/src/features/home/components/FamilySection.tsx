import { Link } from 'react-router-dom';
import type { Child, Family } from '@shared/types/api';
import { calculateAge, formatAge, formatDate } from '@lib/date-utils';
import Card from '@shared/components/Card';
import { ChildAvatar } from '@features/children';
import tl from '@shared/components/TimelineList.module.css';
import styles from './FamilySection.module.css';

interface FamilySectionProps {
  family: Family;
  children: Child[];
}

export default function FamilySection({ family, children }: FamilySectionProps) {
  const canEditFamily = family.role === 'owner' || family.role === 'parent';

  return (
    <div className={styles.tabsContentBox}>
      <section className={styles.familySection} aria-labelledby={`home-family-heading-${family.id}`}>
        <h2 id={`home-family-heading-${family.id}`} className={styles.familyTabTitle}>
          {family.name}
        </h2>
        {children.length === 0 && !canEditFamily ? (
          <p className={tl.empty}>No children in this family.</p>
        ) : children.length === 0 ? (
          <Card>
            <p className={tl.empty}>No children yet.</p>
          </Card>
        ) : (
          <div className={styles.grid}>
            {children.map((child) => {
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
}
