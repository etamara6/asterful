import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Star,
  Users,
  Sparkles,
  Globe,
  Key,
  Heart,
  Orbit,
  ArrowRight,
  UserPlus,
  Check,
  Tag,
  Compass,
} from 'lucide-react';
import { StarNode, StarCluster, User } from '../types';
import { getAllRegisteredUsers, generateCleanHandle } from '../utils/userRegistry';
import { getClusterTheme, getDefaultUniverseGlow } from '../utils/colorPalette';
import { isStarLikedByUser, getStarLikesCount } from '../utils/likesHelper';
import { getStoredUniverses } from '../utils/universeRegistry';
import { subscribeGlobalUsers } from '../services/cloudDatabase';
import { db, getFirebaseFirestore, collection, onSnapshot, getDocs } from '../services/firebase';
import { AuthMode } from './AuthModal';
import { TERMS } from '../constants/terminology';

export type SearchCategory = 'all' | 'stars' | 'users' | 'universes';

interface UniverseItem {
  id: string;
  name: string;
  clusterKey?: StarCluster;
  description: string;
  isSharedSpace?: boolean;
  isPrivateSpace?: boolean;
  memberCount: number;
  starCount: number;
  glowColor: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stars: StarNode[];
  allUsers?: User[];
  currentUser: User | null;
  initialQuery?: string;
  initialCategory?: SearchCategory;
  onSelectStar: (star: StarNode) => void;
  onOpenUserProfile: (user: User) => void;
  onSelectUniverse: (cluster: StarCluster | 'All' | 'shared' | 'private') => void;
  onToggleLike?: (starId: string) => void;
  onToggleFollow?: (targetUser: User) => void;
  onOpenAuthModal?: (mode: AuthMode, bannerMessage?: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  stars,
  allUsers: initialUsersProp,
  currentUser,
  initialQuery = '',
  initialCategory = 'all',
  onSelectStar,
  onOpenUserProfile,
  onSelectUniverse,
  onToggleLike,
  onToggleFollow,
  onOpenAuthModal,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchCategory>(initialCategory);
  const [hoveredFollowId, setHoveredFollowId] = useState<string | null>(null);
  const [liveUsers, setLiveUsers] = useState<User[]>(() => initialUsersProp || getAllRegisteredUsers());
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setActiveTab(initialCategory);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery, initialCategory]);

  // Sync when prop updates
  useEffect(() => {
    if (initialUsersProp && initialUsersProp.length > 0) {
      setLiveUsers(initialUsersProp);
    }
  }, [initialUsersProp]);

  // Real-time Global Users Listener & Query on Open
  useEffect(() => {
    if (!isOpen) return;

    // 1. Subscribe to real-time users updates via cloudDatabase service
    const unsubscribe = subscribeGlobalUsers((updated) => {
      if (Array.isArray(updated)) {
        setLiveUsers(updated);
      }
    });

    // 2. Direct query & real-time snapshot to global Firestore 'users' collection
    const firestoreDb = db || getFirebaseFirestore();
    let unsubscribeSnap: (() => void) | null = null;
    if (firestoreDb) {
      try {
        console.log('[Firebase] [SearchModal] Querying global "users" collection in Firestore...');
        const usersCol = collection(firestoreDb, 'users');

        // Immediate one-time fetch
        getDocs(usersCol)
          .then((snap) => {
            const fetched: User[] = [];
            snap.forEach((d) => {
              const u = d.data() as User;
              if (u && (u.id || d.id) && !u.isGuest) {
                fetched.push({ ...u, id: u.id || d.id });
              }
            });
            console.log(`[Firebase] [SearchModal] getDocs returned ${fetched.length} users from "users" collection.`);
            if (fetched.length > 0) {
              setLiveUsers((prev) => {
                const map = new Map<string, User>();
                prev.forEach((item) => map.set(item.id, item));
                fetched.forEach((item) => map.set(item.id, item));
                return Array.from(map.values());
              });
            }
          })
          .catch((err) => {
            console.error('[Firebase] [SearchModal] getDocs error on "users" collection:', err);
          });

        // Real-time onSnapshot listener
        unsubscribeSnap = onSnapshot(
          usersCol,
          (snap) => {
            const fetched: User[] = [];
            snap.forEach((d) => {
              const u = d.data() as User;
              if (u && (u.id || d.id) && !u.isGuest) {
                fetched.push({ ...u, id: u.id || d.id });
              }
            });
            console.log(`[Firebase] [SearchModal] onSnapshot received ${fetched.length} users.`);
            if (fetched.length > 0) {
              setLiveUsers(fetched);
            }
          },
          (err) => {
            console.error('[Firebase] [SearchModal] onSnapshot listener error on "users" collection:', err);
          }
        );
      } catch (err) {
        console.error('[Firebase] [SearchModal] Firestore setup error:', err);
      }
    } else {
      console.warn('[Firebase] [SearchModal] Firestore instance is not initialized. Using local users cache.');
    }

    return () => {
      unsubscribe();
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 1. SOURCED USERS (Strictly dynamic from live cloud database + registered users)
  const allUsers = useMemo(() => {
    const usersMap = new Map<string, User>();
    liveUsers.forEach((u) => {
      if (u && u.id && !u.isGuest) usersMap.set(u.id, u);
    });
    const fromRegistry = getAllRegisteredUsers();
    fromRegistry.forEach((u) => {
      if (u && u.id && !u.isGuest && !usersMap.has(u.id)) {
        usersMap.set(u.id, u);
      }
    });
    return Array.from(usersMap.values());
  }, [liveUsers]);

  // 2. SOURCED UNIVERSES (Strictly dynamic from custom universes and actual stars)
  const allUniverses: UniverseItem[] = useMemo(() => {
    const list: UniverseItem[] = [];

    // Add user-created / stored custom universes from registry or localStorage
    try {
      const rawStored = localStorage.getItem('constellation_universes_v1') || localStorage.getItem('asterful_universes');
      const storedUniverses = rawStored ? JSON.parse(rawStored) : getStoredUniverses();
      if (Array.isArray(storedUniverses)) {
        storedUniverses.forEach((u: any) => {
          if (!u || !u.name) return;
          const uStars = stars.filter(
            (s) =>
              (s.universeName && s.universeName.toLowerCase() === u.name.toLowerCase()) ||
              (s.universes && s.universes.some((un) => un && un.toLowerCase() === u.name.toLowerCase()))
          );
          list.push({
            id: u.id || `univ-${u.name}`,
            name: `🪐 ${u.name}`,
            clusterKey: u.name as any,
            description: u.description || (u.isPrivate
              ? 'Private custom universe created by stargazer.'
              : 'Collaborative shared universe with custom orbit.'),
            isSharedSpace: !u.isPrivate,
            isPrivateSpace: u.isPrivate,
            memberCount: Math.max(u.memberIds?.length || 1, 1),
            starCount: uStars.length,
            glowColor: u.glowColor || getDefaultUniverseGlow(u.name),
          });
        });
      }
    } catch {
      // ignore
    }

    return list;
  }, [stars]);

  // 3. FILTERING LOGIC
  const cleanQ = query.trim().toLowerCase();

  // Filter Stars: by title, content, #tags
  const filteredStars = useMemo(() => {
    if (!cleanQ) return stars;
    return stars.filter((s) => {
      const matchTitle = s.title.toLowerCase().includes(cleanQ);
      const matchContent = s.content.toLowerCase().includes(cleanQ);
      const matchTags = s.tags.some((t) => t.toLowerCase().includes(cleanQ) || t.replace('#', '').toLowerCase().includes(cleanQ));
      const matchAuthor = s.author.name.toLowerCase().includes(cleanQ) || (s.author.handle && s.author.handle.toLowerCase().includes(cleanQ));
      const matchCluster = s.cluster.toLowerCase().includes(cleanQ);
      const matchUniverse = Boolean(
        (s.universeName && s.universeName.toLowerCase().includes(cleanQ)) ||
        (s.universes && s.universes.some((u) => u && u.toLowerCase().includes(cleanQ)))
      );
      return matchTitle || matchContent || matchTags || matchAuthor || matchCluster || matchUniverse;
    });
  }, [stars, cleanQ]);

  // Filter Users: by displayName and @username / handle
  const filteredUsers = useMemo(() => {
    if (!cleanQ) return allUsers;
    return allUsers.filter((u) => {
      const name = (u.displayName || u.username || '').toLowerCase();
      const handle = (u.username || u.handle || '').toLowerCase();
      const bio = (u.bio || '').toLowerCase();
      return name.includes(cleanQ) || handle.includes(cleanQ) || bio.includes(cleanQ);
    });
  }, [allUsers, cleanQ]);

  // Filter Universes: by name, description, cluster tags
  const filteredUniverses = useMemo(() => {
    if (!cleanQ) return allUniverses;
    return allUniverses.filter((univ) => {
      const matchName = univ.name.toLowerCase().includes(cleanQ);
      const matchDesc = univ.description.toLowerCase().includes(cleanQ);
      const matchCluster = univ.clusterKey && univ.clusterKey.toLowerCase().includes(cleanQ);
      return matchName || matchDesc || matchCluster;
    });
  }, [allUniverses, cleanQ]);

  // Handle follow click
  const handleFollowUser = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to follow creators.');
      }
      return;
    }
    if (onToggleFollow) {
      onToggleFollow(user);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="search-modal-backdrop"
        className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-16 bg-slate-950/70 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div
          id="search-modal-container"
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white/95 dark:bg-[#07132c]/95 border border-slate-200 dark:border-amber-300/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,215,0,0.12)] overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-slate-100 backdrop-blur-2xl"
        >
          {/* Main Search Input Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03]">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                id="search-modal-main-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={TERMS.SEARCH_PLACEHOLDER}
                className="w-full bg-white dark:bg-[#050e20] border border-slate-300 dark:border-amber-300/40 focus:border-amber-500 dark:focus:border-amber-300 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 text-sm sm:text-base px-4 pr-10 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-amber-300/40 transition-all shadow-xs dark:shadow-inner"
              />
              {query && (
                <button
                  id="btn-clear-search"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categorical Search Filter Bar: [ All | Stars | Users | Universes ] */}
            <div
              id="search-filter-tabs-bar"
              className="flex items-center gap-1.5 sm:gap-2 mt-3.5 overflow-x-auto no-scrollbar py-1"
            >
              {[
                { key: 'all', label: '✨ All', count: filteredStars.length + filteredUsers.length + filteredUniverses.length },
                { key: 'stars', label: `🌟 ${TERMS.FEED}`, count: filteredStars.length },
                { key: 'users', label: `🪐 ${TERMS.EXPLORER_CREW}`, count: filteredUsers.length },
                { key: 'universes', label: `🔭 ${TERMS.UNIVERSE}`, count: filteredUniverses.length },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    id={`search-tab-pill-${tab.key}`}
                    onClick={() => setActiveTab(tab.key as SearchCategory)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 shadow-sm scale-102'
                        : 'bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-black/20 text-slate-950 font-bold' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Results Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 custom-scrollbar">
            {/* TAB: "ALL" (Grouped Sections) */}
            {activeTab === 'all' && (
              <div className="space-y-6">
                {/* 1. CREATORS SECTION */}
                {filteredUsers.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Creators & Users ({filteredUsers.length})</span>
                      </h3>
                      {filteredUsers.length > 3 && (
                        <button
                          onClick={() => setActiveTab('users')}
                          className="text-xs text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {filteredUsers.slice(0, 3).map((user) => (
                        <UserResultRow
                          key={user.id}
                          user={user}
                          currentUser={currentUser}
                          hoveredFollowId={hoveredFollowId}
                          setHoveredFollowId={setHoveredFollowId}
                          onOpenUserProfile={(u) => {
                            onOpenUserProfile(u);
                            onClose();
                          }}
                          onFollowClick={handleFollowUser}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. UNIVERSES SECTION */}
                {filteredUniverses.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <Orbit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Constellations & Universes ({filteredUniverses.length})</span>
                      </h3>
                      {filteredUniverses.length > 3 && (
                        <button
                          onClick={() => setActiveTab('universes')}
                          className="text-xs text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredUniverses.slice(0, 4).map((univ) => (
                        <UniverseResultRow
                          key={univ.id}
                          universe={univ}
                          onSelectUniverse={(cluster) => {
                            onSelectUniverse(cluster);
                            onClose();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. STARS SECTION */}
                {filteredStars.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Stars & Ideas ({filteredStars.length})</span>
                      </h3>
                      {filteredStars.length > 5 && (
                        <button
                          onClick={() => setActiveTab('stars')}
                          className="text-xs text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {filteredStars.slice(0, 5).map((star) => (
                        <StarResultRow
                          key={star.id}
                          star={star}
                          currentUser={currentUser}
                          onSelectStar={(s) => {
                            onSelectStar(s);
                            onClose();
                          }}
                          onToggleLike={onToggleLike}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* If all groups empty */}
                {filteredUsers.length === 0 && filteredUniverses.length === 0 && filteredStars.length === 0 && (
                  <EmptySearchResult query={query} onReset={() => setQuery('')} />
                )}
              </div>
            )}

            {/* TAB: "STARS" */}
            {activeTab === 'stars' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Showing {filteredStars.length} {filteredStars.length === 1 ? 'star' : 'stars'} matching "{query || 'all'}"
                  </span>
                </div>
                {filteredStars.length > 0 ? (
                  filteredStars.map((star) => (
                    <StarResultRow
                      key={star.id}
                      star={star}
                      currentUser={currentUser}
                      onSelectStar={(s) => {
                        onSelectStar(s);
                        onClose();
                      }}
                      onToggleLike={onToggleLike}
                    />
                  ))
                ) : (
                  <EmptySearchResult query={query} onReset={() => setQuery('')} />
                )}
              </div>
            )}

            {/* TAB: "USERS" */}
            {activeTab === 'users' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Found {filteredUsers.length} cosmic {filteredUsers.length === 1 ? 'creator' : 'creators'}
                  </span>
                </div>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <UserResultRow
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      hoveredFollowId={hoveredFollowId}
                      setHoveredFollowId={setHoveredFollowId}
                      onOpenUserProfile={(u) => {
                        onOpenUserProfile(u);
                        onClose();
                      }}
                      onFollowClick={handleFollowUser}
                    />
                  ))
                ) : (
                  <EmptySearchResult
                    query={query}
                    emptyTitle="No creators found yet"
                    emptySubtitle={query ? `No creators found matching "${query}".` : 'No registered creators or explorers found in this sky yet.'}
                    onReset={() => setQuery('')}
                  />
                )}
              </div>
            )}

            {/* TAB: "UNIVERSES" */}
            {activeTab === 'universes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {filteredUniverses.length} Constellations and Universes available
                  </span>
                </div>
                {filteredUniverses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredUniverses.map((univ) => (
                      <UniverseResultRow
                        key={univ.id}
                        universe={univ}
                        onSelectUniverse={(cluster) => {
                          onSelectUniverse(cluster);
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptySearchResult
                    query={query}
                    emptyTitle="No universes created yet"
                    emptySubtitle={query ? `No universes or constellations matching "${query}".` : 'No custom constellations or universes created yet. Create a star to ignite one.'}
                    onReset={() => setQuery('')}
                  />
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Shortcuts */}
          <div className="p-3 px-5 border-t border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-black/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
              <span>Cosmic Network Explorer</span>
            </span>
            <div className="flex items-center gap-3">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-[10px]">ESC</kbd> to exit</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* =========================================================================
   INSTAGRAM-STYLE RESULT ROW SUBCOMPONENTS
   ========================================================================= */

/**
 * 1. User Result Row
 * Avatar, displayName, @username, follower stats, and interactive inline "+ Follow" / "Following" button
 */
const UserResultRow: React.FC<{
  user: User;
  currentUser: User | null;
  hoveredFollowId: string | null;
  setHoveredFollowId: (id: string | null) => void;
  onOpenUserProfile: (user: User) => void;
  onFollowClick: (e: React.MouseEvent, user: User) => void;
}> = ({ user, currentUser, hoveredFollowId, setHoveredFollowId, onOpenUserProfile, onFollowClick }) => {
  const cleanHandle = generateCleanHandle(user.username || user.handle || user.displayName);
  const isSelf = Boolean(
    currentUser &&
      (currentUser.id === user.id ||
        (currentUser.email && user.email && currentUser.email.toLowerCase() === user.email.toLowerCase()))
  );
  const isFollowing = Boolean(
    currentUser &&
      (currentUser.following?.includes(user.id) ||
        (currentUser as any).followingUserIds?.includes(user.id))
  );
  const isHovered = hoveredFollowId === user.id;

  return (
    <div
      id={`search-user-row-${user.id}`}
      onClick={() => onOpenUserProfile(user)}
      className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] hover:bg-amber-50/50 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 hover:border-amber-400/40 dark:hover:border-amber-300/40 transition-all cursor-pointer shadow-xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-amber-400/40 dark:border-amber-300/40 bg-slate-100 dark:bg-slate-900 shrink-0 flex items-center justify-center">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-300" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors truncate">
              {user.displayName || user.username}
            </span>
            {isSelf && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 border border-amber-400/30 dark:border-amber-300/30">
                YOU
              </span>
            )}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300/90 font-semibold truncate">@{cleanHandle}</p>
          {user.bio && <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{user.bio}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {!isSelf ? (
          <button
            type="button"
            id={`btn-search-follow-${user.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onFollowClick(e, user);
            }}
            onMouseEnter={() => setHoveredFollowId(user.id)}
            onMouseLeave={() => setHoveredFollowId(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs ${
              isFollowing
                ? isHovered
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-400/40 shadow-xs'
                  : 'bg-slate-200/80 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/20'
                : 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-105 border border-amber-300/70 shadow-xs'
            }`}
          >
            {isFollowing ? (
              isHovered ? (
                <span>🪐 Leave Orbit</span>
              ) : (
                <span>🪐 In Orbit</span>
              )
            ) : (
              <span>🪐 Enter Orbit</span>
            )}
          </button>
        ) : (
          <span className="text-[11px] text-slate-500 font-medium px-2 py-1">🌌 Your Sky</span>
        )}
      </div>
    </div>
  );
};

/**
 * 2. Star Result Row
 * Star title, author badge, visibility badge, cluster color & toggleable like button
 */
const StarResultRow: React.FC<{
  star: StarNode;
  currentUser: User | null;
  onSelectStar: (star: StarNode) => void;
  onToggleLike?: (starId: string) => void;
}> = ({ star, currentUser, onSelectStar, onToggleLike }) => {
  const theme = getClusterTheme(star.cluster);
  const isLiked = isStarLikedByUser(star, currentUser?.id);
  const likesCount = getStarLikesCount(star);
  const cleanAuthor = generateCleanHandle(star.author.handle || star.author.name);

  return (
    <div
      id={`search-star-row-${star.id}`}
      onClick={() => onSelectStar(star)}
      className="group flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] hover:bg-amber-50/50 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 hover:border-amber-400/40 dark:hover:border-amber-300/40 transition-all cursor-pointer shadow-xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Star Icon or Thumbnail */}
        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
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
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {star.isPinned && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40 shrink-0">
                ⭐ {TERMS.PINNED_POST}
              </span>
            )}

            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors truncate">
              {star.title}
            </h4>

            {star.isReformed && (
              <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                (Reformed)
              </span>
            )}

            {/* Visibility Badge */}
            {star.visibility === 'public' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                <Globe className="w-2.5 h-2.5" />
                <span>Public</span>
              </span>
            ) : star.allowedUserIds && star.allowedUserIds.length > 1 ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-semibold rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-400/40 shrink-0">
                <Users className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" />
                <span>Shared</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-semibold rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-400/40 shrink-0">
                <Key className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" />
                <span>Private</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            {/* Author Badge */}
            <span className="font-medium text-slate-800 dark:text-slate-300">{star.author.name}</span>
            <span className="text-amber-700 dark:text-amber-300/80 font-semibold">@{cleanAuthor}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{star.cluster}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {/* Toggleable Like Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleLike) onToggleLike(star.id);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            isLiked
              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 shadow-xs'
              : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-slate-200 dark:border-white/10'
          }`}
          title={isLiked ? '✨ Glowing' : '✨ Glow'}
        >
          <span className="text-[11px] font-semibold">{isLiked ? '✨ Glowing' : '✨ Glow'}</span>
          <span className="text-[10px] opacity-75">({likesCount})</span>
        </button>

        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
};

/**
 * 3. Universe Result Row
 * Universe name, member count, star count, and jump action
 */
const UniverseResultRow: React.FC<{
  universe: UniverseItem;
  onSelectUniverse: (cluster: StarCluster | 'All' | 'shared' | 'private') => void;
}> = ({ universe, onSelectUniverse }) => {
  const handleClick = () => {
    if (universe.isSharedSpace) {
      onSelectUniverse('shared');
    } else if (universe.isPrivateSpace) {
      onSelectUniverse('private');
    } else if (universe.clusterKey) {
      onSelectUniverse(universe.clusterKey);
    } else {
      onSelectUniverse('All');
    }
  };

  return (
    <div
      id={`search-universe-row-${universe.id}`}
      onClick={handleClick}
      className="group flex flex-col justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] hover:bg-amber-50/50 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 hover:border-amber-400/40 dark:hover:border-amber-300/40 transition-all cursor-pointer shadow-xs relative overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: universe.glowColor }}
      />

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-xs"
            style={{ backgroundColor: universe.glowColor, color: universe.glowColor }}
          />
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors truncate">
            {universe.name}
          </h4>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {universe.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.06] text-[11px]">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1 text-amber-800 dark:text-amber-300 font-semibold">
            <Star className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{universe.starCount} Stars</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span>{universe.memberCount} Members</span>
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 group-hover:text-amber-800 dark:group-hover:text-amber-200 group-hover:translate-x-0.5 transition-all">
          <span>Enter</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};

const EmptySearchResult: React.FC<{
  query: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  onReset: () => void;
}> = ({ query, emptyTitle, emptySubtitle, onReset }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-400/30 dark:border-amber-300/30 flex items-center justify-center mb-3 text-amber-600 dark:text-amber-300 shadow-xs">
      <Search className="w-6 h-6" />
    </div>
    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-1">
      {emptyTitle || 'No cosmic coordinates found'}
    </h4>
    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mb-4">
      {emptySubtitle || (query ? `We couldn't find any stars, creators, or universes matching "${query}".` : 'Try searching for a topic, artist, or constellation.')}
    </p>
    {query && (
      <button
        onClick={onReset}
        className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-400/20 dark:hover:bg-amber-400/30 text-amber-900 dark:text-amber-200 border border-amber-400/40 dark:border-amber-300/40 text-xs font-semibold transition-all cursor-pointer"
      >
        Clear Search Query
      </button>
    )}
  </div>
);
