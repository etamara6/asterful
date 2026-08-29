import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Plus, 
  Orbit, 
  X, 
  LogIn, 
  UserPlus, 
  LogOut, 
  User as UserIcon, 
  ChevronDown, 
  Trash2, 
  Eye, 
  EyeOff,
  Loader2,
  Lock, 
  AlertTriangle, 
  Sun, 
  Moon, 
  MessageSquare,
  Radio,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StarCluster, User, Galaxy, AuthorStoryGroup } from '../types';
import { LiveBroadcast } from '../types/broadcast';
import { DEFAULT_CLUSTERS, getClusterTheme } from '../utils/colorPalette';
import { useTheme } from '../context/ThemeContext';
import { AuthMode } from './AuthModal';
import { SearchCategory } from './SearchModal';
import { getUnreadMessagesCount, CHAT_UPDATE_EVENT } from '../utils/chatStorage';
import { TERMS } from '../constants/terminology';
import { StarStoriesBar } from './StarStoriesBar';
import { AccountDeletionResult } from '../utils/userRegistry';
import logoImage from '../assets/images/logo.jpg';

interface HeaderProps {
  activeCluster: StarCluster | 'All';
  onSelectCluster: (cluster: StarCluster | 'All') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  totalStarsCount: number;
  currentUser: User | null;
  onOpenAuthModal: (mode: AuthMode, bannerMessage?: string) => void;
  onLogout: () => void;
  onDeleteAccount: (passwordForReauth?: string) => Promise<AccountDeletionResult | void> | void;
  onOpenProfileModal?: () => void;

