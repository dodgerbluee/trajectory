import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import type { Person, Family } from '@shared/types/api';
import { calculateAge, formatAge, formatDate } from '@lib/date-utils';
import Card from '@shared/components/Card';
import { PersonAvatar } from '@features/people';
import tl from '@shared/components/TimelineList.module.css';
import { sortPeopleWithAdultsLast } from '../lib/profile-order';
import styles from './FamilySection.module.css';

interface FamilySectionProps {
  family: Family;
  people: Person[];
}

export default function FamilySection({ family, people }: FamilySectionProps) {
  const canEditFamily = family.role === 'owner' || family.role === 'parent';
  // Adults (18+) sort to the end of the family grid so people stay primary.
  const orderedPeople = useMemo(() => sortPeopleWithAdultsLast(people), [people]);

  return (
    <div className={styles.tabsContentBox}>
      <section className={styles.familySection} aria-labelledby={`home-family-heading-${family.id}`}>
        <h2 id={`home-family-heading-${family.id}`} className={styles.familyTabTitle}>
          {family.name}
        </h2>
        {people.length === 0 && !canEditFamily ? (
          <p className={tl.empty}>No people in this family.</p>
        ) : people.length === 0 ? (
          <Card>
            <p className={tl.empty}>No people yet.</p>
          </Card>
        ) : (
          <div className={styles.grid}>
            {orderedPeople.map((person) => {
              const age = calculateAge(person.date_of_birth);
              const ageText = formatAge(age.years, age.months);
              const birthdateText = formatDate(person.date_of_birth);
              return (
                <Link key={person.id} to={`/people/${person.id}`} className={styles.cardLink} data-onboarding="child-card">
                  <Card className={styles.compact}>
                    <div className={styles.avatar}>
                      <PersonAvatar
                        avatar={person.avatar}
                        gender={person.gender}
                        alt={`${person.name}'s avatar`}
                        className={styles.avatarLarge}
                      />
                    </div>
                    <div className={styles.content}>
                      <div className={styles.header}>
                        <h2 className={styles.name}>{person.name}</h2>
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
