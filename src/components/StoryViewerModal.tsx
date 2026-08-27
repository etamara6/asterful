import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Sparkles,
  Heart,
  Flame,
  Rocket,
  Star,
  Globe,
  Users,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';
import { User, AuthorStoryGroup, StarStory } from '../types';
import { TERMS } from '../constants/terminology';
import { getAllRegisteredUsers } from '../utils/userRegistry';

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AuthorStoryGroup[];
  initialAuthorIndex?: number;
  currentUser: User | null;
  onDeleteStory?: (storyId: string) => void;
  onSendSignalReply?: (author: User, text: string) => void;
  onMarkAsViewed: (storyId: string) => void;
  onOpenProfile?: (user: User) => void;
}

const STORY_DURATION_MS = 5000; // 5 seconds per story

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  groups,
  initialAuthorIndex = 0,
  currentUser,
  onDeleteStory,
  onSendSignalReply,
  onMarkAsViewed,
  onOpenProfile,
}) => {
  const [authorIndex, setAuthorIndex] = useState(initialAuthorIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [reactionFeedback, setReactionFeedback] = useState<string | null>(null);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number>(0);

  // Sync author index when initialAuthorIndex changes upon opening
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.max(0, Math.min(initialAuthorIndex, groups.length - 1));
      setAuthorIndex(validIndex);
      setStoryIndex(0);
      setProgress(0);
      setIsPaused(false);
      setShowViewersModal(false);
      setConfirmDeleteId(null);
      setReplyText('');
    }
  }, [isOpen, initialAuthorIndex, groups.length]);

  const currentGroup = groups[authorIndex];
  const currentStory: StarStory | undefined = currentGroup?.stories[storyIndex];
  const isOwnStory = !!(currentUser && currentStory && currentStory.authorId === currentUser.id);

  // Mark current story as viewed
  useEffect(() => {
    if (isOpen && currentStory && currentUser) {
      onMarkAsViewed(currentStory.id);
    }
  }, [isOpen, currentStory, currentUser, onMarkAsViewed]);

  // Navigate to next story or next author
  const goToNextStory = useCallback(() => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
      startTimeRef.current = null;
      pausedAtRef.current = 0;
    } else if (authorIndex < groups.length - 1) {
      setAuthorIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
      startTimeRef.current = null;
      pausedAtRef.current = 0;
    } else {
      onClose();
    }
  }, [currentGroup, storyIndex, authorIndex, groups.length, onClose]);

  // Navigate to previous story or previous author
  const goToPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
      startTimeRef.current = null;
      pausedAtRef.current = 0;
    } else if (authorIndex > 0) {
      const prevAuthorIdx = authorIndex - 1;
      const prevGroup = groups[prevAuthorIdx];
      setAuthorIndex(prevAuthorIdx);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
      startTimeRef.current = null;
      pausedAtRef.current = 0;
    }
  }, [storyIndex, authorIndex, groups]);

  // Progress Timer Animation
  useEffect(() => {
    if (!isOpen || isPaused || showViewersModal || confirmDeleteId || !currentStory) {
      return;
    }

    let animationId: number = 0;
    const FRAME_MIN_TIME = 1000 / 60;
    let lastTickTime = performance.now();

    const tick = (timestamp: number) => {
      if (document.hidden) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const delta = timestamp - lastTickTime;
      if (delta < FRAME_MIN_TIME) {
        animationId = requestAnimationFrame(tick);
        return;
      }
      lastTickTime = timestamp - (delta % FRAME_MIN_TIME);

      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - (pausedAtRef.current || 0);
      }

      const elapsed = timestamp - startTimeRef.current;
      const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        goToNextStory();
      } else {
        animationId = requestAnimationFrame(tick);
      }
    };

    animationId = requestAnimationFrame(tick);
    animationFrameRef.current = animationId;

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isOpen, isPaused, showViewersModal, confirmDeleteId, currentStory, storyIndex, authorIndex, goToNextStory]);

  const handlePause = () => {
    if (!isPaused) {
      setIsPaused(true);
      if (startTimeRef.current) {
        pausedAtRef.current = (progress / 100) * STORY_DURATION_MS;
      }
    }
  };

  const handleResume = () => {
    if (isPaused && !showViewersModal && !confirmDeleteId) {
      setIsPaused(false);
      startTimeRef.current = null;
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goToNextStory();
      } else if (e.key === 'ArrowLeft') {
        goToPrevStory();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNextStory, goToPrevStory, onClose]);

  if (!isOpen || !currentGroup || !currentStory) return null;

  const handleSendReaction = (emoji: string) => {
    setReactionFeedback(emoji);
    setTimeout(() => setReactionFeedback(null), 1400);

    if (onSendSignalReply) {
      const allUsers = getAllRegisteredUsers();
      const targetUser = allUsers.find((u) => u.id === currentStory.authorId) || {
        id: currentStory.authorId,
        displayName: currentStory.authorName,
        email: '',
        handle: currentStory.authorName.toLowerCase().replace(/\s+/g, '_'),
      };
      onSendSignalReply(targetUser, `Reacted ${emoji} to your ${TERMS.BIO}!`);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    if (onSendSignalReply) {
      const allUsers = getAllRegisteredUsers();
      const targetUser = allUsers.find((u) => u.id === currentStory.authorId) || {
        id: currentStory.authorId,
        displayName: currentStory.authorName,
        email: '',
        handle: currentStory.authorName.toLowerCase().replace(/\s+/g, '_'),
      };
      onSendSignalReply(targetUser, `💬 Echoed on your ${TERMS.BIO}: "${replyText.trim()}"`);
    }

    setReactionFeedback('✨ Signal Sent');
    setReplyText('');
    setTimeout(() => setReactionFeedback(null), 1400);
  };

  const calculateTimeAgo = (isoString: string) => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(elapsed / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return '1d ago';
  };

  // Find users who viewed the story
  const allExplorers = getAllRegisteredUsers();
  const storyViewerUsers = currentStory.viewers.map((viewerId) => {
    return (
      allExplorers.find((u) => u.id === viewerId) || {
        id: viewerId,
        displayName: 'Explorer',
        email: '',
        handle: 'stargazer',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50',
      }
    );
  });

  return (
    <AnimatePresence>
      <div
        id="story-viewer-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg select-none"
        onClick={onClose}
      >
        {/* Navigation Arrow: Previous Author */}
        {authorIndex > 0 && (
          <button
            type="button"
            id="btn-prev-author"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevStory();
            }}
            className="hidden md:flex absolute left-4 lg:left-8 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Navigation Arrow: Next Author */}
        {authorIndex < groups.length - 1 && (
          <button
            type="button"
            id="btn-next-author"
            onClick={(e) => {
              e.stopPropagation();
              goToNextStory();
            }}
            className="hidden md:flex absolute right-4 lg:right-8 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95"
            aria-label="Next story"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Story Card Frame (Vertical 9:16 Aspect Ratio) */}
        <motion.div
          id="story-viewer-card"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-[420px] h-[92vh] max-h-[820px] bg-slate-950 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.25)] border border-white/15 flex flex-col justify-between"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handlePause}
          onMouseUp={handleResume}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
        >
          {/* TOP SECTION: Progress Bar Segments */}
          <div className="absolute top-0 left-0 right-0 z-30 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex flex-col gap-2.5 pointer-events-auto">
            {/* Progress Segment Bars */}
            <div className="flex items-center gap-1.5 w-full">
              {currentGroup.stories.map((s, idx) => {
                let fillPercent = 0;
                if (idx < storyIndex) fillPercent = 100;
                else if (idx === storyIndex) fillPercent = progress;

                return (
                  <div
                    key={s.id}
                    className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden relative"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full transition-all duration-75"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Author Header Bar */}
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => {
                  if (onOpenProfile) {
                    const allUsers = getAllRegisteredUsers();
                    const authorObj = allUsers.find((u) => u.id === currentGroup.authorId);
                    if (authorObj) {
                      onClose();
                      onOpenProfile(authorObj);
                    }
                  }
                }}
              >
                <div className="relative">
                  <img
                    src={currentGroup.authorAvatar}
                    alt={currentGroup.authorName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400 shadow-md"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center text-[7px] text-slate-950 font-bold">
                    ✨
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors drop-shadow-sm truncate max-w-[140px]">
                      {currentGroup.authorName}
                    </span>
                    <span className="text-[10px] text-white/75 drop-shadow-sm">
                      • {calculateTimeAgo(currentStory.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {currentStory.privacy === 'PUBLIC' ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-300/90 font-medium">
                        <Globe className="w-2.5 h-2.5" />
                        <span>{TERMS.PUBLIC_ACCOUNT}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-300/90 font-medium">
                        <Users className="w-2.5 h-2.5" />
                        <span>{TERMS.FRIEND}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls (Play/Pause, Sound, Delete, Close) */}
              <div className="flex items-center gap-1.5">
                {currentStory.mediaType === 'video' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(!isPaused);
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>

                {isOwnStory && (
                  <button
                    type="button"
                    id="btn-delete-own-story"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(currentStory.id);
                      setIsPaused(true);
                    }}
                    className="p-1.5 rounded-full bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 border border-rose-500/40 backdrop-blur-xs transition-all cursor-pointer"
                    title={TERMS.DELETE_POST}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  id="btn-close-story-viewer"
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer"
                  aria-label="Close story"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* STORY MEDIA DISPLAY (Full Background) */}
          <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
            {currentStory.mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={isMuted}
                playsInline
              />
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt="Star Story Media"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}

            {/* Click Navigation Zones */}
            <div
              className="absolute left-0 top-16 bottom-24 w-1/3 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevStory();
              }}
              title="Previous Story"
            />
            <div
              className="absolute right-0 top-16 bottom-24 w-2/3 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                goToNextStory();
              }}
              title="Next Story"
            />

            {/* Floating Animated Reaction Badge */}
            <AnimatePresence>
              {reactionFeedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1.3, y: -40 }}
                  exit={{ opacity: 0, scale: 1.5, y: -80 }}
                  className="absolute z-40 px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md text-amber-300 text-2xl font-bold border border-amber-400/40 shadow-2xl flex items-center gap-2"
                >
                  <span>{reactionFeedback}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BOTTOM SECTION: Caption, Star Gazes 👀, Quick Reactions / Signal Reply */}
          <div className="relative z-30 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3 pointer-events-auto">
            {/* Story Caption */}
            {currentStory.caption && (
              <div className="p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white/95 leading-relaxed shadow-lg">
                <span className="font-semibold text-amber-300 mr-1.5">{TERMS.POST}:</span>
                {currentStory.caption}
              </div>
            )}

            {/* Own Story: Star Gazes 👀 Viewer Count Bar */}
            {isOwnStory ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md">
                <button
                  type="button"
                  id="btn-view-story-gazes"
                  onClick={() => {
                    setShowViewersModal(true);
                    setIsPaused(true);
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-amber-200 hover:text-amber-100 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>
                    {currentStory.viewers.length} {TERMS.VIEWS}
                  </span>
                </button>

                <div className="flex -space-x-1.5 overflow-hidden">
                  {storyViewerUsers.slice(0, 4).map((viewer, idx) => (
                    <img
                      key={idx}
                      src={viewer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                      alt={viewer.displayName}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-300"
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Other User's Story: Quick Glowing Reactions & Reply */
              <div className="space-y-2">
                {/* Quick Cosmic Reaction Buttons */}
                <div className="flex items-center justify-center gap-2">
                  {[
                    { emoji: '✨', label: 'Glow' },
                    { emoji: '💫', label: 'Echo' },
                    { emoji: '🌟', label: 'Star' },
                    { emoji: '🔥', label: 'Supernova' },
                    { emoji: '💖', label: 'Heart' },
                    { emoji: '🚀', label: 'Orbit' },
                  ].map(({ emoji, label }) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-amber-400/20 hover:scale-125 active:scale-95 text-base transition-all cursor-pointer backdrop-blur-xs border border-white/10"
                      title={label}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Reply Signal Input */}
                <form onSubmit={handleSendReply} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    id="input-story-reply-signal"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={handlePause}
                    onBlur={handleResume}
                    placeholder={`${TERMS.SEND_MESSAGE} to @${currentGroup.authorName}...`}
                    className="flex-1 bg-white/10 border border-white/20 focus:border-amber-400 focus:bg-white/20 text-white placeholder-white/50 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none backdrop-blur-md transition-all"
                  />
                  <button
                    type="submit"
                    id="btn-send-story-signal"
                    disabled={!replyText.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold transition-all disabled:opacity-40 cursor-pointer active:scale-95 shadow-md shrink-0"
                    title={TERMS.SEND_MESSAGE}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* POPUP: Star Gazes 👀 Viewers List Modal */}
          <AnimatePresence>
            {showViewersModal && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="absolute inset-x-0 bottom-0 top-24 z-40 bg-slate-900/95 backdrop-blur-xl rounded-t-3xl border-t border-amber-500/30 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span>
                        {currentStory.viewers.length} {TERMS.VIEWS}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowViewersModal(false);
                        setIsPaused(false);
                      }}
                      className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                    {storyViewerUsers.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-8">
                        No explorers have gazed at this star yet.
                      </p>
                    ) : (
                      storyViewerUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                              alt={user.displayName}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-300"
                            />
                            <div>
                              <span className="text-xs font-semibold text-white block">
                                {user.displayName}
                              </span>
                              <span className="text-[10px] text-amber-300/80">
                                @{user.handle || user.displayName.toLowerCase()}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400">Gazed 👀</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowViewersModal(false);
                    setIsPaused(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-all"
                >
                  Return to Star Story
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* POPUP: Confirm Delete Story */}
          <AnimatePresence>
            {confirmDeleteId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-6 z-50 m-auto h-fit bg-slate-900 border border-rose-500/40 rounded-2xl p-5 shadow-2xl text-center space-y-4"
              >
                <div className="p-3 w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{TERMS.DELETE_POST}?</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    This Star Story will immediately collapse and fade from the cosmos.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setIsPaused(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                  >
                    Keep Star
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteStory && confirmDeleteId) {
                        onDeleteStory(confirmDeleteId);
                        setConfirmDeleteId(null);
                        goToNextStory();
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg cursor-pointer"
                  >
                    {TERMS.DELETE_POST}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
