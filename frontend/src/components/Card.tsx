import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  icon?: string;
  className?: string;
}

function Card({ children, title, icon, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <h2 className="card-title">
          {icon && <span className="card-title-icon">{icon}</span>}
          <span>{title}</span>
        </h2>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
}

export default Card;
