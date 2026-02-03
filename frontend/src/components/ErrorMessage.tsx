import styles from './ErrorMessage.module.css';
import Button from './Button';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className={styles.root}>
      <div className={styles.icon}>⚠️</div>
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Retry
        </Button>
      )}
    </div>
  );
}

export default ErrorMessage;
