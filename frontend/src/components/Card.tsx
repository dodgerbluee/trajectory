import { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  className?: string;
}

function Card({ children, title, icon, className = '', ...rest }: CardProps) {
  return (
    <div {...rest} className={[styles.root, className].filter(Boolean).join(' ')} data-card-root>
      {title && (
        <h2 className={styles.title} data-card-title>
          {icon && <span className={styles.titleIcon}>{icon}</span>}
          <span>{title}</span>
        </h2>
      )}
      <div className={styles.content} data-card-content>
        {children}
      </div>
    </div>
  );
}

export default Card;
