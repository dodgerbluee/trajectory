import Card from '@shared/components/Card';
import Skeleton from '@shared/components/Skeleton';
import styles from './ChildCard.module.css';
import skeletonStyles from './ChildCardSkeleton.module.css';

/** Skeleton matching ChildCard's compact layout — avatar + name + two detail rows. */
function ChildCardSkeleton() {
  return (
    <Card className={styles.compact}>
      <div className={styles.avatar}>
        <Skeleton variant="circle" className={skeletonStyles.avatar} />
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <Skeleton variant="text" className={skeletonStyles.name} />
        </div>
        <div className={styles.details}>
          <Skeleton variant="text" className={skeletonStyles.detail} />
          <Skeleton variant="text" className={skeletonStyles.detail} />
        </div>
      </div>
    </Card>
  );
}

export default ChildCardSkeleton;
