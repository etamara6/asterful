import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  Users,
  Compass,
  Tag,
  Orbit,
  Check,
  ChevronRight,
  X,
  Plus,
  Flame,
} from 'lucide-react';
import { StarNode, User, Galaxy } from '../types';
import { getAllRegisteredUsers } from '../utils/userRegistry';
import { getStoredGalaxies, toggleJoinGalaxy, isUserMemberOfGalaxy } from '../utils/galaxyRegistry';
import { TERMS } from '../constants/terminology';
import logoImage from '../assets/images/logo.jpg';

interface DiscoverySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  stars: StarNode[];
  currentUser: User | null;
  onSelectTag: (tag: string) => void;
  onOpenGalaxies: (galaxyId?: string) => void;
  onOpenUserProfile: (user: User) => void;
  onToggleFollow: (user: User) => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup', bannerMessage?: string) => void;
}

export const DiscoverySidebar: React.FC<DiscoverySidebarProps> = ({
  isOpen,
  onClose,
  stars,
  currentUser,
  onSelectTag,
  onOpenGalaxies,
  onOpenUserProfile,
  onToggleFollow,
  onOpenAuthModal,
}) => {
  const [justFollowedIds, setJustFollowedIds] = useState<string[]>([]);
  const [galaxies, setGalaxies] = useState<Galaxy[]>(() => getStoredGalaxies());

  // 1. Dynamic Brightest Nebulas (Trending Hashtags derived strictly from actual stars)
  const brightestNebulas = useMemo(() => {
    const counts = new Map<string, number>();

    stars.forEach((s) => {
      // Tags array
      (s.tags || []).forEach((t) => {
        const clean = t.trim().toLowerCase().replace(/^#+/, '');
        if (clean && clean.length > 1) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      });

      // Regex parse hashtags inside content
      const regex = /(#[a-zA-Z0-9_\u0080-\uFFFF]+)/g;
      const matches = s.content.match(regex);
      if (matches) {
        matches.forEach((m) => {
          const clean = m.trim().toLowerCase().replace(/^#+/, '');
          if (clean && clean.length > 1) {
            counts.set(clean, (counts.get(clean) || 0) + 1);
          }
        });
      }
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([rawTag, count], idx) => ({
        rank: idx + 1,
        tag: `#${rawTag}`,
        cleanTag: rawTag,
        count,
      }));
  }, [stars]);

  // 2. Potential Orbits 🪐 (Recommended Stargazers to follow)
  const potentialOrbits = useMemo(() => {
    const allUsers = getAllRegisteredUsers();
    const myFollowing = new Set(currentUser?.following || []);
    const myId = currentUser?.id || '';

    // Filter out self, guests, and already followed users, plus locally just-followed
    return allUsers
      .filter((u) => {
        if (u.id === myId || u.isGuest) return false;
        if (myFollowing.has(u.id)) return false;
        if (justFollowedIds.includes(u.id)) return false;
        return true;
      })
      .slice(0, 4);
  }, [currentUser, justFollowedIds]);

  const handleEnterOrbit = (targetUser: User, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to enter orbit with fellow cosmic creators.');
      }
      return;
    }

    setJustFollowedIds((prev) => [...prev, targetUser.id]);
    onToggleFollow(targetUser);
  };

  const handleToggleGalaxyJoin = (galaxy: Galaxy, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to join Galaxy topic communities.');
      }
      return;
    }
    const updated = toggleJoinGalaxy(galaxy.id, currentUser.id);
    setGalaxies(updated);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="discovery-sidebar-overlay"
        className="fixed inset-0 z-40 flex justify-end overflow-hidden"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#050914]/60 backdrop-blur-xs"
        />

        {/* Sidebar Panel */}
        <motion.aside
          id="discovery-sidebar-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-sm h-full bg-white/95 dark:bg-[#07132c]/95 border-l border-slate-200 dark:border-amber-300/20 z-50 flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <img
                src={logoImage}
                alt="Asterful Logo"
                className="h-9 w-9 rounded-full object-cover border border-purple-500/30 overflow-hidden"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Asterful</span>
                  <span className="text-slate-400 font-normal">·</span>
                  <span>{TERMS.EXPLORE}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nebulas, Topic Hubs & Stargazers
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-discovery-sidebar"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {/* SECTION 1: Brightest Nebulas 🌫️✨ (Trending Hashtags) */}
            <div id="section-brightest-nebulas" className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Brightest Nebulas 🌫️✨</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Trending Tags</span>
              </div>

              {brightestNebulas.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p>🌫️ No active nebulas yet.</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Ignite stars with hashtags to form new nebulas.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {brightestNebulas.map((item) => (
                    <button
                      key={item.tag}
                      id={`trending-nebula-tag-${item.cleanTag}`}
                      type="button"
                      onClick={() => {
                        onSelectTag(item.tag);
                        onClose();
                      }}
                      className="w-full group flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-amber-100 dark:hover:bg-amber-400/15 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-900 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                          #{item.rank}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-300 truncate">
                            {item.tag}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {item.count} Active Star{item.count === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: Potential Orbits 🪐 (Suggested Connections) */}
            <div id="section-potential-orbits" className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                  <Orbit className="w-3.5 h-3.5 text-purple-500" />
                  <span>Potential Orbits 🪐</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Recommended</span>
              </div>

              {potentialOrbits.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-center text-xs text-slate-500">
                  <span>🪐 You are orbiting with all recommended explorers!</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {potentialOrbits.map((user) => (
                    <div
                      key={user.id}
                      id={`potential-orbit-user-${user.id}`}
                      onClick={() => {
                        onOpenUserProfile(user);
                        onClose();
                      }}
                      className="group p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-purple-500/10 border border-slate-200 dark:border-white/10 hover:border-purple-400/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-amber-300/40 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                              {user.displayName.charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500">
                              {user.displayName}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              @{user.handle?.replace(/^@/, '') || user.username}
                            </p>
                          </div>
                        </div>

                        {/* Enter Orbit 🪐 Action Button */}
                        <button
                          type="button"
                          id={`btn-enter-orbit-${user.id}`}
                          onClick={(e) => handleEnterOrbit(user, e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:scale-105 active:scale-95 transition-all shadow-xs border border-amber-300 cursor-pointer shrink-0"
                          title="Enter Orbit 🪐"
                        >
                          <Orbit className="w-3 h-3 text-slate-950" />
                          <span>{TERMS.FOLLOW}</span>
                        </button>
                      </div>

                      {user.bio && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-1 italic">
                          "{user.bio}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 3: Galaxies 🌌 (Topic Hubs Quick Access) */}
            <div id="section-featured-galaxies" className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-300">
                  <Compass className="w-3.5 h-3.5 text-teal-500" />
                  <span>Galaxies 🌌</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenGalaxies();
                    onClose();
                  }}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer"
                >
                  View All Hubs
                </button>
              </div>

              <div className="space-y-2">
                {galaxies.slice(0, 4).map((g) => {
                  const isMember = isUserMemberOfGalaxy(g, currentUser?.id);
                  return (
                    <div
                      key={g.id}
                      id={`sidebar-galaxy-${g.id}`}
                      onClick={() => {
                        onOpenGalaxies(g.id);
                        onClose();
                      }}
                      className="group p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-teal-500/10 border border-slate-200 dark:border-white/10 hover:border-teal-400/40 transition-all flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{g.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-500 dark:group-hover:text-teal-300 truncate">
                            {g.name}
                          </p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-300">
                            {g.tag}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleToggleGalaxyJoin(g, e)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                          isMember
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-amber-400/20'
                        }`}
                      >
                        {isMember ? 'In Galaxy' : '+ Join'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
};
