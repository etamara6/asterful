import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  GitFork,
  Heart,
  Share2,
  Lock,
  Globe,
  Tag,
  ArrowUpRight,
  Clock,
  User as UserIcon,
  Trash2,
  Check,
  Maximize2,
  Users,
  Key,
  UserPlus,
  ShieldAlert,
  Eye,
  EyeOff,
  Orbit,
  MessageSquare,
  Flame,
  Pin,
  Edit3,
  Flag,
  Moon,
  Sun,
  Bookmark
} from 'lucide-react';
import { StarNode, ConstellationEdge, User } from '../types';
import { getClusterTheme, hexToRgba } from '../utils/colorPalette';
import { getUserForAuthor, generateCleanHandle } from '../utils/userRegistry';
import { isStarLikedByUser, getStarLikesCount } from '../utils/likesHelper';
import { isStarReignitedByUser, getStarReigniteCount } from '../utils/reigniteHelper';
import { getStarGlowbackCount } from '../utils/glowbackHelper';
import { isUserEclipsed, eclipseUser, endEclipseUser } from '../utils/safetyStorage';
import { isStarSavedByUser, toggleSaveStar, SAVED_STARS_UPDATED_EVENT } from '../utils/savedStarStorage';
import { GlowbackSection } from './GlowbackSection';
import { HashtagText } from './HashtagParser';
import { AuthMode } from './AuthModal';
import { ReportModal } from './ReportModal';
import { TERMS } from '../constants/terminology';
import { DeleteStarModal } from './DeleteStarModal';
import { ShareStarModal } from './ShareStarModal';
import { getFontFamilyClass, getFontFamilyStyle } from '../constants/fonts';

interface StarDetailDrawerProps {
  star: StarNode | null;
  allStars: StarNode[];
  edges: ConstellationEdge[];
  currentUser?: User | null;
  onClose: () => void;
  onRemix: (parentStar: StarNode) => void;
  onSelectStar: (star: StarNode) => void;
  onTagClick: (tag: string) => void;
  onLikeStar: (starId: string) => void;
  onToggleReignite?: (starId: string) => void;
  onTogglePin?: (starId: string) => void;
  onToggleSave?: (starId: string) => void;
  onReformStar?: (star: StarNode) => void;
  onDeleteStar?: (starId: string) => void;
  onFocusInCanvas: (star: StarNode) => void;
  onOpenAuthorProfile?: (authorUser: User) => void;
  onOpenAuthModal?: (mode: AuthMode, bannerMessage?: string) => void;
  onToggleFollow?: (authorUser: User) => void;
  onStartChat?: (authorUser: User) => void;
  onAddGlowback?: (starId: string, text: string) => void;
  onToggleGlowbackGlow?: (starId: string, glowbackId: string) => void;
}

