import React, { useState } from 'react';
import {
  Heart,
  GitFork,
  Globe,
  Users,
  Key,
  Tag,
  Clock,
  Sparkles,
  ArrowUpRight,
  UserPlus,
  Check,
  X,
  Share2,
  Trash2,
  Maximize2,
  ShieldAlert,
  Eye,
  EyeOff,
  Orbit,
  MessageSquare
} from 'lucide-react';
import { StarNode, ConstellationEdge, User } from '../types';
import { getClusterTheme, hexToRgba } from '../utils/colorPalette';
import { isStarLikedByUser, getStarLikesCount } from '../utils/likesHelper';
import { getUserForAuthor, generateCleanHandle } from '../utils/userRegistry';
import { AuthMode } from './AuthModal';
import { FormattedText } from './FormattedText';
import { DeleteStarModal } from './DeleteStarModal';
import { ShareStarModal } from './ShareStarModal';
import { getFontFamilyClass, getFontFamilyStyle } from '../constants/fonts';

interface StarInsightProps {
  star: StarNode;
  allStars?: StarNode[];
  edges?: ConstellationEdge[];
  currentUser: User | null;
  onClose?: () => void;
  onRemix: (star: StarNode) => void;
  onSelectStar?: (star: StarNode) => void;
  onTagClick?: (tag: string) => void;
  onToggleLike: (starId: string) => void;
  onDeleteStar?: (starId: string) => void;
  onFocusInCanvas?: (star: StarNode) => void;
  onOpenAuthorProfile?: (authorUser: User) => void;
  onOpenAuthModal?: (mode: AuthMode, bannerMessage?: string) => void;
  onToggleFollow?: (targetUser: User) => void;
  onStartChat?: (authorUser: User) => void;
}

