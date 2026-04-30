import Skeleton from '@shared/components/Skeleton';
import styles from './VisitCardSkeleton.module.css';

/** Skeleton matching a single VisitCard timeline row — type icon + meta + title + date. */
function VisitCardSkeleton() {
  return (
    <div className={styles.row}>
      <Skeleton variant="circle" className={styles.icon} />
      <div className={styles.body}>
        <Skeleton variant="text" className={styles.title} />
        <Skeleton variant="text" className={styles.meta} />
      </div>
      <Skeleton variant="text" className={styles.date} />
    </div>
  );
}

export default VisitCardSkeleton;
