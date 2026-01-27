import { ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  className?: string;
}

function Card({ children, title, icon, className = '', ...rest }: CardProps) {
  return (
    <div {...rest} className={`card ${className}`}>
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
