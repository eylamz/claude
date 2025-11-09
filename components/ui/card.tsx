import { HTMLAttributes, FC, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card: FC<CardProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`bg-card dark:bg-card-dark rounded-lg shadow-sm border border-card-border dark:border-card-border-dark ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: FC<CardHeaderProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 border-b border-card-border dark:border-card-border-dark ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: FC<CardTitleProps> = ({ className = '', children, ...props }) => {
  return (
    <h3 className={`text-lg font-semibold text-text dark:text-text-dark ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardContent: FC<CardContentProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};


