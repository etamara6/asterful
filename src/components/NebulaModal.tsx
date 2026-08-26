import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Search,
  Plus,
  Compass,
  Users,
  Tag,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { StarNode, User } from '../types';
import { StarCard } from './StarCard';
import { TERMS } from '../constants/terminology';

interface NebulaModalProps {
  isOpen: boolean;
  tag: string | null;
  stars: StarNode[];
  currentUser: User | null;
  onClose: () => void;
  onSelectStar: (star: StarNode) => void;
  onOpenAuthorProfile?: (user: User) => void;
  onTagClick?: (tag: string) => void;
  onToggleLike?: (starId: string) => void;
  onToggleReignite?: (starId: string) => void;
  onTogglePin?: (starId: string) => void;
  onReformStar?: (star: StarNode) => void;
  onDeleteStar?: (starId: string) => void;
  onStartChat?: (user: User) => void;
  onOpenCreateModalWithTag?: (tag: string) => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup', bannerMessage?: string) => void;
}

export const NebulaModal: React.FC<NebulaModalProps> = ({
  isOpen,
  tag,
  stars,
  currentUser,
  onClose,
  onSelectStar,
  onOpenAuthorProfile,
  onTagClick,
  onToggleLike,
  onToggleReignite,
  onTogglePin,
  onReformStar,
  onDeleteStar,
  onStartChat,
  onOpenCreateModalWithTag,
  onOpenAuthModal,
}) => {
  const [searchInner, setSearchInner] = useState('');
  const [filterMode, setFilterMode] = useState<'latest' | 'top' | 'media'>('latest');

  const normalizedTag = useMemo(() => {
    if (!tag) return '';
    return tag.trim().toLowerCase().replace(/^#+/, '');
  }, [tag]);

  // Find all stars that match this tag in tags, content, or title
  const matchingStars = useMemo(() => {
    if (!normalizedTag) return [];
    return stars.filter((s) => {
      const inTags = s.tags?.some((t) => t.toLowerCase().replace(/^#+/, '') === normalizedTag);
      const inTitle = s.title.toLowerCase().includes(`#${normalizedTag}`) || s.title.toLowerCase().includes(normalizedTag);
      const inContent = s.content.toLowerCase().includes(`#${normalizedTag}`);
      const inCluster = s.cluster.toLowerCase() === normalizedTag;
      const inGalaxy = s.galaxyName?.toLowerCase() === normalizedTag || s.universeName?.toLowerCase() === normalizedTag;
      return inTags || inTitle || inContent || inCluster || inGalaxy;
    });
  }, [stars, normalizedTag]);

  // Unique explorers in this Nebula
  const participantExplorers = useMemo(() => {
    const map = new Map<string, { name: string; handle: string; avatarUrl?: string }>();
    matchingStars.forEach((s) => {
      const key = s.author.handle || s.author.name;
      if (!map.has(key)) {
        map.set(key, {
          name: s.author.name,
          handle: s.author.handle || `@${s.author.name.toLowerCase().replace(/\s+/g, '')}`,
          avatarUrl: s.author.avatarUrl,
        });
      }
    });
    return Array.from(map.values());
  }, [matchingStars]);

  // Co-occurring tags
  const relatedTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    matchingStars.forEach((s) => {
      (s.tags || []).forEach((t) => {
        const clean = t.toLowerCase().replace(/^#+/, '');
        if (clean && clean !== normalizedTag) {
          tagCount.set(clean, (tagCount.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => `#${t}`);
  }, [matchingStars, normalizedTag]);

  // Filtered & Sorted Stars
  const displayStars = useMemo(() => {
    let list = [...matchingStars];

    if (searchInner.trim()) {
      const q = searchInner.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q) ||
          s.author.name.toLowerCase().includes(q)
      );
    }

    if (filterMode === 'top') {
      list.sort((a, b) => (b.likes?.length || 0) + (b.reigniteCount || 0) - ((a.likes?.length || 0) + (a.reigniteCount || 0)));
    } else if (filterMode === 'media') {
      list = list.filter((s) => Boolean(s.imageUrl));
    }

    return list;
  }, [matchingStars, searchInner, filterMode]);

  if (!isOpen || !tag) return null;

  return (
    <AnimatePresence>
      <div
        id="nebula-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#050914]/85 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          id="nebula-modal-container"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#07132c] border border-slate-200 dark:border-amber-300/30 rounded-3xl overflow-hidden z-10 text-slate-900 dark:text-slate-100 flex flex-col shadow-2xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)]"
        >
          {/* Top Cosmic Header */}
          <div className="relative p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border border-amber-400/40 text-amber-500 dark:text-amber-300 flex items-center justify-center text-2xl shrink-0 shadow-[0_0_20px_rgba(255,215,0,0.25)]">
                  🌫️
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      {TERMS.HASHTAG}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {matchingStars.length} Stars • {participantExplorers.length} Explorers
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                    #{normalizedTag}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenCreateModalWithTag && (
                  <button
                    type="button"
                    id="btn-nebula-create-star"
                    onClick={() => {
                      onOpenCreateModalWithTag(`#${normalizedTag}`);
                      onClose();
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ignite in #{normalizedTag}</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-close-nebula-modal"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Nebula"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Related Co-occurring Tags */}
            {relatedTags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  Related:
                </span>
                {relatedTags.map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => {
                      if (onTagClick) onTagClick(rt);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/80 dark:bg-white/[0.06] hover:bg-amber-100 dark:hover:bg-amber-400/20 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-200 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <Tag className="w-2.5 h-2.5 text-amber-500" />
                    <span>{rt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchInner}
                onChange={(e) => setSearchInner(e.target.value)}
                placeholder={`Search inside #${normalizedTag}...`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterMode('latest')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterMode === 'latest'
                    ? 'bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Latest
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('top')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterMode === 'top'
                    ? 'bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Top Glows
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('media')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterMode === 'media'
                    ? 'bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                Media
              </button>
            </div>
          </div>

          {/* Stars Feed List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar">
            {displayStars.length === 0 ? (
              <div
                id="nebula-empty-state"
                className="flex flex-col items-center justify-center py-16 px-4 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-500 flex items-center justify-center text-2xl mb-3 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                  🌫️
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {TERMS.NO_RESULTS}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-5">
                  No stars are currently shining under the <strong className="text-amber-600 dark:text-amber-300">#{normalizedTag}</strong> nebula. Be the pioneer to ignite one!
                </p>

                {onOpenCreateModalWithTag && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCreateModalWithTag(`#${normalizedTag}`);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{TERMS.CREATE_POST} in #{normalizedTag}</span>
                  </button>
                )}
              </div>
            ) : (
              displayStars.map((s) => (
                <StarCard
                  key={s.id}
                  star={s}
                  currentUser={currentUser}
                  onSelectStar={(clickedStar) => {
                    onSelectStar(clickedStar);
                    onClose();
                  }}
                  onToggleLike={onToggleLike}
                  onToggleReignite={onToggleReignite}
                  onTogglePin={onTogglePin}
                  onReformStar={onReformStar}
                  onDeleteStar={onDeleteStar}
                  onTagClick={(clickedTag) => {
                    if (onTagClick) onTagClick(clickedTag);
                  }}
                  onOpenAuthorProfile={onOpenAuthorProfile}
                  onStartChat={onStartChat}
                  onOpenAuthModal={onOpenAuthModal}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
