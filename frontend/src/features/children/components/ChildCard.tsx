import { Link } from 'react-router-dom';
import Card from '../../../shared/components/Card';
import { calculateAge, formatAge, formatDate } from '../../../shared/lib/date-utils';
import type { Child } from '../../../shared/types/api';
import ChildAvatar from './ChildAvatar';
import styles from './ChildCard.module.css';

interface ChildCardProps {
  child: Child;
}

export default function ChildCard({ child }: ChildCardProps) {
  const age = calculateAge(child.date_of_birth);
  const ageText = formatAge(age.years, age.months);
  const birthdateText = formatDate(child.date_of_birth);

  return (
    <Link to={`/children/${child.id}`} className={styles.cardLink} data-onboarding="child-card">
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
}
