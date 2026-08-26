import React from 'react';
import { Sparkles, Shield, Star, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ExplorerRole } from '../types';
import { TERMS } from '../constants/terminology';

interface GuidingStarBadgeProps {
  isVerified?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const GuidingStarBadge: React.FC<GuidingStarBadgeProps> = ({
  isVerified = true,
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  if (isVerified === false) return null;
  const sizeClasses = {
    xs: 'w-3 h-3 text-[10px]',
    sm: 'w-3.5 h-3.5 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-5 h-5 text-base',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      id="guiding-star-verified-badge"
      title="Guiding Star 🌟 (Verified Explorer)"
      className={`inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-300 bg-amber-400/20 dark:bg-amber-400/25 border border-amber-400/50 dark:border-amber-300/40 rounded-full px-1.5 py-0.5 shadow-[0_0_8px_rgba(255,215,0,0.35)] shrink-0 select-none ${sizeClasses[size]} ${className}`}
    >
      <Sparkles className={`${iconSizes[size]} text-amber-500 dark:text-amber-300 fill-amber-400/40 animate-pulse`} />
      {showLabel ? (
        <span className="text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap">
          {TERMS.VERIFIED}
        </span>
      ) : (
        <span className="sr-only">Guiding Star 🌟 (Verified Explorer)</span>
      )}
    </span>
  );
};

interface RoleBadgeProps {
  role?: ExplorerRole;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showIconOnly?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'sm',
  className = '',
  showIconOnly = false,
}) => {
  if (!role || role === 'EXPLORER') return null;

  const isAdmin = role === 'ADMIN';

  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  if (isAdmin) {
    return (
      <span
        id="badge-galaxy-keeper-admin"
        title="Galaxy Keeper 🛡️ (Platform Admin)"
        className={`inline-flex items-center gap-1 font-bold rounded-full bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/40 shadow-xs shrink-0 select-none ${sizeClasses[size]} ${className}`}
      >
        <ShieldCheck className={`${iconSizes[size]} text-amber-600 dark:text-amber-300 fill-amber-500/30`} />
        {!showIconOnly && <span>{TERMS.ADMIN}</span>}
      </span>
    );
  }

  // Moderator
  return (
    <span
      id="badge-orbit-keeper-moderator"
      title="Orbit Keeper 🛡️ (Galaxy Moderator)"
      className={`inline-flex items-center gap-1 font-bold rounded-full bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-900 dark:text-cyan-200 border border-cyan-400/40 shadow-xs shrink-0 select-none ${sizeClasses[size]} ${className}`}
    >
      <Shield className={`${iconSizes[size]} text-cyan-600 dark:text-cyan-300 fill-cyan-400/30`} />
      {!showIconOnly && <span>{TERMS.MODERATOR}</span>}
    </span>
  );
};

interface ExplorerBadgesProps {
  isVerified?: boolean;
  role?: ExplorerRole;
  size?: 'xs' | 'sm' | 'md';
  showRoleLabel?: boolean;
  showVerifiedLabel?: boolean;
  className?: string;
}

export const ExplorerBadges: React.FC<ExplorerBadgesProps> = ({
  isVerified,
  role,
  size = 'sm',
  showRoleLabel = true,
  showVerifiedLabel = false,
  className = '',
}) => {
  if (!isVerified && (!role || role === 'EXPLORER')) return null;

  return (
    <div className={`inline-flex items-center gap-1 shrink-0 ${className}`}>
      {isVerified && (
        <GuidingStarBadge size={size} showLabel={showVerifiedLabel} />
      )}
      {role && role !== 'EXPLORER' && (
        <RoleBadge role={role} size={size} showIconOnly={!showRoleLabel} />
      )}
    </div>
  );
};
