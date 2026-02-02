import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  message?: string;
}

function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className={styles.root}>
      <div className={styles.spinner} aria-hidden />
      <p className={styles.message}>{message}</p>
    </div>
  );
}

export default LoadingSpinner;
