import React, { useState } from 'react';
import { 
  Orbit, 
  Sparkles, 
  ExternalLink, 
  MessageSquare, 
  Calendar,
  Lock,
  Globe2,
  Users
} from 'lucide-react';
import { User } from '../types';
import { TERMS } from '../constants/terminology';
import { GuidingStarBadge, RoleBadge, ExplorerBadges } from './AuthorBadge';
import { DEFAULT_COSMIC_AVATAR } from '../utils/colorPalette';
import { generateCleanHandle } from '../utils/userRegistry';

interface AuthorCardProps {
  user: User;
  currentUser?: User | null;
  onOpenProfile?: (user: User) => void;
  onToggleFollow?: (user: User) => void;
  onStartChat?: (user: User) => void;
  compact?: boolean;
  className?: string;
}

export const AuthorCard: React.FC<AuthorCardProps> = ({
  user,
  currentUser,
  onOpenProfile,
  onToggleFollow,
  onStartChat,
  compact = false,
  className = '',
}) => {
  const [followHover, setFollowHover] = useState(false);

  const isSelf = Boolean(currentUser && currentUser.id === user.id);
  const isFollowing = Boolean(currentUser?.following?.includes(user.id));
  const cleanHandle = generateCleanHandle(user.handle || user.username || user.displayName);
  const displayName = user.displayName || user.username || 'Cosmic Explorer';

  const defaultBanner = 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80';
  const bannerImage = user.bannerUrl || defaultBanner;

  if (compact) {
    return (
      <div
        id={`author-card-compact-${user.id}`}
        onClick={() => onOpenProfile && onOpenProfile(user)}
        className={`group p-3 rounded-2xl bg-white/90 dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.07] border border-slate-200 dark:border-white/10 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-amber-400/40 shrink-0 bg-slate-900">
            <img
              src={user.avatarUrl || DEFAULT_COSMIC_AVATAR}
              alt={displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-300">
                {displayName}
              </span>
              <ExplorerBadges isVerified={user.isVerified} role={user.role} size="xs" />
            </div>
            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium truncate">
              @{cleanHandle}
            </p>
          </div>
        </div>

        {!isSelf && currentUser && onToggleFollow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow(user);
            }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
              isFollowing
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                : 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-300 shadow-xs'
            }`}
          >
            {isFollowing ? '🪐 In Orbit' : '🪐 Orbit'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      id={`author-card-${user.id}`}
      onClick={() => onOpenProfile && onOpenProfile(user)}
      className={`relative rounded-3xl bg-white/95 dark:bg-[#07132c]/95 border border-slate-200 dark:border-amber-300/20 overflow-hidden shadow-lg transition-all duration-300 hover:border-amber-400/50 cursor-pointer ${className}`}
    >
      {/* Sky Cover 🌌 (Banner) */}
      <div className="relative w-full h-24 sm:h-28 overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950">
        <img
          src={bannerImage}
          alt={`${displayName}'s Sky Cover 🌌`}
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      </div>

      {/* Profile Details Container */}
      <div className="p-4 sm:p-5 pt-0 relative">
        {/* Avatar, Badges & Orbit Action Button */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
          {/* Star Portrait ⭐ (Avatar) */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white dark:border-[#07132c] p-0.5 bg-slate-900 shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <img
              src={user.avatarUrl || DEFAULT_COSMIC_AVATAR}
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!isSelf && currentUser && onStartChat && (
              <button
                type="button"
                id={`btn-author-card-chat-${user.id}`}
                onClick={() => onStartChat(user)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 transition-colors"
                title={`Send Signal 📡 to @${cleanHandle}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}

            {!isSelf && currentUser && onToggleFollow && (
              <button
                type="button"
                id={`btn-author-card-follow-${user.id}`}
                onClick={() => onToggleFollow(user)}
                onMouseEnter={() => setFollowHover(true)}
                onMouseLeave={() => setFollowHover(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm cursor-pointer ${
                  isFollowing
                    ? followHover
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-400/40'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                    : 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-300 shadow-xs hover:scale-105'
                }`}
              >
                {isFollowing ? (followHover ? 'Leave Orbit' : '🪐 In Orbit') : '🪐 Enter Orbit'}
              </button>
            )}
          </div>
        </div>

        {/* Identity & Badges */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {displayName}
            </h4>
            <ExplorerBadges isVerified={user.isVerified} role={user.role} size="sm" showVerifiedLabel />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              @{cleanHandle}
            </span>
            {user.joinedAt && (
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {user.joinedAt}
              </span>
            )}
          </div>
        </div>

        {/* Star Story ⭐ (Bio) */}
        {(user.bio || user.quote) && (
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
            "{user.bio || user.quote}"
          </p>
        )}

        {/* External Links / Star Link 🔗 / Portal 🌀 */}
        {(user.websiteUrl || user.portalUrl) && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <a
              href={user.websiteUrl || user.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 hover:underline font-semibold"
            >
              <ExternalLink className="w-3 h-3 text-amber-500" />
              <span>{TERMS.LINK} / {TERMS.EXTERNAL_LINK}</span>
            </a>
          </div>
        )}

        {/* Stats: Followers & Following */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <strong className="text-slate-900 dark:text-white font-bold">{user.following?.length || 0}</strong>{' '}
            <span>{TERMS.FOLLOWING}</span>
          </div>
          <div>
            <strong className="text-slate-900 dark:text-white font-bold">{user.followers?.length || 0}</strong>{' '}
            <span>{TERMS.FOLLOWERS}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
