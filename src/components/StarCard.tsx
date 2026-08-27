import React, { useState, useEffect } from 'react';
import {
  Heart,
  GitFork,
  Globe,
  Users,
  Key,
  Sparkles,
  Tag,
  ArrowUpRight,
  Orbit,
  MessageSquare,
  Flame,
  Pin,
  Edit3,
  MoreHorizontal,
  Share2,
  Flag,
  Moon,
  Sun,
  Bookmark,
  Trash2,
  Check
} from 'lucide-react';
import { StarNode, User } from '../types';
import { getClusterTheme, hexToRgba } from '../utils/colorPalette';
import { isStarLikedByUser, getStarLikesCount } from '../utils/likesHelper';
import { isStarReignitedByUser, getStarReigniteCount } from '../utils/reigniteHelper';
import { generateCleanHandle, getUserForAuthor, canUserModerate, canUserAdminister } from '../utils/userRegistry';
import { getStarGlowbackCount } from '../utils/glowbackHelper';
import { isUserEclipsed, eclipseUser, endEclipseUser } from '../utils/safetyStorage';
import { isStarSavedByUser, toggleSaveStar, SAVED_STARS_UPDATED_EVENT } from '../utils/savedStarStorage';
import { GlowbackSection } from './GlowbackSection';
import { HashtagText } from './HashtagParser';
import { ReportModal } from './ReportModal';
import { GuidingStarBadge, RoleBadge } from './AuthorBadge';
import { TERMS } from '../constants/terminology';
import { DeleteStarModal } from './DeleteStarModal';
import { ShareStarModal } from './ShareStarModal';
import { getFontFamilyClass, getFontFamilyStyle } from '../constants/fonts';

interface StarCardProps {
  star: StarNode;
  currentUser: User | null;
  onSelectStar: (star: StarNode) => void;
  onToggleLike?: (starId: string) => void;
  onToggleReignite?: (starId: string) => void;
  onTogglePin?: (starId: string) => void;
  onToggleSave?: (starId: string) => void;
  onReformStar?: (star: StarNode) => void;
  onDeleteStar?: (starId: string) => void;
  onShareToOrbit?: (star: StarNode) => void;
  onTagClick?: (tag: string) => void;
  onOpenAuthorProfile?: (authorUser: User) => void;
  onStartChat?: (authorUser: User) => void;
  onAddGlowback?: (starId: string, text: string) => void;
  onToggleGlowbackGlow?: (starId: string, glowbackId: string) => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup', bannerMessage?: string) => void;
  reignitedByLabel?: string;
  compact?: boolean;
}

