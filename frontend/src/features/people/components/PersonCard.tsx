import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import { calculateAge, formatAge, formatDate } from '@lib/date-utils';
import type { Person } from '@shared/types/api';
import { PersonAvatar } from '.';
import styles from './PersonCard.module.css';

interface PersonCardProps {
  person: Person;
}

export default function PersonCard({ person }: PersonCardProps) {
  const age = calculateAge(person.date_of_birth);
  const ageText = formatAge(age.years, age.months);
  const birthdateText = formatDate(person.date_of_birth);

  return (
    <Link to={`/people/${person.id}`} className={styles.cardLink} data-onboarding="child-card">
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
}
