import React, { useRef } from 'react';
import { Plus, Sparkles, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { User, AuthorStoryGroup } from '../types';
import { LiveBroadcast } from '../types/broadcast';
import { TERMS } from '../constants/terminology';

interface StarStoriesBarProps {
  currentUser: User | null;
  storyGroups: AuthorStoryGroup[];
  liveBroadcasts?: LiveBroadcast[];
  onOpenStoryViewer: (authorIndex: number) => void;
  onOpenCreateStory: () => void;
  onOpenBroadcast?: (broadcastId: string) => void;
  onOpenGoLive?: () => void;
  onPromptAuth?: () => void;
}

export const StarStoriesBar: React.FC<StarStoriesBarProps> = ({
  currentUser,
  storyGroups,
  liveBroadcasts = [],
  onOpenStoryViewer,
  onOpenCreateStory,
  onOpenBroadcast,
  onOpenGoLive,
  onPromptAuth,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const activeBroadcasts = liveBroadcasts.filter((b) => b.isLive);

  const userStoryGroup = currentUser
    ? storyGroups.find((g) => g.authorId === currentUser.id)
    : null;

  const otherStoryGroups = storyGroups.filter(
    (g) => !currentUser || g.authorId !== currentUser.id
  );

  return (
    <div
      id="star-stories-bar-container"
      className="relative w-full py-2.5 px-3 sm:px-5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 select-none z-20"
    >
      <div className="max-w-7xl mx-auto flex items-center relative group">
        {/* Left Scroll Chevron */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden sm:flex absolute -left-2 z-20 p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/15 shadow-md hover:bg-amber-50 dark:hover:bg-slate-700 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Stories & Live Streams Horizontal List */}
        <div
          ref={scrollContainerRef}
          id="star-stories-scroll-list"
          className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Tile 0: Go Live Star 📡 Button */}
          {onOpenGoLive && (
            <div
              id="btn-quick-go-live-tile"
              onClick={() => {
                if (!currentUser) {
                  if (onPromptAuth) onPromptAuth();
                } else {
                  onOpenGoLive();
                }
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group/golive"
            >
              <div className="relative">
                <div className="w-[60px] h-[60px] sm:w-[64px] sm:h-[64px] rounded-full p-[2.5px] bg-gradient-to-tr from-rose-500 via-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(244,63,94,0.4)] group-hover/golive:shadow-[0_0_22px_rgba(244,63,94,0.7)] group-hover/golive:scale-105 transition-all duration-300 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-slate-950 border-2 border-white dark:border-slate-950 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-rose-400 group-hover/golive:text-amber-300 group-hover/golive:scale-110 transition-all duration-300 animate-pulse" />
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 border border-white dark:border-slate-950 text-[9px] font-black text-white shadow-xs">
                  LIVE
                </div>
              </div>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 max-w-[68px] truncate text-center leading-tight">
                Go Live 📡
              </span>
            </div>
          )}

          {/* Tile 1: Current Explorer Story / Add Story */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group/item">
            <div
              className="relative"
              onClick={() => {
                if (!currentUser) {
                  if (onPromptAuth) onPromptAuth();
                } else if (userStoryGroup) {
                  const idx = storyGroups.findIndex((g) => g.authorId === currentUser.id);
                  onOpenStoryViewer(idx >= 0 ? idx : 0);
                } else {
                  onOpenCreateStory();
                }
              }}
            >
              {/* Outer Glowing Ring */}
              <div
                className={`w-[60px] h-[60px] sm:w-[64px] sm:h-[64px] rounded-full p-[2.5px] transition-all duration-300 flex items-center justify-center ${
                  userStoryGroup
                    ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover/item:scale-105'
                    : 'bg-slate-200 dark:bg-white/10 group-hover/item:border-amber-400'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-white dark:border-slate-950 flex items-center justify-center relative">
                  <img
                    src={
                      currentUser?.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                    }
                    alt={currentUser?.displayName || 'Your Sky'}
                    className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
                  />
                  {!userStoryGroup && (
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Add Story (+) Badge */}
              <button
                type="button"
                id="btn-quick-add-star-story"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentUser) {
                    if (onPromptAuth) onPromptAuth();
                  } else {
                    onOpenCreateStory();
                  }
                }}
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-bold border-2 border-white dark:border-slate-950 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title={`Add ${TERMS.BIO}`}
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
              </button>
            </div>

            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 max-w-[68px] truncate text-center leading-tight">
              {currentUser ? 'Your Sky' : 'Add Story'}
            </span>
          </div>

          {/* Active Live Broadcasts */}
          {activeBroadcasts.map((broadcast) => (
            <div
              key={broadcast.id}
              id={`broadcast-item-${broadcast.id}`}
              onClick={() => onOpenBroadcast && onOpenBroadcast(broadcast.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group/live-stream"
            >
              <div className="relative">
                {/* Glowing Live Ring */}
                <div className="w-[60px] h-[60px] sm:w-[64px] sm:h-[64px] rounded-full p-[2.5px] bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 shadow-[0_0_18px_rgba(225,29,72,0.55)] group-hover/live-stream:shadow-[0_0_24px_rgba(225,29,72,0.85)] group-hover/live-stream:scale-105 transition-all duration-300 flex items-center justify-center">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 border-2 border-white dark:border-slate-950">
                    <img
                      src={broadcast.hostAvatar}
                      alt={broadcast.hostName}
                      className="w-full h-full object-cover group-hover/live-stream:scale-110 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Pulsing LIVE Pill Badge */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[8px] tracking-wider uppercase border border-white dark:border-slate-950 shadow-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>LIVE</span>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 max-w-[70px] truncate text-center leading-tight">
                {broadcast.hostName}
              </span>
            </div>
          ))}

          {/* Separator Line */}
          {(otherStoryGroups.length > 0 || activeBroadcasts.length > 0) && (
            <div className="h-10 w-[1px] bg-slate-200 dark:bg-white/10 shrink-0 mx-0.5" />
          )}

          {/* Tile 2+: Other Explorers' Stories */}
          {otherStoryGroups.map((group) => {
            const globalIndex = storyGroups.findIndex((g) => g.authorId === group.authorId);
            return (
              <div
                key={group.authorId}
                id={`story-group-avatar-${group.authorId}`}
                onClick={() => onOpenStoryViewer(globalIndex >= 0 ? globalIndex : 0)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group/story"
              >
                {/* Story Avatar with Cosmic Ring */}
                <div className="relative">
                  <div
                    className={`w-[60px] h-[60px] sm:w-[64px] sm:h-[64px] rounded-full p-[2.5px] transition-all duration-300 flex items-center justify-center ${
                      group.hasUnviewed
                        ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.35)] group-hover/story:shadow-[0_0_20px_rgba(245,158,11,0.55)] group-hover/story:scale-105'
                        : 'bg-slate-300 dark:bg-white/20 opacity-75 group-hover/story:opacity-100 group-hover/story:scale-105'
                    }`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-white dark:border-slate-950">
                      <img
                        src={group.authorAvatar}
                        alt={group.authorName}
                        className="w-full h-full object-cover group-hover/story:scale-110 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Unviewed Star Badge Indicator */}
                  {group.hasUnviewed && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[8px] text-slate-950 font-bold shadow-xs">
                      ✨
                    </div>
                  )}
                </div>

                {/* Author Star Name */}
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[68px] truncate text-center leading-tight group-hover/story:text-amber-600 dark:group-hover/story:text-amber-300 transition-colors">
                  {group.authorName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Scroll Chevron */}
        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden sm:flex absolute -right-2 z-20 p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/15 shadow-md hover:bg-amber-50 dark:hover:bg-slate-700 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