export const StarCard: React.FC<StarCardProps> = ({
  star,
  currentUser,
  onSelectStar,
  onToggleLike,
  onToggleReignite,
  onTogglePin,
  onToggleSave,
  onReformStar,
  onDeleteStar,
  onShareToOrbit,
  onTagClick,
  onOpenAuthorProfile,
  onStartChat,
  onAddGlowback,
  onToggleGlowbackGlow,
  onOpenAuthModal,
  reignitedByLabel,
  compact = false,
}) => {
  const [showGlowbacks, setShowGlowbacks] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [cardToast, setCardToast] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(() => isStarSavedByUser(star.id, currentUser?.id));

  // Sync saved state when active user or star changes, or via event
  useEffect(() => {
    setIsSaved(isStarSavedByUser(star.id, currentUser?.id));

    const handleSavedUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ starId?: string; userId?: string; isSaved?: boolean }>;
      if (customEvent.detail?.starId === star.id) {
        setIsSaved(Boolean(customEvent.detail.isSaved));
      } else {
        setIsSaved(isStarSavedByUser(star.id, currentUser?.id));
      }
    };

    window.addEventListener(SAVED_STARS_UPDATED_EVENT, handleSavedUpdate);
    return () => window.removeEventListener(SAVED_STARS_UPDATED_EVENT, handleSavedUpdate);
  }, [star.id, currentUser?.id]);

  const theme = getClusterTheme(star.cluster);
  const isLiked = isStarLikedByUser(star, currentUser?.id);
  const likesCount = getStarLikesCount(star);
  const isReignited = isStarReignitedByUser(star, currentUser?.id);
  const reigniteCount = getStarReigniteCount(star);
  const glowbackCount = getStarGlowbackCount(star);
  const cleanAuthorHandle = generateCleanHandle(star.author.handle || star.author.name);
  const authorUser = getUserForAuthor(star.author, star.authorId || star.userId);
  
  const isAuthor = Boolean(
    currentUser && (
      (star.userId && star.userId === currentUser.id) ||
      (star.authorId && star.authorId === currentUser.id) ||
      star.author.handle?.replace('@', '').toLowerCase() === currentUser.handle?.replace('@', '').toLowerCase()
    )
  );

  const isAuthorEclipsed = Boolean(
    currentUser && authorUser && isUserEclipsed(currentUser.id, authorUser.id)
  );

  const handleToggleEclipse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to eclipse explorers.');
      }
      return;
    }
    if (!authorUser) return;
    if (isAuthorEclipsed) {
      endEclipseUser(currentUser, authorUser.id);
    } else {
      eclipseUser(currentUser, authorUser.id);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike(star.id);
    }
  };

  const handleReigniteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleReignite) {
      onToggleReignite(star.id);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', `Sign in to ${TERMS.SAVE.toLowerCase()} posts.`);
      }
      return;
    }
    const nextSaved = toggleSaveStar(star.id, currentUser.id);
    setIsSaved(nextSaved);
    if (onToggleSave) {
      onToggleSave(star.id);
    }
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onTogglePin) {
      onTogglePin(star.id);
    }
  };

  const handleReformClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onReformStar) {
      onReformStar(star);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setIsShareModalOpen(true);
    if (onShareToOrbit) {
      onShareToOrbit(star);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setIsDeleteDialogOpen(true);
  };

  const handleGlowbackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGlowbacks((prev) => !prev);
  };

  if (compact) {
    return (
      <div
        id={`star-card-compact-${star.id}`}
        onClick={() => onSelectStar(star)}
        className="group relative flex items-center justify-between p-3 rounded-2xl bg-white/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-300/40 hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-all duration-200 cursor-pointer shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
            {star.imageUrl ? (
              <img src={star.imageUrl} alt={star.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span
                className="w-3 h-3 rounded-full shadow-xs"
                style={{ backgroundColor: star.glowColor || theme.color, color: star.glowColor || theme.color }}
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              {star.isPinned && (
                <span className="inline-flex items-center text-[10px] text-amber-500 font-bold">
                  ⭐
                </span>
              )}
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors truncate">
                {star.title}
              </h4>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <span className="truncate">{star.author.name}</span>
              <GuidingStarBadge isVerified={star.author.isVerified || authorUser?.isVerified} size="xs" />
              <RoleBadge role={star.author.role || authorUser?.role} size="xs" />
              <span className="text-amber-700 dark:text-amber-300/80 font-semibold truncate">@{cleanAuthorHandle}</span>
              {star.isReformed && (
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium shrink-0">(Reformed)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          {/* Stargaze 🔖 (Save) Button in Compact View */}
          <button
            type="button"
            id={`btn-compact-save-${star.id}`}
            onClick={handleSaveClick}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              isSaved
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-400 dark:border-amber-400/60 shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10'
            }`}
            title={isSaved ? `Stargazed 🔖 (Saved)` : TERMS.SAVE}
          >
            <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-amber-400 text-amber-500 dark:text-amber-300' : ''}`} />
            <span className="text-[11px] font-semibold">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Reignite Button */}
          <button
            type="button"
            id={`btn-compact-reignite-${star.id}`}
            onClick={handleReigniteClick}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              isReignited
                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-300 border-slate-200 dark:border-white/10'
            }`}
            title={`${TERMS.REPOST} (${reigniteCount})`}
          >
            <span>🔥</span>
            <span className="text-[11px] font-semibold">{reigniteCount}</span>
          </button>

          {/* Glowback Trigger */}
          <button
            type="button"
            id={`btn-compact-glowback-${star.id}`}
            onClick={handleGlowbackClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10 transition-all cursor-pointer"
            title={`💫 ${glowbackCount} Glowbacks`}
          >
            <span>💫</span>
            <span className="text-[11px] font-semibold">{glowbackCount}</span>
          </button>

          {/* Like Button */}
          <button
            type="button"
            onClick={handleLikeClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              isLiked
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10'
            }`}
            title={isLiked ? '✨ Glowing' : '✨ Glow'}
          >
            <span className="text-[11px] font-semibold">{isLiked ? '✨ Glowing' : '✨ Glow'}</span>
            <span className="text-[10px] opacity-75">({likesCount})</span>
          </button>

          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`star-card-${star.id}`}
      onClick={() => onSelectStar(star)}
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-white/[0.04] border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md overflow-visible ${
        star.isPinned
          ? 'border-amber-400/70 dark:border-amber-300/50 bg-amber-500/[0.03] dark:bg-amber-400/[0.03] ring-1 ring-amber-400/30'
          : 'border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-300/40 hover:bg-slate-50 dark:hover:bg-white/[0.08]'
      }`}
    >
      {/* Top Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-80 group-hover:opacity-100 transition-opacity rounded-t-2xl"
        style={{
          background: star.isPinned
            ? 'linear-gradient(90deg, #f59e0b, #eab308, #fbbf24)'
            : `linear-gradient(90deg, ${star.glowColor || theme.color}, #f59e0b, transparent)`,
        }}
      />

      {/* Reignited Banner */}
      {reignitedByLabel && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400 pb-2 mb-2 border-b border-orange-500/20">
          <Flame className="w-3.5 h-3.5 fill-orange-500" />
          <span>{reignitedByLabel}</span>
        </div>
      )}

      {/* Header Info: North Star Badge, Cluster & Visibility Badges, Options Dropdown */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* North Star Pinned Badge */}
            {star.isPinned && (
              <span
                id={`badge-north-star-${star.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-amber-400/30 to-yellow-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/50 shadow-xs"
              >
                <span>⭐</span>
                <span>{TERMS.PINNED_POST}</span>
              </span>
            )}

            {star.galaxyName && (
              <span
                id={`badge-galaxy-${star.id}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-400/40 shadow-xs"
              >
                <span>🌌 {star.galaxyName}</span>
              </span>
            )}

            {star.universeName && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-300/40 shadow-xs">
                <span>🪐 {star.universeName}</span>
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${theme.bgBadge} ${theme.borderColor}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shadow-xs"
                style={{ backgroundColor: theme.color, color: theme.color }}
              />
              <span>{star.cluster}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {star.visibility === 'public' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25">
                <Globe className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                <span>Public</span>
              </span>
            ) : star.allowedUserIds && star.allowedUserIds.length > 1 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/40">
                <Users className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" />
                <span>Shared</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/40">
                <Key className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" />
                <span>Private</span>
              </span>
            )}

            {/* Quick Header Stargaze (Save) Icon */}
            <button
              type="button"
              id={`btn-star-header-save-${star.id}`}
              onClick={handleSaveClick}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isSaved
                  ? 'border-amber-400 text-amber-500 dark:text-amber-300 bg-amber-500/15 shadow-xs ring-1 ring-amber-400/30'
                  : 'border-transparent text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title={isSaved ? `Stargazed 🔖 (Saved)` : TERMS.SAVE}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-500 dark:text-amber-300' : ''}`} />
            </button>

            {/* Post Options Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                id={`btn-star-options-${star.id}`}
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Star options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-2xl bg-white dark:bg-[#0c1833] border border-slate-200 dark:border-white/15 shadow-xl z-30 p-1.5 space-y-1 backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Stargaze 🔖 Toggle in Menu */}
                  <button
                    type="button"
                    id={`btn-menu-save-${star.id}`}
                    onClick={handleSaveClick}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isSaved
                        ? 'text-amber-600 dark:text-amber-300 bg-amber-500/10'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-500 dark:text-amber-300' : 'text-slate-400'}`} />
                    <span>{isSaved ? 'Remove Stargazed 🔖' : TERMS.SAVE}</span>
                  </button>

                  {(isAuthor || canUserAdminister(currentUser)) && onTogglePin && (
                    <button
                      type="button"
                      id={`btn-menu-pin-${star.id}`}
                      onClick={handlePinClick}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer text-left"
                    >
                      <Pin className={`w-3.5 h-3.5 ${star.isPinned ? 'text-amber-500 fill-amber-500' : ''}`} />
                      <span>{star.isPinned ? `Unpin ${TERMS.PINNED_POST}` : `Pin as ${TERMS.PINNED_POST}`}</span>
                    </button>
                  )}

                  {(isAuthor || canUserModerate(currentUser)) && onReformStar && (
                    <button
                      type="button"
                      id={`btn-menu-reform-${star.id}`}
                      onClick={handleReformClick}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer text-left"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                      <span>{TERMS.EDIT_POST}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id={`btn-menu-share-${star.id}`}
                    onClick={handleShareClick}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{TERMS.SHARE}</span>
                  </button>

                  {/* Delete Star / Extinguish Star (Owner Only or Moderator) */}
                  {(isAuthor || (currentUser && star.authorId === currentUser.id) || (currentUser && star.userId === currentUser.id) || canUserModerate(currentUser)) && onDeleteStar && (
                    <button
                      type="button"
                      id={`btn-menu-delete-${star.id}`}
                      onClick={handleDeleteClick}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{TERMS.DELETE_POST}</span>
                    </button>
                  )}

                  {/* Safety & Moderation Actions for other users' stars */}
                  {!isAuthor && (
                    <>
                      {/* Flag / Report Star */}
                      <button
                        type="button"
                        id={`btn-menu-report-${star.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          setIsReportModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>{TERMS.REPORT_POST}</span>
                      </button>

                      {/* Eclipse / End Eclipse Author */}
                      {authorUser && (
                        <button
                          type="button"
                          id={`btn-menu-eclipse-${star.id}`}
                          onClick={handleToggleEclipse}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-left"
                        >
                          <Moon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isAuthorEclipsed ? TERMS.UNBLOCK : TERMS.BLOCK}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors line-clamp-1">
            {star.title}
          </h3>
          {star.isReformed && (
            <span
              className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-md border border-amber-500/20"
              title={star.reformedAt ? `Reformed: ${star.reformedAt}` : 'This star was reformed'}
            >
              (Reformed)
            </span>
          )}
        </div>

        {/* Content Excerpt */}
        <div
          className={`text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3 ${getFontFamilyClass(
            star.fontFamily
          )}`}
          style={{ fontFamily: star.fontFamily ? `'${star.fontFamily}', cursive, sans-serif` : 'inherit' }}
        >
          <HashtagText text={star.content} onTagClick={onTagClick} />
        </div>

        {/* Optional Image */}
        {star.imageUrl && (
          <div className="relative w-full h-28 rounded-xl overflow-hidden mb-3 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
            <img
              src={star.imageUrl}
              alt={star.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Thematic Tags */}
        {star.tags && star.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {star.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  if (onTagClick) {
                    e.stopPropagation();
                    onTagClick(tag);
                  }
                }}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
              >
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                <span>{tag}</span>
              </span>
            ))}
            {star.tags.length > 3 && (
              <span className="text-[10px] text-slate-500 px-1 py-0.5">+{star.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Author info & Stargaze, Likes, Reignite, Glowback & Remix Counts */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.08] text-xs">
        {/* Author badge */}
        <div 
          onClick={(e) => {
            if (onOpenAuthorProfile) {
              e.stopPropagation();
              const authorUser = getUserForAuthor(star.author);
              onOpenAuthorProfile(authorUser);
            }
          }}
          className={`flex items-center gap-2 min-w-0 ${onOpenAuthorProfile ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400/40 dark:border-amber-300/40 bg-slate-100 dark:bg-slate-900 shrink-0 flex items-center justify-center">
            {star.author.avatarUrl ? (
              <img
                src={star.author.avatarUrl}
                alt={star.author.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                {star.author.name}
              </span>
              <GuidingStarBadge isVerified={star.author.isVerified || authorUser?.isVerified} size="xs" />
              <RoleBadge role={star.author.role || authorUser?.role} size="xs" />
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold truncate block">
              @{cleanAuthorHandle}
            </span>
          </div>
        </div>

        {/* Actions: Stargaze, Glowback, Like, Reignite & Remix */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Stargaze 🔖 (Save Star) Action Button */}
          <button
            type="button"
            id={`btn-star-card-save-${star.id}`}
            onClick={handleSaveClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isSaved
                ? 'border-amber-400 text-amber-600 dark:text-amber-300 bg-amber-500/10 shadow-xs ring-1 ring-amber-400/30'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10'
            }`}
            title={isSaved ? `Stargazed 🔖 (Saved)` : TERMS.SAVE}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-500 dark:text-amber-300' : ''}`} />
            <span>{isSaved ? 'Stargazed' : TERMS.SAVE}</span>
          </button>

          {/* Reignite Action Button */}
          <button
            type="button"
            id={`btn-star-card-reignite-${star.id}`}
            onClick={handleReigniteClick}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isReignited
                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border-orange-300 dark:border-orange-500/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 border-slate-200 dark:border-white/10'
            }`}
            title={`${TERMS.REPOST} (${reigniteCount})`}
          >
            <span>🔥</span>
            <span>{isReignited ? 'Reignited' : 'Reignite'}</span>
            <span className="text-[10px] opacity-80 font-bold">({reigniteCount})</span>
          </button>

          {/* Glowback Trigger Button */}
          <button
            type="button"
            id={`btn-star-card-glowback-${star.id}`}
            onClick={handleGlowbackClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              showGlowbacks
                ? 'bg-amber-100 dark:bg-amber-400/20 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-300/40 shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10'
            }`}
            title={`${TERMS.COMMENT} (${glowbackCount})`}
          >
            <span>💫</span>
            <span>{TERMS.COMMENT}</span>
            <span className="text-[10px] opacity-80 font-bold">({glowbackCount})</span>
          </button>

          {/* Toggleable Like Button */}
          <button
            type="button"
            id={`btn-star-card-like-${star.id}`}
            onClick={handleLikeClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isLiked
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/50 shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10'
            }`}
            title={isLiked ? TERMS.LIKE : TERMS.LIKE}
          >
            <span className="text-[11px] font-bold">{isLiked ? `${TERMS.LIKE}ing` : TERMS.LIKE}</span>
            <span className="text-[10px] opacity-75">({likesCount})</span>
          </button>

          {star.remixCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
              <GitFork className="w-3 h-3 text-purple-400" />
              <span>{star.remixCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Expandable Inline Glowback Section */}
      {showGlowbacks && onAddGlowback && onToggleGlowbackGlow && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
          <GlowbackSection
            star={star}
            currentUser={currentUser}
            onAddGlowback={onAddGlowback}
            onToggleGlowbackGlow={onToggleGlowbackGlow}
            onOpenUserProfile={onOpenAuthorProfile}
            onOpenAuthModal={onOpenAuthModal}
            inline
            defaultExpanded
          />
        </div>
      )}

      {/* Flag a Star Report Modal */}
      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          currentUser={currentUser}
          targetType="star"
          targetId={star.id}
          targetTitle={star.title}
          targetSnippet={star.content?.slice(0, 100)}
          authorId={authorUser?.id || star.authorId || star.userId}
          authorName={star.author.name}
          authorHandle={cleanAuthorHandle}
          onOpenAuthModal={onOpenAuthModal}
        />
      )}

      {/* Delete Star Confirmation Modal */}
      {isDeleteDialogOpen && onDeleteStar && (
        <DeleteStarModal
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={() => {
            setIsDeleteDialogOpen(false);
            onDeleteStar(star.id);
          }}
          starTitle={star.title}
          clusterName={star.cluster}
        />
      )}

      {/* Share Star & Copy Link Modal */}
      {isShareModalOpen && (
        <ShareStarModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          star={star}
          currentUser={currentUser}
          onOpenAuthModal={onOpenAuthModal}
          onStartChat={onStartChat}
          onToast={(msg) => {
            setCardToast(msg);
            setTimeout(() => setCardToast(null), 3000);
          }}
        />
      )}

      {/* Temporary Card Toast */}
      {cardToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-black/90 text-white text-xs font-semibold shadow-2xl border border-purple-500/30 flex items-center gap-2 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{cardToast}</span>
        </div>
      )}
    </div>
  );
};


