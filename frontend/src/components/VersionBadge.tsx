import { APP_VERSION } from '@salvadash/shared';

interface VersionBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function VersionBadge({ onClick, className = '' }: VersionBadgeProps) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`font-mono text-[11px] text-text-muted hover:text-brand transition-colors ${className}`}
      >
        v{APP_VERSION}
      </button>
    );
  }

  return (
    <span className={`font-mono text-[11px] text-text-muted ${className}`}>v{APP_VERSION}</span>
  );
}