  onOpenSearchModal?: (category?: SearchCategory, query?: string) => void;
  onOpenChat?: () => void;
  onOpenGalaxiesModal?: () => void;
  onToggleDiscoverySidebar?: () => void;
  isDiscoverySidebarOpen?: boolean;
  selectedGalaxy?: Galaxy | null;
  onClearGalaxyFilter?: () => void;
  clusters?: StarCluster[];
  storyGroups?: AuthorStoryGroup[];
  liveBroadcasts?: LiveBroadcast[];
  onOpenStoryViewer?: (index: number) => void;
  onOpenCreateStory?: () => void;
  onOpenBroadcast?: (broadcastId: string) => void;
  onOpenGoLive?: () => void;
  showStoriesBar?: boolean;
  onToggleStoriesBar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCluster,
  onSelectCluster,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  totalStarsCount,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onDeleteAccount,
  onOpenProfileModal,
  onOpenSearchModal,
  clusters = DEFAULT_CLUSTERS,
  onOpenChat,
  onOpenGalaxiesModal,
  onToggleDiscoverySidebar,
  isDiscoverySidebarOpen,
  selectedGalaxy,
  onClearGalaxyFilter,
  storyGroups = [],
  liveBroadcasts = [],
  onOpenStoryViewer,
  onOpenCreateStory,
  onOpenBroadcast,
  onOpenGoLive,
  showStoriesBar = true,
  onToggleStoriesBar,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [requiresReauth, setRequiresReauth] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleOpenDeleteModal = () => {
    setDeleteAccountPassword('');
    setShowDeletePassword(false);
    setRequiresReauth(false);
    setDeleteError('');
    setIsDeletingAccount(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteError('');
    setIsDeletingAccount(true);

    try {
      const res = await onDeleteAccount(deleteAccountPassword.trim() || undefined);
      if (res && !res.success) {
        setIsDeletingAccount(false);
        if (res.requiresRecentLogin) {
          setRequiresReauth(true);
        }
        setDeleteError(res.error || 'Failed to collapse account. Please try again.');
        return;
      }
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setIsDeletingAccount(false);
      setDeleteError(err?.message || 'An error occurred during account collapse.');
    }
  };


  // Update unread count for current user
  useEffect(() => {
    const updateUnread = () => {
      if (currentUser && !currentUser.isGuest) {
        const count = getUnreadMessagesCount(currentUser.id);
        setUnreadCount(count);
      } else {
        setUnreadCount(0);
      }
    };

    updateUnread();
    window.addEventListener(CHAT_UPDATE_EVENT, updateUnread);
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, updateUnread);
    };
  }, [currentUser]);

  // Close dropdown on click outside and listen for Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (onOpenSearchModal) {
          onOpenSearchModal('all', searchQuery);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenSearchModal, searchQuery]);

  return (
    <header
      id="constellation-header"
      className="fixed top-0 left-0 right-0 z-30 flex flex-col w-full bg-white dark:bg-[#0A0E1A] text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 transition-all duration-200"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-7xl mx-auto w-full gap-2 sm:gap-4">
        {/* Logo / Title */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src={logoImage}
            alt="Asterful Logo"
            className="h-9 w-9 rounded-full object-cover border border-purple-500/30 overflow-hidden"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-1.5">
                <span className="text-slate-900 dark:text-amber-400 font-bold">Asterful</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-300 border border-slate-300 dark:border-slate-700 rounded-full backdrop-blur-sm shadow-xs">
                {totalStarsCount} Stars
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
              You are made of stars
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-1 sm:mx-4">
          <div className="relative flex items-center group">
            <input
              id="constellation-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onOpenSearchModal) {
                  onOpenSearchModal('all', searchQuery);
                }
              }}
              placeholder={`${TERMS.SEARCH}...`}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 border border-slate-300 dark:border-slate-700 text-sm px-4 pr-16 py-2 rounded-full focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-all shadow-inner"
            />
            <div className="absolute right-2.5 flex items-center gap-1">
              {searchQuery ? (
                <button
                  id="constellation-clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenSearchModal && onOpenSearchModal('all', '')}
                  className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 bg-slate-200/70 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-300/80 dark:border-white/10 px-1.5 py-0.5 rounded-md transition-all cursor-pointer"
                  title="Press Cmd+K to scan universe"
                >
                  <span>⌘K</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions: Theme Toggle, New Star & Auth */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cosmic Broadcast / Go Live Button */}
          {onOpenGoLive && (
            <button
              id="btn-header-broadcast"
              type="button"
              onClick={onOpenGoLive}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-700 dark:text-rose-300 transition-all cursor-pointer shadow-xs active:scale-95"
              title={`${TERMS.BROADCAST} (${TERMS.GO_LIVE})`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span className="hidden sm:inline">Broadcast</span>
              {liveBroadcasts.some((b) => b.isLive) && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                  {liveBroadcasts.filter((b) => b.isLive).length}
                </span>
              )}
            </button>
          )}

          {/* Star Stories ✨ Quick Toggle / Viewer Button */}
          {onOpenStoryViewer && (
            <button
              id="btn-header-stories"
              type="button"
              onClick={() => {
                if (onToggleStoriesBar) {
                  onToggleStoriesBar();
                } else if (storyGroups.length > 0) {
                  onOpenStoryViewer(0);
                } else if (onOpenCreateStory) {
                  onOpenCreateStory();
                }
              }}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 border ${
                showStoriesBar
                  ? 'bg-amber-400/20 hover:bg-amber-400/30 border-amber-400/50 text-amber-900 dark:text-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200'
              }`}
              title="Star Stories ✨ (24-Hour Ephemeral Sky)"
            >
              <span>✨</span>
              <span className="hidden sm:inline">Stories</span>
              {storyGroups.some((g) => g.hasUnviewed) && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
              )}
            </button>
          )}

          {/* Galaxies Communities Button */}
          {onOpenGalaxiesModal && (
            <button
              id="btn-header-galaxies"
              type="button"
              onClick={onOpenGalaxiesModal}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-700 dark:text-purple-300 transition-all cursor-pointer shadow-xs active:scale-95"
              title={`${TERMS.COMMUNITIES} (Topic Hubs)`}
            >
              <span>🌌</span>
              <span className="hidden sm:inline">{TERMS.COMMUNITIES}</span>
            </button>
          )}

          {/* Discovery Sidebar Toggle Button */}
          {onToggleDiscoverySidebar && (
            <button
              id="btn-header-discovery"
              type="button"
              onClick={onToggleDiscoverySidebar}
              className={`relative p-2 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
                isDiscoverySidebarOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-300 dark:border-amber-300/30 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300'
              }`}
              title="Explore & Potential Orbits (Discovery Sidebar)"
              aria-label="Toggle Discovery Sidebar"
            >
              <Compass className="w-4 h-4" />
            </button>
          )}

          {/* Light / Dark Mode Cosmic Theme Toggle */}
          <button
            type="button"
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-300 dark:border-amber-300/30 text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 transition-all duration-300 cursor-pointer shadow-sm active:scale-90"
            title={isDark ? "Switch to Light Starlight Nebula theme" : "Switch to Dark Cosmic Space theme"}
            aria-label="Toggle Light and Dark Theme"
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-300 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
              ) : (
                <Moon className="w-4 h-4 text-slate-800 drop-shadow-[0_0_6px_rgba(99,102,241,0.3)]" />
              )}
            </motion.div>
          </button>

          {/* New Star Action Button */}
          <button
            id="btn-new-star"
            onClick={() => {
              if (!currentUser || currentUser.isGuest) {
                onOpenAuthModal('signin', 'Please sign in or create an account to ignite a new star.');
              } else {
                onOpenCreateModal();
              }
            }}
            className="relative group inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_20px_rgba(255,215,0,0.35)] hover:shadow-[0_0_30px_rgba(255,215,0,0.6)] border border-amber-200 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300 text-slate-950" />
            <span className="hidden xs:inline">{TERMS.CREATE_POST}</span>
            <span className="xs:hidden">{TERMS.POST}</span>
          </button>

          {/* Signal Hub / Chat Button */}
          <button
            id="btn-header-chat"
            onClick={() => {
              if (onOpenChat) {
                onOpenChat();
              }
            }}
            className="relative p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-300 dark:border-amber-300/30 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
            title={TERMS.INBOX}
            aria-label={TERMS.INBOX}
          >
            <Radio className="w-4 h-4 text-amber-600 dark:text-amber-300 animate-pulse" />
            {unreadCount > 0 && (
              <span
                id="badge-chat-unread-count"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-[#0A0E1A] shadow-xs animate-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Auth Section */}
          {currentUser && currentUser.isGuest ? (
            /* Guest Mode UI Indicator and Sign In prompt */
            <div className="flex items-center gap-2" ref={userMenuRef}>
              <div
                id="badge-guest-mode"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/[0.08] border border-amber-400/30 dark:border-amber-300/25 text-amber-800 dark:text-amber-200/90 text-xs font-medium"
              >
                <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                <span>Guest Mode ({TERMS.USER})</span>
              </div>

              <button
                id="btn-guest-signin"
                onClick={() => onOpenAuthModal('signin', 'Please sign in or create an account to ignite a new star.')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-400/25 hover:bg-amber-400/35 dark:bg-amber-400/15 dark:hover:bg-amber-400/25 border border-amber-400/40 dark:border-amber-300/30 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                <span>{TERMS.LOGIN}</span>
              </button>

              <button
                id="btn-user-profile-menu-guest"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-300 dark:border-amber-300/30 transition-all cursor-pointer"
                title={TERMS.SETTINGS}
              >
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-amber-600 dark:text-amber-300' : ''}`} />
              </button>

              {/* Guest Dropdown */}
              {isUserMenuOpen && (
                <div
                  id="user-guest-dropdown"
                  className="absolute right-0 top-12 mt-2 w-56 frosted-glass-panel bg-white/95 dark:bg-[#040a1c]/95 border border-slate-200 dark:border-amber-300/25 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2.5 border-b border-slate-200 dark:border-white/10 mb-1">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Cosmic Guest</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{TERMS.NEW_USER}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAuthModal('signin', 'Please sign in or create an account to ignite a new star.');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-400/20 dark:hover:bg-amber-400/15 rounded-xl transition-colors cursor-pointer mb-1"
                  >
                    <LogIn className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                    <span>{TERMS.LOGIN}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAuthModal('signup');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer mb-1"
                  >
                    <UserPlus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>{TERMS.SIGNUP}</span>
                  </button>

                  <button
                    id="btn-guest-exit"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer border-t border-slate-200 dark:border-white/10 pt-2"
                  >
                    <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>{TERMS.LOGOUT}</span>
                  </button>
                </div>
              )}
            </div>
          ) : currentUser ? (
            /* Logged In: Avatar & Profile Menu */
            <div className="relative" ref={userMenuRef}>
              <button
                id="btn-user-profile-menu"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-300 dark:border-amber-300/30 transition-all cursor-pointer shadow-sm group"
                aria-label={TERMS.PROFILE}
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-400/50 dark:border-amber-300/50 bg-slate-200 dark:bg-[#081226] flex items-center justify-center shrink-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName || currentUser.username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-white dark:border-slate-900" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors leading-tight">
                    {currentUser.displayName || currentUser.username}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    @{currentUser.handle}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 hidden sm:block ${isUserMenuOpen ? 'rotate-180 text-amber-600 dark:text-amber-300' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  id="user-profile-dropdown"
                  className="absolute right-0 mt-2 w-56 frosted-glass-panel bg-white/95 dark:bg-[#040a1c]/95 border border-slate-200 dark:border-amber-300/25 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2.5 border-b border-slate-200 dark:border-white/10 mb-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{currentUser.displayName || currentUser.username}</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium truncate">@{currentUser.handle?.replace(/^@/, '')}</p>
                  </div>

                  {onOpenProfileModal && (
                    <button
                      id="btn-user-my-profile"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfileModal();
                      }}
                      className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-800 dark:text-amber-200 hover:text-amber-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-amber-400/15 rounded-xl transition-colors cursor-pointer mb-0.5"
                    >
                      <span>{TERMS.PROFILE}</span>
                    </button>
                  )}

                  {onOpenChat && (
                    <button
                      id="btn-user-messages-dropdown"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenChat();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-800 dark:text-amber-200 hover:text-amber-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-amber-400/15 rounded-xl transition-colors cursor-pointer mb-0.5"
                    >
                      <span>{TERMS.NOTIFICATIONS}</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    id="btn-user-logout"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>{TERMS.LOGOUT}</span>
                  </button>

                  <div className="pt-1 mt-1 border-t border-slate-200 dark:border-white/10">
                    <button
                      id="btn-user-delete-account"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleOpenDeleteModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer group"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                      <span>{TERMS.DELETE_POST ? 'Collapse Account' : 'Delete Account'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (

            /* Logged Out: Sign In & Create Account Buttons */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="btn-header-signin"
                onClick={() => onOpenAuthModal('signin')}
                className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:hover:text-amber-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-300 dark:border-white/15 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                <span>{TERMS.LOGIN}</span>
              </button>
              <button
                id="btn-header-signup"
                onClick={() => onOpenAuthModal('signup')}
                className="hidden xs:inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-sm border border-amber-300/60 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-950" />
                <span>{TERMS.SIGNUP}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Category Filter Pills Bar */}
      <div className="px-4 sm:px-6 pb-2.5 pt-0.5 max-w-7xl mx-auto w-full overflow-x-auto no-scrollbar flex items-center gap-2">
        <button
          id="filter-pill-all"
          onClick={() => {
            onSelectCluster('All');
            if (onClearGalaxyFilter) onClearGalaxyFilter();
          }}
          className={`shrink-0 px-3.5 py-1 text-xs rounded-full transition-all duration-200 cursor-pointer border ${
            activeCluster === 'All' && !selectedGalaxy
              ? 'bg-amber-500 text-white font-semibold border-amber-500 shadow-sm'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-amber-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium'
          }`}
        >
          🔭 Explore Universe
        </button>

        {/* Selected Galaxy Indicator if active */}
        {selectedGalaxy && (
          <div
            id="filter-pill-active-galaxy"
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1 text-xs rounded-full bg-purple-600 text-white font-semibold border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
          >
            <span>{selectedGalaxy.icon}</span>
            <span>{selectedGalaxy.name}</span>
            {onClearGalaxyFilter && (
              <button
                type="button"
                onClick={onClearGalaxyFilter}
                className="ml-1 p-0.5 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
                title="Clear Galaxy filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Browse All Galaxies Button */}
        {onOpenGalaxiesModal && (
          <button
            id="filter-pill-open-galaxies"
            onClick={onOpenGalaxiesModal}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-purple-500/15 hover:bg-purple-500/25 text-purple-800 dark:text-purple-300 border border-purple-400/30 font-medium cursor-pointer transition-all active:scale-95"
          >
            <span>🌌</span>
            <span>{TERMS.COMMUNITIES}</span>
          </button>
        )}

        {clusters.map((cluster) => {
          const theme = getClusterTheme(cluster);
          const isActive = activeCluster === cluster;
          const isOurUniverse = cluster === 'Our Universe';
          const isCustomUniverse = !DEFAULT_CLUSTERS.includes(cluster as any) && !isOurUniverse;

          return (
            <button
              key={cluster}
              id={`filter-pill-${cluster.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => onSelectCluster(cluster)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1 text-xs rounded-full transition-all duration-200 cursor-pointer border ${
                isActive
                  ? 'bg-amber-500 text-white font-semibold border-amber-500 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-amber-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium'
              }`}
            >
              {isOurUniverse ? (
                <Lock className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-amber-600 dark:text-amber-300'}`} />
              ) : isCustomUniverse ? (
                <Orbit className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-amber-600 dark:text-amber-300'}`} />
              ) : (
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                  style={{ backgroundColor: isActive ? '#FFFFFF' : theme.color }}
                />
              )}
              <span className={isActive ? 'text-white' : 'text-slate-900 dark:text-amber-200'}>{cluster}</span>
            </button>
          );
        })}
      </div>

      {/* Star Stories 24-hour Ephemeral Sky Bar */}
      {showStoriesBar && onOpenStoryViewer && onOpenCreateStory && (
        <StarStoriesBar
          currentUser={currentUser}
          storyGroups={storyGroups}
          liveBroadcasts={liveBroadcasts}
          onOpenStoryViewer={onOpenStoryViewer}
          onOpenCreateStory={onOpenCreateStory}
          onOpenBroadcast={onOpenBroadcast}
          onOpenGoLive={onOpenGoLive}
          onPromptAuth={() => onOpenAuthModal('signin', 'Sign in to ignite your Star Story ✨')}
        />
      )}

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div
            id="delete-account-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md frosted-glass-panel bg-white/95 dark:bg-[#040a1c]/95 border border-rose-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Collapse Cosmic Account?</h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Irreversible & Permanent</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Are you sure you want to permanently collapse your account? This will completely remove your profile from Firebase Authentication, extinguish all of your authored stars, and delete your data from the Asterful star graph.
              </p>

              {/* Password Re-authentication Input if required or prompted */}
              {requiresReauth && (
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Security Verification Required</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5">
                    Please enter your account password to authorize permanent deletion.
                  </p>
                  <div className="relative">
                    <input
                      id="input-delete-account-password"
                      type={showDeletePassword ? 'text' : 'password'}
                      value={deleteAccountPassword}
                      onChange={(e) => {
                        setDeleteAccountPassword(e.target.value);
                        setDeleteError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isDeletingAccount) {
                          e.preventDefault();
                          handleConfirmDelete();
                        }
                      }}
                      placeholder="Enter your account password"
                      className="w-full pl-3.5 pr-10 py-2 rounded-xl text-xs bg-white dark:bg-black/40 border border-rose-400/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      disabled={isDeletingAccount}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showDeletePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {deleteError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="btn-cancel-delete-account"
                  onClick={() => {
                    if (!isDeletingAccount) {
                      setIsDeleteModalOpen(false);
                    }
                  }}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-account"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingAccount || (requiresReauth && !deleteAccountPassword.trim())}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border border-rose-400/40 shadow-[0_0_18px_rgba(244,63,94,0.4)] cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extinguishing Account...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{requiresReauth ? 'Verify & Collapse' : 'Permanently Collapse'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </header>
  );
};