export const StarInsight: React.FC<StarInsightProps> = ({
  star,
  allStars = [],
  edges = [],
  currentUser,
  onClose,
  onRemix,
  onSelectStar,
  onTagClick,
  onToggleLike,
  onDeleteStar,
  onFocusInCanvas,
  onOpenAuthorProfile,
  onOpenAuthModal,
  onToggleFollow,
  onStartChat,
}) => {
  const [copied, setCopied] = useState(false);
  const [revealedNsfw, setRevealedNsfw] = useState(false);
  const [followHover, setFollowHover] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [insightToast, setInsightToast] = useState<string | null>(null);

  const theme = getClusterTheme(star.cluster);
  const glowColor = star.glowColor || theme.color;

  const isLiked = isStarLikedByUser(star, currentUser?.id);
  const likesCount = getStarLikesCount(star);

  // Author user resolution
  const authorUser = getUserForAuthor(star.author, star.authorId || star.userId);
  const isSelf = Boolean(
    currentUser &&
      authorUser &&
      (currentUser.id === authorUser.id ||
        (currentUser.email && authorUser.email && currentUser.email.toLowerCase() === authorUser.email.toLowerCase()) ||
        (currentUser.handle && authorUser.handle && currentUser.handle.toLowerCase().replace(/^@/, '') === authorUser.handle.toLowerCase().replace(/^@/, '')))
  );

  const isFollowing = Boolean(
    currentUser &&
      authorUser &&
      currentUser.following &&
      currentUser.following.includes(authorUser.id)
  );

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleFollowClick = () => {
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to follow cosmic creators.');
      }
      return;
    }
    if (!authorUser || isSelf) return;
    if (onToggleFollow) {
      onToggleFollow(authorUser);
    }
  };

  const isPoetry = star.cluster === 'Late Night Poetry';

  // Connected nodes
  const connectedItems = edges
    .filter((e) => e.sourceId === star.id || e.targetId === star.id)
    .map((e) => {
      const otherId = e.sourceId === star.id ? e.targetId : e.sourceId;
      const otherStar = allStars.find((s) => s.id === otherId);
      return { edge: e, otherStar };
    })
    .filter((item): item is { edge: ConstellationEdge; otherStar: StarNode } => Boolean(item.otherStar));

  return (
    <div id={`star-insight-${star.id}`} className="flex flex-col h-full overflow-hidden text-slate-200">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_currentColor]"
            style={{ backgroundColor: glowColor, color: glowColor }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Star Insight
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onFocusInCanvas && (
            <button
              id="insight-focus-canvas-btn"
              onClick={() => onFocusInCanvas(star)}
              title="Focus in Cosmos"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <button
            id="insight-share-btn"
            onClick={handleShare}
            title="🛰️ Send to Orbit"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              id="insight-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 custom-scrollbar">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
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
              const uTheme = getClusterTheme(uName);
              return (
                <span
                  key={uName}
                  id={`insight-universe-badge-${star.id}-${uName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border backdrop-blur-md bg-gradient-to-r from-amber-400/20 via-yellow-500/20 to-amber-600/20 text-amber-200 border-amber-300/50 shadow-[0_0_14px_rgba(255,215,0,0.3)] ring-1 ring-amber-300/30"
                >
                  <Orbit className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>🪐 {uName}</span>
                </span>
              );
            });
          })()}

          {star.visibility === 'public' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] bg-emerald-500/10 text-emerald-300 border-emerald-500/25">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Public Universe</span>
            </span>
          ) : star.allowedUserIds && star.allowedUserIds.length > 1 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border backdrop-blur-md bg-amber-500/15 text-amber-200 border-amber-400/40 shadow-[0_0_10px_rgba(255,215,0,0.15)]">
              <Users className="w-3 h-3 text-amber-300" />
              <span>Our Universe (Shared)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border backdrop-blur-md bg-amber-500/15 text-amber-200 border-amber-400/40 shadow-[0_0_10px_rgba(255,215,0,0.15)]">
              <Key className="w-3 h-3 text-amber-300" />
              <span>Private Star</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
          {star.title}
        </h2>

        {/* Author Card & Action Buttons */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-3 w-full shadow-inner">
          {/* Top Row (Author Details & Timestamp) */}
          <div className="flex items-center justify-between gap-3 w-full">
            <div
              onClick={() => authorUser && onOpenAuthorProfile && onOpenAuthorProfile(authorUser)}
              className={`flex items-center gap-2 min-w-0 ${authorUser && onOpenAuthorProfile ? 'cursor-pointer group' : ''}`}
            >
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-amber-300/40 bg-slate-900 shrink-0 flex items-center justify-center">
                {star.author.avatarUrl ? (
                  <img
                    src={star.author.avatarUrl}
                    alt={star.author.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                <p className="font-semibold text-white truncate text-sm">
                  {authorUser?.displayName || star.author.name}
                </p>
                <p className="text-gray-400 text-sm shrink-0 whitespace-nowrap">
                  @{generateCleanHandle(authorUser?.username || authorUser?.handle || star.author.handle)}
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-gray-400 text-xs shrink-0 flex items-center gap-1 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>{star.createdAt}</span>
            </div>
          </div>

          {/* Bottom Row (Action Buttons) */}
          {authorUser && !isSelf && (
            <div className="flex items-center gap-2 w-full pt-1 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                id="btn-insight-follow-author"
                onClick={handleFollowClick}
                onMouseEnter={() => setFollowHover(true)}
                onMouseLeave={() => setFollowHover(false)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap ${
                  isFollowing
                    ? followHover
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 hover:brightness-105 border border-amber-200 shadow-[0_0_12px_rgba(255,215,0,0.25)]'
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

              {onStartChat && (
                <button
                  type="button"
                  id="btn-insight-message-author"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartChat(authorUser);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  title={`📡 Send Signal to @${generateCleanHandle(authorUser.username || authorUser.handle)}`}
                >
                  <span>📡 Send Signal</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 18+ Warning */}
        {star.isNsfw && (
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-rose-200 truncate">18+ Mature Content</p>
                <p className="text-[11px] text-slate-300">
                  {revealedNsfw ? 'Content is unblurred.' : 'Visual and text are softened.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRevealedNsfw(!revealedNsfw)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-medium cursor-pointer"
            >
              {revealedNsfw ? 'Hide' : 'Reveal'}
            </button>
          </div>
        )}

        {/* Image */}
        {star.imageUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/[0.02] shadow-lg group">
            <img
              src={star.imageUrl}
              alt={star.title}
              className={`w-full h-48 object-cover transition-all duration-500 group-hover:scale-105 ${
                star.isNsfw && !revealedNsfw ? 'blur-xl scale-110' : ''
              }`}
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Content Body */}
        <div
          className={`rounded-2xl p-5 border transition-all frosted-glass-card ${
            isPoetry
              ? 'bg-gradient-to-b from-pink-950/20 to-purple-950/20 border-pink-500/20 italic font-serif leading-relaxed text-pink-100 text-base'
              : 'text-slate-200 text-sm leading-relaxed'
          } ${getFontFamilyClass(star.fontFamily)}`}
          style={{
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 0 20px ${hexToRgba(
              glowColor,
              0.04
            )}`,
            fontFamily: star.fontFamily ? `'${star.fontFamily}', cursive, sans-serif` : 'inherit',
          }}
        >
          {star.isNsfw && !revealedNsfw ? (
            <div className="py-2 text-center select-none">
              <p className="text-slate-400 text-xs italic blur-[3px] mb-3">{star.content}</p>
              <button
                type="button"
                onClick={() => setRevealedNsfw(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/15 text-amber-200 text-xs font-semibold cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-300" />
                <span>Reveal 18+ Content</span>
              </button>
            </div>
          ) : (
            <div
              className={`leading-relaxed ${getFontFamilyClass(star.fontFamily)}`}
              style={{ fontFamily: star.fontFamily ? `'${star.fontFamily}', cursive, sans-serif` : 'inherit' }}
            >
              <FormattedText text={star.content} onTagClick={onTagClick} />
            </div>
          )}
        </div>

        {/* Thematic Tags */}
        {star.tags && star.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
              <Tag className="w-3.5 h-3.5 text-amber-300" />
              <span>Thematic Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {star.tags.map((tag) => (
                <button
                  key={tag}
                  id={`insight-tag-${tag.replace('#', '')}`}
                  onClick={() => onTagClick && onTagClick(tag)}
                  className="px-2.5 py-1 text-xs rounded-lg frosted-glass-card hover:border-amber-300/40 hover:text-amber-200 text-slate-300 transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connected Stars */}
        {connectedItems.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Connected Stars ({connectedItems.length})</span>
            </div>
            <div className="space-y-2">
              {connectedItems.map(({ edge, otherStar }) => {
                const otherTheme = getClusterTheme(otherStar.cluster);
                return (
                  <div
                    key={otherStar.id}
                    id={`insight-connected-star-${otherStar.id}`}
                    onClick={() => onSelectStar && onSelectStar(otherStar)}
                    className="group flex items-center justify-between p-3 rounded-xl frosted-glass-card hover:border-amber-300/40 transition-all cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                        style={{
                          backgroundColor: otherStar.glowColor || otherTheme.color,
                          color: otherStar.glowColor || otherTheme.color,
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-amber-200 transition-colors">
                          {otherStar.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {edge.isRemix ? '✨ Remix connection' : `Shared: ${edge.sharedTags.slice(0, 2).join(' ')}`}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-200 transition-colors shrink-0 ml-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="p-4 border-t border-white/10 bg-white/[0.03] backdrop-blur-xl flex items-center gap-2.5">
        {/* Toggleable Like Button */}
        <button
          id="insight-like-btn"
          type="button"
          onClick={() => onToggleLike(star.id)}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
            isLiked
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_16px_rgba(255,215,0,0.45)] ring-1 ring-amber-400/40'
              : 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
          }`}
          title={isLiked ? '✨ Glowing' : '✨ Glow'}
        >
          <span className="font-bold">{isLiked ? '✨ Glowing' : '✨ Glow'}</span>
          <span className="text-[11px] opacity-75 font-semibold">({likesCount})</span>
        </button>

        {/* Remix Button */}
        <button
          id="insight-btn-remix"
          onClick={() => onRemix(star)}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(255,215,0,0.35)] border border-amber-200 active:scale-98 transition-all cursor-pointer"
        >
          <GitFork className="w-4 h-4 text-slate-950" />
          <span className="font-bold text-slate-950">Remix This Idea</span>
        </button>

        {/* Delete button if user authored */}
        {onDeleteStar && (isSelf || (currentUser && star.authorId === currentUser.id) || (currentUser && star.userId === currentUser.id) || star.isUserCreated) && (
          <button
            id="insight-delete-star-btn"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
            title="Delete Star"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Delete Star Confirmation Modal */}
      {isDeleteDialogOpen && onDeleteStar && (
        <DeleteStarModal
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={() => {
            setIsDeleteDialogOpen(false);
            onDeleteStar(star.id);
            if (onClose) onClose();
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
            setInsightToast(msg);
            setTimeout(() => setInsightToast(null), 3000);
          }}
        />
      )}

      {/* Insight Toast Notification */}
      {insightToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-black/90 text-white text-xs font-semibold shadow-2xl border border-purple-500/30 flex items-center gap-2 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{insightToast}</span>
        </div>
      )}
    </div>
  );
};
