import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Heart,
  Clock,
  User as UserIcon,
  LogIn,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Flag
} from 'lucide-react';
import { StarNode, Glowback, User } from '../types';
import { getStarGlowbacks, getStarGlowbackCount, isGlowbackGlowingByUser, formatGlowbackTime } from '../utils/glowbackHelper';
import { getUserForAuthor, generateCleanHandle } from '../utils/userRegistry';
import { ReportModal } from './ReportModal';
import { TERMS } from '../constants/terminology';

interface GlowbackSectionProps {
  star: StarNode;
  currentUser: User | null;
  onAddGlowback: (starId: string, text: string) => void;
  onToggleGlowbackGlow: (starId: string, glowbackId: string) => void;
  onOpenUserProfile?: (user: User) => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup', bannerMessage?: string) => void;
  inline?: boolean;
  autoFocus?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

export const GlowbackSection: React.FC<GlowbackSectionProps> = ({
  star,
  currentUser,
  onAddGlowback,
  onToggleGlowbackGlow,
  onOpenUserProfile,
  onOpenAuthModal,
  inline = false,
  autoFocus = false,
  className = '',
  defaultExpanded = true,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [reportingGlowback, setReportingGlowback] = useState<Glowback | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const glowbacks = getStarGlowbacks(star);
  const glowbackCount = getStarGlowbackCount(star);

  // Auto-resize textarea height as text changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [commentText]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || isSubmitting) return;

    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to send a Glowback to this star.');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      onAddGlowback(star.id, trimmed);
      setCommentText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAuthorClick = (authorId: string, authorName: string) => {
    if (onOpenUserProfile) {
      const resolved = getUserForAuthor({ name: authorName, handle: authorName }, authorId);
      if (resolved) {
        onOpenUserProfile(resolved);
      }
    }
  };

  const userAvatar = currentUser?.avatarUrl;
  const userDisplayName = currentUser?.displayName || currentUser?.username || 'Explorer';

  return (
    <div
      id={`glowback-section-${star.id}`}
      className={`rounded-2xl transition-all duration-200 ${
        inline
          ? 'bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 p-3.5 sm:p-4'
          : 'bg-transparent'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">💫</span>
          <h3 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>Glowbacks</span>
            <span
              id={`glowback-count-badge-${star.id}`}
              className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-500/15 dark:bg-amber-400/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 dark:border-amber-300/30"
            >
              {glowbackCount}
            </span>
          </h3>
        </div>

        {inline && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title={isExpanded ? 'Collapse Glowbacks' : 'Expand Glowbacks'}
          >
            <span className="text-[11px] hidden xs:inline">{isExpanded ? 'Hide' : 'Show'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3.5 overflow-hidden"
          >
            {/* Input Box */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-amber-300/20 focus-within:border-amber-400 dark:focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all shadow-xs">
                {/* User Avatar */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 border border-amber-400/40 dark:border-amber-300/40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-300">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userDisplayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </div>

                {/* Text Area & Actions */}
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={textareaRef}
                    id={`glowback-input-${star.id}`}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Radiate a cosmic thought or reflection... 💫"
                    rows={1}
                    className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-hidden leading-relaxed custom-scrollbar py-1 max-h-[160px]"
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06] mt-1.5 gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                      Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[9px] font-mono">⌘+Enter</kbd> to radiate
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 sm:hidden">
                      {commentText.length > 0 ? `${commentText.length} chars` : 'Radiate response'}
                    </span>

                    <button
                      type="submit"
                      id={`btn-send-glowback-${star.id}`}
                      disabled={!commentText.trim() || isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:to-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                      <Send className="w-3 h-3 text-slate-950" />
                      <span>Send Glowback 💫</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Guest banner if user is not authenticated */}
              {currentUser?.isGuest && (
                <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/[0.07] border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
                  <span>Guest mode: Sign in to ignite public Glowbacks with your profile.</span>
                  {onOpenAuthModal && (
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signin', 'Sign in to send Glowbacks')}
                      className="font-bold underline ml-2 shrink-0 hover:text-amber-600"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}
            </form>

            {/* List of Existing Glowbacks */}
            <div className="space-y-2.5">
              {glowbacks.length === 0 ? (
                <div
                  id={`glowback-empty-${star.id}`}
                  className="py-5 px-3 text-center rounded-xl bg-white/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10"
                >
                  <Sparkles className="w-5 h-5 text-amber-500/60 dark:text-amber-400/60 mx-auto mb-1.5 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No Glowbacks yet
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Be the first to radiate a response across this universe! 💫
                  </p>
                </div>
              ) : (
                glowbacks.map((gb) => {
                  const isGlowing = isGlowbackGlowingByUser(gb, currentUser?.id);
                  const cleanHandle = generateCleanHandle(gb.authorName);

                  return (
                    <motion.div
                      key={gb.id}
                      id={`glowback-item-${gb.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group/item relative p-3 rounded-xl bg-white/90 dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.07] border border-slate-200 dark:border-white/[0.08] transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        {/* Author info */}
                        <div
                          className="flex items-center gap-2 min-w-0 cursor-pointer"
                          onClick={() => handleAuthorClick(gb.authorId, gb.authorName)}
                        >
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-amber-400/30 dark:border-amber-300/30 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                            {gb.authorAvatar ? (
                              <img
                                src={gb.authorAvatar}
                                alt={gb.authorName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <UserIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-300 transition-colors truncate">
                                {gb.authorName}
                              </span>
                              <span className="text-[10px] text-amber-700 dark:text-amber-300/80 font-medium truncate">
                                @{cleanHandle}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatGlowbackTime(gb.timestamp)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Flag Glowback Button */}
                          {currentUser && gb.authorId !== currentUser.id && (
                            <button
                              type="button"
                              id={`btn-glowback-flag-${gb.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setReportingGlowback(gb);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title={TERMS.REPORT_COMMENT}
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          )}

                          {/* Mini Glow Action Button */}
                          <button
                            type="button"
                            id={`btn-glowback-glow-${gb.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleGlowbackGlow(star.id, gb.id);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                              isGlowing
                                ? 'bg-amber-100 dark:bg-amber-500/25 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-400/50 shadow-xs'
                                : 'bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10'
                            }`}
                            title={isGlowing ? '✨ Glowing' : '✨ Glow this response'}
                          >
                            <span>{isGlowing ? '✨ Glowing' : '✨ Glow'}</span>
                            {gb.glowCount > 0 && (
                              <span className="text-[10px] opacity-80">({gb.glowCount})</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Comment text body */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-2 pl-8 whitespace-pre-wrap">
                        {gb.text}
                      </p>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flag Glowback Modal */}
      {reportingGlowback && (
        <ReportModal
          isOpen={Boolean(reportingGlowback)}
          onClose={() => setReportingGlowback(null)}
          currentUser={currentUser}
          targetType="glowback"
          targetId={reportingGlowback.id}
          targetTitle={`Glowback on "${star.title}"`}
          targetSnippet={reportingGlowback.text}
          authorId={reportingGlowback.authorId}
          authorName={reportingGlowback.authorName}
          authorHandle={generateCleanHandle(reportingGlowback.authorName)}
          onOpenAuthModal={onOpenAuthModal}
        />
      )}
    </div>
  );
};
