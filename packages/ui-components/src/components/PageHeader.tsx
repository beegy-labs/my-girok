import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  backLink?: string;
  backText?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  backLinkComponent?: React.ElementType<{ to: string; className?: string; children: React.ReactNode }>;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  backLink,
  backText = '< Back',
  action,
  size = 'lg',
  className = '',
  backLinkComponent: BackLinkComponent,
}: PageHeaderProps) {
  const sizeClasses = {
    sm: {
      wrapper: 'p-3 sm:p-4 mb-3 sm:mb-4',
      iconSize: 'text-xl sm:text-2xl',
      titleSize: 'text-lg sm:text-xl font-bold',
      subtitleSize: 'text-xs sm:text-sm',
      gap: 'gap-2',
    },
    md: {
      wrapper: 'p-4 sm:p-6 mb-4 sm:mb-6',
      iconSize: 'text-2xl sm:text-3xl',
      titleSize: 'text-xl sm:text-2xl font-bold',
      subtitleSize: 'text-sm sm:text-base',
      gap: 'gap-2 sm:gap-3',
    },
    lg: {
      wrapper: 'p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6',
      iconSize: 'text-2xl sm:text-3xl',
      titleSize: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
      subtitleSize: 'text-sm sm:text-base',
      gap: 'gap-2 sm:gap-3',
    },
  };

  const styles = sizeClasses[size];

  const backLinkContent = (
    <span className="inline-flex items-center text-theme-primary hover:text-theme-primary-light mb-3 sm:mb-4 text-sm sm:text-base transition-colors">
      {backText}
    </span>
  );

  return (
    <div
      className={`
        bg-theme-bg-card
        border border-theme-border-subtle
        rounded-xl sm:rounded-2xl
        shadow-theme-lg
        ${styles.wrapper}
        transition-colors duration-200
        ${className}
      `}
    >
      {/* Back Link */}
      {backLink && (
        BackLinkComponent ? (
          <BackLinkComponent to={backLink} className="no-underline">
            {backLinkContent}
          </BackLinkComponent>
        ) : (
          <a href={backLink}>
            {backLinkContent}
          </a>
        )
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className={`flex items-center ${styles.gap} mb-1 sm:mb-2`}>
            {icon && <span className={styles.iconSize}>{icon}</span>}
            <h1 className={`${styles.titleSize} text-theme-text-primary break-words`}>
              {title}
            </h1>
          </div>
          {subtitle && (
            <p
              className={`
                ${styles.subtitleSize}
                text-theme-text-secondary
                ${icon ? 'ml-8 sm:ml-10 lg:ml-12' : ''}
              `}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Slot */}
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}