export const StarDetailDrawer: React.FC<StarDetailDrawerProps> = ({
  star,
  allStars,
  edges,
  currentUser,
  onClose,
  onRemix,
  onSelectStar,
  onTagClick,
  onLikeStar,
  onToggleReignite,
  onTogglePin,
  onToggleSave,
  onReformStar,
  onDeleteStar,
  onFocusInCanvas,
  onOpenAuthorProfile,
  onOpenAuthModal,
  onToggleFollow,
  onStartChat,
  onAddGlowback,
  onToggleGlowbackGlow,
}) => {
  const [copied, setCopied] = useState(false);
  const [followHover, setFollowHover] = useState(false);
  const [revealedNsfw, setRevealedNsfw] = useState(false);
  const [showGlowbacks, setShowGlowbacks] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [drawerToast, setDrawerToast] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(() => (star ? isStarSavedByUser(star.id, currentUser?.id) : false));
  const glowbackRef = useRef<HTMLDivElement>(null);

  // Reset star-specific state and sync saved state when active star changes
  useEffect(() => {
    setRevealedNsfw(false);
    setCopied(false);
    setIsSaved(star ? isStarSavedByUser(star.id, currentUser?.id) : false);

    const handleSavedUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ starId?: string; userId?: string; isSaved?: boolean }>;
      if (star && customEvent.detail?.starId === star.id) {
        setIsSaved(Boolean(customEvent.detail.isSaved));
      } else if (star) {
        setIsSaved(isStarSavedByUser(star.id, currentUser?.id));
      }
    };

    window.addEventListener(SAVED_STARS_UPDATED_EVENT, handleSavedUpdate);
    return () => window.removeEventListener(SAVED_STARS_UPDATED_EVENT, handleSavedUpdate);
  }, [star?.id, currentUser?.id]);

  const handleToggleSave = () => {
    if (!star) return;
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', `Sign in to ${TERMS.SAVE.toLowerCase()} posts.`);
      }
      return;
    }
    const nextState = toggleSaveStar(star.id, currentUser.id);
    setIsSaved(nextState);
    if (onToggleSave) {
      onToggleSave(star.id);
    }
  };

  const isLiked = isStarLikedByUser(star, currentUser?.id);
  const likesCount = getStarLikesCount(star);
  const isReignited = isStarReignitedByUser(star, currentUser?.id);
  const reigniteCount = getStarReigniteCount(star);
  const glowbackCount = getStarGlowbackCount(star);

  const theme = getClusterTheme(star?.cluster || 'Digital Art');
  const glowColor = star?.glowColor || theme.color;

  // Resolve full author user object from registry
  const authorUser = useMemo(() => {
    if (!star) return null;
    return getUserForAuthor(star.author, star.authorId || star.userId);
  }, [star]);

  // Check if current authenticated user is the star's author
  const isSelf = useMemo(() => {
    if (!currentUser || !star) return false;
    if (currentUser.id === star.authorId || currentUser.id === star.userId) return true;
    if (authorUser && currentUser.id === authorUser.id) return true;
    const currentHandle = currentUser.handle.toLowerCase().replace(/^@/, '').trim();
    const starHandle = (star.author.handle || '').toLowerCase().replace(/^@/, '').trim();
    if (currentHandle && starHandle && currentHandle === starHandle) return true;
    return false;
  }, [currentUser, star, authorUser]);

  // Check if author is eclipsed
  const isEclipsed = useMemo(() => {
    if (!currentUser || !authorUser || isSelf) return false;
    return isUserEclipsed(currentUser.id, authorUser.id);
  }, [currentUser, authorUser, isSelf]);

  const handleToggleEclipse = () => {
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to eclipse explorers.');
      }
      return;
    }
    if (!authorUser) return;
    if (isEclipsed) {
      endEclipseUser(currentUser, authorUser.id);
    } else {
      eclipseUser(currentUser, authorUser.id);
    }
  };

  // Check if current user is actively following this author
  const isFollowing = useMemo(() => {
    if (!currentUser || !authorUser || isSelf) return false;
    return Boolean(currentUser.following?.includes(authorUser.id));
  }, [currentUser, authorUser, isSelf]);

  // Find connected stars and relation reason
  const starMap = useMemo(() => new Map(allStars.map(s => [s.id, s])), [allStars]);
  const connectedEdges = useMemo(() => {
    if (!star) return [];
    return edges.filter(e => e.sourceId === star.id || e.targetId === star.id);
  }, [edges, star]);
  
  const connectedItems = useMemo(() => {
    if (!star) return [];
    return connectedEdges.map(e => {
      const otherId = e.sourceId === star.id ? e.targetId : e.sourceId;
      const otherStar = starMap.get(otherId);
      return {
        edge: e,
        otherStar,
      };
    }).filter((item): item is { edge: ConstellationEdge; otherStar: StarNode } => item.otherStar !== undefined);
  }, [connectedEdges, star, starMap]);

  const handleShare = () => {
    if (!star) return;
    setIsShareModalOpen(true);
  };

  const handleLike = () => {
    if (!star) return;
    onLikeStar(star.id);
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (authorUser && onOpenAuthorProfile) {
      onOpenAuthorProfile(authorUser);
    }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to follow creators.');
      }
      return;
    }

    if (!authorUser || isSelf) return;

    if (onToggleFollow) {
      onToggleFollow(authorUser);
    }
  };

  const isPoetry = star?.cluster === 'Late Night Poetry';

  return (
    <AnimatePresence>
      {star && (
        <motion.aside
          key={star.id}
          id="star-detail-drawer"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[420px] frosted-glass-drawer flex flex-col overflow-hidden"
      >
        {/* Top Glow Accent Bar */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, ${glowColor}, #a78bfa, #4fd1c5)`,
            boxShadow: `0 0 16px ${hexToRgba(glowColor, 0.8)}`
          }}
        />

        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_currentColor]"
              style={{ backgroundColor: glowColor, color: glowColor }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Star Insight
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isSelf && onTogglePin && (
              <button
                id="drawer-pin-star-btn"
                onClick={() => onTogglePin(star.id)}
                title={star.isPinned ? `Unpin ${TERMS.PINNED_POST}` : `Pin as ${TERMS.PINNED_POST}`}
                className={`p-1.5 rounded-lg transition-colors ${
                  star.isPinned
                    ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
                }`}
              >
                <Pin className={`w-4 h-4 ${star.isPinned ? 'fill-amber-500' : ''}`} />
              </button>
            )}
            {isSelf && onReformStar && (
              <button
                id="drawer-reform-star-btn"
                onClick={() => onReformStar(star)}
                title={TERMS.EDIT_POST}
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-white/10 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {(isSelf || (currentUser && star.authorId === currentUser.id) || (currentUser && star.userId === currentUser.id) || star.isUserCreated) && onDeleteStar && (
              <button
                id="drawer-header-delete-btn"
                onClick={() => setIsDeleteDialogOpen(true)}
                title={TERMS.DELETE_POST}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {!isSelf && (
              <>
                {/* Flag / Report Star */}
                <button
                  id="drawer-report-star-btn"
                  onClick={() => setIsReportModalOpen(true)}
                  title={TERMS.REPORT_POST}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                </button>

                {/* Eclipse / End Eclipse Author */}
                {authorUser && (
                  <button
                    id="drawer-eclipse-author-btn"
                    onClick={handleToggleEclipse}
                    title={isEclipsed ? TERMS.UNBLOCK : TERMS.BLOCK}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isEclipsed
                        ? 'text-amber-600 dark:text-amber-300 bg-amber-500/15'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            <button
              id="drawer-focus-canvas-btn"
              onClick={() => onFocusInCanvas(star)}
              title="Focus in Cosmos"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {/* Stargaze 🔖 (Save Post) Header Action Button */}
            <button
              id="drawer-save-btn"
              onClick={handleToggleSave}
              title={isSaved ? `Stargazed 🔖 (Saved)` : TERMS.SAVE}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSaved
                  ? 'border-amber-400 text-amber-500 dark:text-amber-300 bg-amber-500/10 shadow-xs ring-1 ring-amber-400/30'
                  : 'border-transparent text-slate-500 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-500 dark:text-amber-300' : ''}`} />
            </button>
            <button
              id="drawer-share-btn"
              onClick={handleShare}
              title="🛰️ Send to Orbit"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors relative"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              id="drawer-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 text-slate-800 dark:text-slate-200 custom-scrollbar">
          {/* Metadata Badges (Cluster + Visibility) */}
          <div className="flex flex-wrap items-center gap-2">
            {star.isPinned && (
              <span
                id={`drawer-badge-north-star-${star.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border bg-gradient-to-r from-amber-400/30 to-yellow-400/20 text-amber-900 dark:text-amber-200 border-amber-400/50 shadow-xs"
              >
                <span>⭐</span>
                <span>{TERMS.PINNED_POST}</span>
              </span>
            )}

            {star.galaxyName && (
              <span
                id={`drawer-galaxy-badge-${star.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border bg-purple-100 dark:bg-purple-500/20 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-400/40 shadow-xs"
              >
                <span>🌌 {star.galaxyName}</span>
              </span>
            )}

            {(() => {
              const renderedUniverses = new Set<string>();
              if (star.universes && Array.isArray(star.universes)) {
                star.universes.forEach((u) => {
                  if (u && u.trim()) renderedUniverses.add(u.trim());
                });
              }
              if (star.universeName && star.universeName.trim()) {
                renderedUniverses.add(star.universeName.trim());
              }
              if (renderedUniverses.size === 0 && star.cluster) {
                renderedUniverses.add(star.cluster);
              }

              return Array.from(renderedUniverses).map((uName) => {
                return (
                  <span
                    key={uName}
                    id={`drawer-universe-badge-${star.id}-${uName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border bg-amber-100 dark:bg-gradient-to-r dark:from-amber-400/20 dark:via-yellow-500/20 dark:to-amber-600/20 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-300/50 shadow-xs dark:shadow-[0_0_14px_rgba(255,215,0,0.3)]"
                  >
                    <Orbit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                    <span>🪐 {uName}</span>
                  </span>
                );
              });
            })()}

            {star.visibility === 'public' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25">
                <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Public Universe</span>
              </span>
            ) : star.allowedUserIds && star.allowedUserIds.length > 1 ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/40">
                  <Users className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                  <span>Our Universe (Shared)</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-300/30">
                  Shared with {star.allowedUserIds.length} stargazer{star.allowedUserIds.length === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/40">
                <Key className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                <span>My Private Space (Only Me)</span>
              </span>
            )}

            {star.parentId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-pink-50 text-pink-800 border border-pink-300 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30">
                <GitFork className="w-3 h-3" />
                Remix of {star.parentTitle || 'Parent'}
              </span>
            )}

            {star.isNsfw && (
              <span 
                id="badge-drawer-nsfw"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>18+ Sensitive Content</span>
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                {star.title}
              </h2>
              {star.isReformed && (
                <span
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20"
                  title={star.reformedAt ? `Reformed: ${star.reformedAt}` : 'This star was reformed'}
                >
                  (Reformed)
                </span>
              )}
            </div>

            {/* Author and Time Bar */}
            <div className="flex flex-col gap-3 w-full mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
              {/* Top Row (Author Details & Timestamp) */}
              <div className="flex items-center justify-between gap-3 w-full">
                {/* Left side (Avatar + Names) */}
                <div
                  id={`drawer-author-profile-${authorUser?.id || star.id}`}
                  onClick={handleAuthorClick}
                  className="group flex items-center gap-2 min-w-0 cursor-pointer py-1 px-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
                  title={`View @${(authorUser?.handle || star.author.handle || '').replace(/^@/, '')}'s Cosmic Profile`}
                >
                  {star.author.avatarUrl || authorUser?.avatarUrl ? (
                    <img
                      src={star.author.avatarUrl || authorUser?.avatarUrl}
                      alt={star.author.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/20 group-hover:ring-amber-400 group-hover:scale-105 transition-all shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs group-hover:ring-1 group-hover:ring-amber-400 group-hover:scale-105 transition-all shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {authorUser?.displayName || star.author.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm shrink-0 whitespace-nowrap">
                      @{generateCleanHandle(authorUser?.username || authorUser?.handle || star.author.handle)}
                    </p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-gray-500 dark:text-gray-400 text-xs shrink-0 flex items-center gap-1 ml-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{star.createdAt}</span>
                </div>
              </div>

              {/* Bottom Row (Action Buttons) */}
              {!isSelf && authorUser && (
                <div className="flex items-center gap-2 w-full pt-1 flex-wrap sm:flex-nowrap">
                  {/* Inline Follow Button */}
                  <button
                    type="button"
                    id={`star-insight-follow-btn-${authorUser.id}`}
                    onClick={handleFollowClick}
                    onMouseEnter={() => setFollowHover(true)}
                    onMouseLeave={() => setFollowHover(false)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                      isFollowing
                        ? followHover
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/20 hover:bg-slate-200'
                        : 'bg-amber-100 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-400/50 hover:bg-amber-200 dark:hover:bg-amber-400/20'
                    }`}
                    title={
                      !currentUser
                        ? 'Sign in to enter orbit with creators'
                        : isFollowing
                        ? followHover
                          ? `🪐 Leave Orbit of @${authorUser.handle?.replace(/^@/, '')}`
                          : `🪐 In Orbit with @${authorUser.handle?.replace(/^@/, '')}`
                        : `🪐 Enter Orbit with @${authorUser.handle?.replace(/^@/, '')}`
                    }
                  >
                    {isFollowing ? (
                      followHover ? (
                        <span>🪐 Leave Orbit</span>
                      ) : (
                        <span>🪐 In Orbit</span>
                      )
                    ) : (
                      <span>🪐 Enter Orbit</span>
                    )}
                  </button>

                  {/* Direct Message Button */}
                  {onStartChat && (
                    <button
                      type="button"
                      id={`star-insight-message-btn-${authorUser.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onStartChat(authorUser);
                      }}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
                      title={`📡 Send Signal to @${generateCleanHandle(authorUser.username || authorUser.handle)}`}
                    >
                      <span>📡 Send Signal</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 18+ Content Warning & Reveal Control (when star is marked sensitive) */}
          {star.isNsfw && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 truncate">
                    18+ Mature & Sensitive Content
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    {revealedNsfw ? 'Content is currently unblurred.' : 'Visual and text are softened for safety.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-toggle-nsfw-reveal"
                onClick={() => setRevealedNsfw(!revealedNsfw)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs font-medium transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm"
              >
                {revealedNsfw ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300" />
                    <span>Reveal</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Attached Image Preview if available */}
          {star.imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/[0.02] shadow-sm group">
              <img
                src={star.imageUrl}
                alt={star.title}
                className={`w-full h-44 object-cover transition-all duration-500 group-hover:scale-105 ${
                  star.isNsfw && !revealedNsfw ? 'blur-xl scale-110' : ''
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 dark:from-[#0c0c18] via-transparent to-transparent opacity-60" />
              {star.isNsfw && !revealedNsfw && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 text-center">
                  <ShieldAlert className="w-6 h-6 text-rose-400 mb-1 animate-pulse" />
                  <span className="text-xs font-bold text-rose-200">18+ Sensitive Image</span>
                  <button
                    type="button"
                    onClick={() => setRevealedNsfw(true)}
                    className="mt-2 text-[11px] font-medium text-amber-300 hover:text-amber-200 underline"
                  >
                    Click to view visual
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Content Body */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden ${
              isPoetry
                ? 'bg-gradient-to-b from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-pink-200 dark:border-pink-500/20 italic font-serif leading-relaxed text-pink-950 dark:text-pink-100/90 text-sm sm:text-base'
                : 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm leading-relaxed shadow-xs'
            } ${getFontFamilyClass(star.fontFamily)}`}
            style={{ fontFamily: star.fontFamily ? `'${star.fontFamily}', cursive, sans-serif` : 'inherit' }}
          >
            {star.isNsfw && !revealedNsfw ? (
              <div className="py-2 text-center select-none">
                <p className="text-slate-500 dark:text-slate-400 text-xs italic line-clamp-2 blur-[3px] mb-3">
                  {star.content}
                </p>
                <button
                  type="button"
                  id="btn-reveal-nsfw-body"
                  onClick={() => setRevealedNsfw(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-400/15 hover:bg-amber-200 dark:hover:bg-amber-400/25 border border-amber-300 dark:border-amber-300/30 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                  <span>Reveal 18+ Content</span>
                </button>
              </div>
            ) : (
              <div
                className={`leading-relaxed ${getFontFamilyClass(star.fontFamily)}`}
                style={{ fontFamily: star.fontFamily ? `'${star.fontFamily}', cursive, sans-serif` : 'inherit' }}
              >
                <HashtagText text={star.content} onTagClick={onTagClick} />
              </div>
            )}
          </div>

          {/* Glowback Comments Section */}
          {onAddGlowback && onToggleGlowbackGlow && (
            <div ref={glowbackRef} className="pt-1">
              <GlowbackSection
                star={star}
                currentUser={currentUser || null}
                onAddGlowback={onAddGlowback}
                onToggleGlowbackGlow={onToggleGlowbackGlow}
                onOpenUserProfile={onOpenAuthorProfile}
                onOpenAuthModal={onOpenAuthModal}
                inline
                defaultExpanded
              />
            </div>
          )}

          {/* Thematic Tags */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2.5">
              <Tag className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Thematic Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {star.tags.map((tag) => (
                <button
                  key={tag}
                  id={`tag-btn-${tag.replace('#', '')}`}
                  onClick={() => onTagClick(tag)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-teal-400 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300 transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Connected Constellation (Linked Stars) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Connected Stars ({connectedItems.length})</span>
              </div>
            </div>

            {connectedItems.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                This star is currently a solitary beacon in deep space.
              </p>
            ) : (
              <div className="space-y-2">
                {connectedItems.map(({ edge, otherStar }) => {
                  const otherTheme = getClusterTheme(otherStar.cluster);
                  return (
                    <div
                      key={otherStar.id}
                      id={`connected-star-${otherStar.id}`}
                      onClick={() => onSelectStar(otherStar)}
                      className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-teal-400 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{
                            backgroundColor: otherStar.glowColor || otherTheme.color,
                            color: otherStar.glowColor || otherTheme.color,
                          }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors">
                            {otherStar.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {edge.isRemix
                              ? '✨ Remix connection'
                              : `Shared: ${edge.sharedTags.slice(0, 2).join(' ')}`}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors shrink-0 ml-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] backdrop-blur-xl flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Stargaze 🔖 (Save Post) Footer Action Button */}
          <button
            id="drawer-footer-save-btn"
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              isSaved
                ? 'border-amber-400 text-amber-600 dark:text-amber-300 bg-amber-500/10 shadow-xs ring-1 ring-amber-400/30'
                : 'bg-white dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600'
            }`}
            title={isSaved ? `Stargazed 🔖 (Saved)` : TERMS.SAVE}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-500 dark:text-amber-300' : ''}`} />
            <span className="font-bold">{isSaved ? 'Stargazed' : TERMS.SAVE}</span>
          </button>

          {/* Like / Star Button */}
          <button
            id="drawer-like-btn"
            type="button"
            onClick={handleLike}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              isLiked
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/50 shadow-xs'
                : 'bg-white dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title={isLiked ? TERMS.LIKE : TERMS.LIKE}
          >
            <span className="font-bold">{isLiked ? `${TERMS.LIKE}ing` : TERMS.LIKE}</span>
            <span className="text-[11px] opacity-75 font-semibold">({likesCount})</span>
          </button>

          {/* Reignite Button */}
          {onToggleReignite && (
            <button
              id="drawer-reignite-btn"
              type="button"
              onClick={() => onToggleReignite(star.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                isReignited
                  ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border-orange-300 dark:border-orange-500/40 shadow-xs'
                  : 'bg-white dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600'
              }`}
              title={`${TERMS.REPOST} (${reigniteCount})`}
            >
              <span>🔥</span>
              <span className="font-bold">{isReignited ? 'Reignited' : 'Reignite'}</span>
              <span className="text-[11px] opacity-75 font-semibold">({reigniteCount})</span>
            </button>
          )}

          {/* Remix This Idea (Primary Action) */}
          <button
            id="btn-remix-idea"
            onClick={() => onRemix(star)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 shadow-sm border border-pink-400/30 active:scale-98 transition-all cursor-pointer"
          >
            <GitFork className="w-4 h-4" />
            <span>{TERMS.REMIX}</span>
          </button>

          {/* Delete Button if created by user */}
          {onDeleteStar && (isSelf || (currentUser && star.authorId === currentUser.id) || (currentUser && star.userId === currentUser.id) || star.isUserCreated) && (
            <button
              id="drawer-delete-star-btn"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 border border-transparent hover:border-pink-200 dark:hover:border-pink-500/20 transition-colors cursor-pointer"
              title={TERMS.DELETE_POST}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Flag a Star Report Modal */}
        {isReportModalOpen && star && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            currentUser={currentUser || null}
            targetType="star"
            targetId={star.id}
            targetTitle={star.title}
            targetSnippet={star.content?.slice(0, 100)}
            authorId={authorUser?.id || star.authorId || star.userId}
            authorName={star.author.name}
            authorHandle={generateCleanHandle(star.author.handle || star.author.name)}
            onOpenAuthModal={onOpenAuthModal}
          />
        )}

        {/* Delete Star Confirmation Modal */}
        {isDeleteDialogOpen && star && onDeleteStar && (
          <DeleteStarModal
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={() => {
              setIsDeleteDialogOpen(false);
              onDeleteStar(star.id);
              onClose();
            }}
            starTitle={star.title}
            clusterName={star.cluster}
          />
        )}

        {/* Share Star & Copy Link Modal */}
        {isShareModalOpen && star && (
          <ShareStarModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            star={star}
            currentUser={currentUser || null}
            onOpenAuthModal={onOpenAuthModal}
            onStartChat={onStartChat}
            onToast={(msg) => {
              setDrawerToast(msg);
              setTimeout(() => setDrawerToast(null), 3000);
            }}
          />
        )}

        {/* Drawer Toast Notification */}
        {drawerToast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-black/90 text-white text-xs font-semibold shadow-2xl border border-purple-500/30 flex items-center gap-2 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{drawerToast}</span>
          </div>
        )}
      </motion.aside>
      )}
    </AnimatePresence>
  );
};
