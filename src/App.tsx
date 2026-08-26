import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, Trash2, X } from 'lucide-react';
import { StarNode, CanvasViewport, StarCluster, StarVisibility, User, UnlitStarDraft, Galaxy, StarStory, AuthorStoryGroup } from './types';
import { INITIAL_STARS } from './data/initialStars';
import { computeConstellationEdges, calculateSpawnPosition } from './utils/tagEngine';
import { DEFAULT_CLUSTERS } from './utils/colorPalette';
import { toggleFollowUser, getAllRegisteredUsers } from './utils/userRegistry';
import { toggleStarLike, normalizeLikes } from './utils/likesHelper';
import { toggleStarReignite } from './utils/reigniteHelper';
import { getStoredUniverses } from './utils/universeRegistry';
import { 
  getAllStories, 
  getVisibleStories, 
  groupStoriesByAuthor, 
  markStoryAsViewed, 
  deleteStarStory 
} from './utils/storyStorage';
import { ConstellationCanvas } from './components/ConstellationCanvas';
import { Header } from './components/Header';
import { StarDetailDrawer } from './components/StarDetailDrawer';
import { CreateStarModal } from './components/CreateStarModal';
import { CreateStoryModal } from './components/CreateStoryModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { AuthModal, AuthMode } from './components/AuthModal';
import { FloatingControls } from './components/FloatingControls';
import { LandingAuth } from './components/LandingAuth';
import { UserProfileModal } from './components/UserProfileModal';
import { SearchModal, SearchCategory } from './components/SearchModal';
import { GalaxiesModal } from './components/GalaxiesModal';
import { NebulaModal } from './components/NebulaModal';
import { DiscoverySidebar } from './components/DiscoverySidebar';
import { GalaxyCursorTrail } from './components/GalaxyCursorTrail';
import { ChatDrawer } from './components/chat/ChatDrawer';
import { BroadcastModal } from './components/BroadcastModal';
import { getAllBroadcasts, COSMIC_BROADCAST_UPDATED_EVENT } from './utils/broadcastStorage';
import { LiveBroadcast } from './types/broadcast';
import { useTheme } from './context/ThemeContext';

const STORAGE_KEY = 'constellation_stars_v2';
const AUTH_STORAGE_KEY = 'asterful_auth_user_v2';
const LEGACY_AUTH_STORAGE_KEY = 'constellation_auth_user_v1';

export default function App() {
  const { theme, isDark } = useTheme();
  const isDarkMode = isDark;

  // One-time legacy localStorage cache clear check
  useEffect(() => {
    const storageVersion = localStorage.getItem('asterful_v2');
    if (!storageVersion) {
      // Clean legacy mock cache keys safely without wiping user registrations
      localStorage.removeItem('constellation_stars_v1');
      localStorage.removeItem('constellation_stories_v1');
      localStorage.removeItem('constellation_broadcasts_v1');
      localStorage.setItem('asterful_v2', 'true');
    }
  }, []);

  // 1. User Authentication State with localStorage Persistence
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore parsing error
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('signin');
  const [authBannerMessage, setAuthBannerMessage] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchModalCategory, setSearchModalCategory] = useState<SearchCategory>('all');
  const [searchModalInitialQuery, setSearchModalInitialQuery] = useState('');

  // Galaxies 🌌, Nebulas 🌫️✨, and Discovery Sidebar 🪐
  const [isGalaxiesModalOpen, setIsGalaxiesModalOpen] = useState(false);
  const [initialGalaxyIdForModal, setInitialGalaxyIdForModal] = useState<string | null>(null);
  const [selectedGalaxyForFilter, setSelectedGalaxyForFilter] = useState<Galaxy | null>(null);
  const [isNebulaModalOpen, setIsNebulaModalOpen] = useState(false);
  const [activeNebulaTag, setActiveNebulaTag] = useState<string | null>(null);
  const [isDiscoverySidebarOpen, setIsDiscoverySidebarOpen] = useState(false);
  const [initialTagForCreateModal, setInitialTagForCreateModal] = useState<string | null>(null);
  const [initialGalaxyForCreateModal, setInitialGalaxyForCreateModal] = useState<Galaxy | null>(null);

  // Private Direct & Group Messaging Chat Drawer State
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatDrawerInitialRoomId, setChatDrawerInitialRoomId] = useState<string | null>(null);
  const [chatDrawerInitialTargetUser, setChatDrawerInitialTargetUser] = useState<User | null>(null);

  const handleOpenAuthModal = useCallback((mode: AuthMode, bannerMessage?: string) => {
    setAuthModalMode(mode);
    setAuthBannerMessage(bannerMessage || null);
    setIsAuthModalOpen(true);
  }, []);

  const handleOpenChat = useCallback((targetUser?: User | null, roomId?: string | null) => {
    setChatDrawerInitialTargetUser(targetUser || null);
    setChatDrawerInitialRoomId(roomId || null);
    setIsChatDrawerOpen(true);
  }, []);

  // Star Stories ✨ State (24-Hour Ephemeral Sky)
  const [stories, setStories] = useState<StarStory[]>(() => getAllStories());
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isStoryViewerModalOpen, setIsStoryViewerModalOpen] = useState(false);
  const [selectedStoryAuthorIndex, setSelectedStoryAuthorIndex] = useState(0);
  const [showStoriesBar, setShowStoriesBar] = useState(true);

  // Cosmic Broadcast 🌌📡 (Live Stream / Go Live Star) State
  const [liveBroadcasts, setLiveBroadcasts] = useState<LiveBroadcast[]>(() => getAllBroadcasts());
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const [isStartingBroadcast, setIsStartingBroadcast] = useState(false);

  // Synchronize live broadcasts across the universe
  useEffect(() => {
    const handleBroadcastUpdate = () => {
      setLiveBroadcasts(getAllBroadcasts());
    };
    window.addEventListener(COSMIC_BROADCAST_UPDATED_EVENT, handleBroadcastUpdate);
    return () => window.removeEventListener(COSMIC_BROADCAST_UPDATED_EVENT, handleBroadcastUpdate);
  }, []);

  const handleOpenBroadcast = useCallback((broadcastId: string) => {
    setActiveBroadcastId(broadcastId);
    setIsStartingBroadcast(false);
    setIsBroadcastModalOpen(true);
  }, []);

  const handleOpenGoLive = useCallback(() => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Please sign in or create an account to start a Cosmic Broadcast 🌌📡');
      return;
    }
    setActiveBroadcastId(null);
    setIsStartingBroadcast(true);
    setIsBroadcastModalOpen(true);
  }, [currentUser, handleOpenAuthModal]);

  // Calculate visible stories for current user based on privacy (PUBLIC vs FRIENDS_ONLY)
  const visibleStoriesList = useMemo(() => {
    return getVisibleStories(currentUser?.id, currentUser?.following);
  }, [stories, currentUser]);

  // Group stories by author
  const storyGroups = useMemo(() => {
    return groupStoriesByAuthor(visibleStoriesList, currentUser?.id);
  }, [visibleStoriesList, currentUser]);

  const handleOpenStoryViewer = useCallback((authorIndex: number) => {
    setSelectedStoryAuthorIndex(authorIndex);
    setIsStoryViewerModalOpen(true);
  }, []);

  const handleOpenCreateStory = useCallback(() => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Please sign in or create an account to share a Star Story ✨');
      return;
    }
    setIsCreateStoryModalOpen(true);
  }, [currentUser, handleOpenAuthModal]);

  const handleStoryCreated = useCallback((newStory: StarStory) => {
    setStories(getAllStories());
    setToastNotification(`Star Story ✨ illuminated in your sky!`);
    setTimeout(() => setToastNotification(null), 4000);
  }, []);

  const handleMarkStoryViewed = useCallback((storyId: string) => {
    if (!currentUser) return;
    markStoryAsViewed(storyId, currentUser.id);
    setStories(getAllStories());
  }, [currentUser]);

  const handleDeleteStory = useCallback((storyId: string) => {
    deleteStarStory(storyId, currentUser?.id);
    setStories(getAllStories());
    setToastNotification(`Star Story faded from orbit.`);
    setTimeout(() => setToastNotification(null), 4000);
  }, [currentUser]);

  const handleSendStorySignalReply = useCallback((author: User, text: string) => {
    handleOpenChat(author);
  }, [handleOpenChat]);

  const handleOpenSearchModal = useCallback((category: SearchCategory = 'all', query: string = '') => {
    setSearchModalCategory(category);
    setSearchModalInitialQuery(query);
    setIsSearchModalOpen(true);
  }, []);

  const handleOpenGalaxiesModal = useCallback((galaxyId?: string | null) => {
    setInitialGalaxyIdForModal(galaxyId || null);
    setIsGalaxiesModalOpen(true);
  }, []);

  const handleOpenNebulaModal = useCallback((tag: string) => {
    setActiveNebulaTag(tag);
    setIsNebulaModalOpen(true);
  }, []);

  const handleOpenCreateInGalaxy = useCallback((galaxy: Galaxy) => {
    setInitialGalaxyForCreateModal(galaxy);
    setInitialTagForCreateModal(galaxy.tag);
    setRemixParentStar(null);
    setCustomSpawnPos(null);
    setEditingStar(null);
    setInitialDraftToResume(null);
    setIsCreateModalOpen(true);
  }, []);

  const handleOpenCreateWithTag = useCallback((tag: string) => {
    setInitialTagForCreateModal(tag);
    setInitialGalaxyForCreateModal(null);
    setRemixParentStar(null);
    setCustomSpawnPos(null);
    setEditingStar(null);
    setInitialDraftToResume(null);
    setIsCreateModalOpen(true);
  }, []);

  const handleFilterCosmosByGalaxy = useCallback((galaxy: Galaxy) => {
    setSelectedGalaxyForFilter(galaxy);
    setToastNotification(`Filtered cosmos to ${galaxy.name} Galaxy 🌌`);
  }, []);

  const handleClearGalaxyFilter = useCallback(() => {
    setSelectedGalaxyForFilter(null);
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // ignore storage error
    }
  }, [currentUser]);

  // Real-time Cosmic Signal Received notification listener
  useEffect(() => {
    if (!currentUser || currentUser.isGuest) return;

    const handleSignal = (e: Event) => {
      const customEvent = e as CustomEvent<{
        roomId: string;
        message: any;
        senderName: string;
        senderAvatar?: string;
        recipientId?: string;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      // If addressed to current user or group where current user is participant
      if (detail.message && detail.message.senderId !== currentUser.id) {
        setToastNotification(`📡 Cosmic Signal from ${detail.senderName}: "${detail.message.text.slice(0, 40)}${detail.message.text.length > 40 ? '...' : ''}"`);
        setTimeout(() => {
          setToastNotification(null);
        }, 5000);
      }
    };

    window.addEventListener('cosmic_signal_received', handleSignal);
    return () => {
      window.removeEventListener('cosmic_signal_received', handleSignal);
    };
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedStarId(null);
    setSelectedProfileUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthBannerMessage(null);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch {
      // ignore storage error
    }
    // Update user authored stars with latest display name and avatar
    setStars(prevStars => prevStars.map(s => {
      const isAuthorMatch = (s.authorId && s.authorId === updatedUser.id) || (s.userId && s.userId === updatedUser.id);
      if (isAuthorMatch) {
        return {
          ...s,
          author: {
            ...s.author,
            name: updatedUser.displayName || updatedUser.username || s.author.name,
            handle: updatedUser.handle || s.author.handle,
            avatarUrl: updatedUser.avatarUrl || s.author.avatarUrl,
          }
        };
      }
      return s;
    }));
    setToastNotification(`Profile updated: ${updatedUser.displayName || updatedUser.username}`);
    setTimeout(() => {
      setToastNotification(null);
    }, 4000);
  }, []);

  // 2. Stars State
  const [stars, setStars] = useState<StarNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore parsing errors
    }
    return INITIAL_STARS;
  });

  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<StarCluster | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);

  // Account and Data Deletion Handler
  const handleDeleteAccount = useCallback(() => {
    if (!currentUser) return;
    const currentUserId = currentUser.id;
    const currentUserHandle = currentUser.handle.toLowerCase().replace(/^@/, '');

    // a) Filter global stars array to remove all posts matching authorId === currentUser.id (or userId === currentUser.id)
    const updatedStars = stars.filter((s) => {
      const isAuthorMatch = s.authorId === currentUserId || s.userId === currentUserId;
      const isHandleMatch = s.author.handle.toLowerCase().replace(/^@/, '') === currentUserHandle;
      return !isAuthorMatch && !isHandleMatch;
    });

    // b) Update the stars array in React state and localStorage
    setStars(updatedStars);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStars));
    } catch {
      // ignore storage errors
    }

    // c) Clear currentUser from state and localStorage to log user out
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }

    // Deselect star if it was deleted
    if (selectedStarId && !updatedStars.some((s) => s.id === selectedStarId)) {
      setSelectedStarId(null);
    }

    // d) Display success message
    setToastNotification('Account and all associated stars deleted.');
    setTimeout(() => {
      setToastNotification(null);
    }, 5000);
  }, [currentUser, stars, selectedStarId]);
  
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 0,
    y: 0,
    zoom: 0.95,
  });

  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showLines, setShowLines] = useState<boolean>(true);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [remixParentStar, setRemixParentStar] = useState<StarNode | null>(null);
  const [customSpawnPos, setCustomSpawnPos] = useState<{ x: number; y: number } | null>(null);
  const [editingStar, setEditingStar] = useState<StarNode | null>(null);
  const [initialDraftToResume, setInitialDraftToResume] = useState<UnlitStarDraft | null>(null);

  // Persist stars to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stars));
    } catch {
      // storage full or disabled
    }
  }, [stars]);

  // Visible stars permitted for the current user session (hides unauthorized private stars and NSFW content for minors/guests)
  const visibleStars = useMemo(() => {
    const isUserOver18 = Boolean(currentUser && !currentUser.isGuest && currentUser.isOver18);

    return stars.filter((s) => {
      // 18+ / NSFW content moderation check: hide from guests and users under 18
      if (s.isNsfw && !isUserOver18) {
        return false;
      }

      // Private star access check
      if (s.visibility === 'private') {
        if (!currentUser) return false;
        const currentUserId = currentUser.id;
        const currentHandle = currentUser.handle.toLowerCase().replace(/^@/, '');
        const isAuthor =
          (s.authorId && s.authorId === currentUserId) ||
          (s.userId && s.userId === currentUserId) ||
          (s.author?.handle && s.author.handle.toLowerCase().replace(/^@/, '') === currentHandle);
        const isPermitted = isAuthor || (s.allowedUserIds && s.allowedUserIds.includes(currentUserId));
        if (!isPermitted) return false;
      }

      // Filter by Selected Galaxy if active
      if (selectedGalaxyForFilter) {
        const g = selectedGalaxyForFilter;
        const matchesId = s.galaxyId === g.id;
        const matchesName = s.galaxyName?.toLowerCase() === g.name.toLowerCase();
        const matchesTag = s.tags?.some(
          (t) => t.toLowerCase().replace(/^#+/, '') === g.tag.toLowerCase().replace(/^#+/, '')
        );
        const matchesCluster = s.cluster.toLowerCase() === g.name.toLowerCase();
        if (!matchesId && !matchesName && !matchesTag && !matchesCluster) {
          return false;
        }
      }

      return true;
    });
  }, [stars, currentUser, selectedGalaxyForFilter]);

  // Dynamic Edges calculation across visible stars
  const edges = useMemo(() => {
    return computeConstellationEdges(visibleStars);
  }, [visibleStars]);

  // Dynamically aggregated cluster universes (default presets + Our Universe + user/AI created + custom universes)
  const allClusters = useMemo(() => {
    const clusterSet = new Set<string>(['Our Universe', ...DEFAULT_CLUSTERS]);
    const storedUniverses = getStoredUniverses();
    for (const u of storedUniverses) {
      if (u.name && u.name.trim()) {
        if (u.isPrivate) {
          if (currentUser && (u.ownerId === currentUser.id || u.memberIds.includes(currentUser.id))) {
            clusterSet.add(u.name.trim());
          }
        } else {
          clusterSet.add(u.name.trim());
        }
      }
    }
    for (const s of visibleStars) {
      if (s.cluster && s.cluster.trim()) {
        clusterSet.add(s.cluster.trim());
      }
      if (s.universeName && s.universeName.trim()) {
        clusterSet.add(s.universeName.trim());
      }
      if (s.universes && Array.isArray(s.universes)) {
        s.universes.forEach((u) => {
          if (u && u.trim()) clusterSet.add(u.trim());
        });
      }
    }
    return Array.from(clusterSet);
  }, [visibleStars, currentUser]);

  // Selected Star Object
  const selectedStar = useMemo(() => {
    return visibleStars.find(s => s.id === selectedStarId) || null;
  }, [visibleStars, selectedStarId]);

  // Smooth Focus on Star
  const handleFocusStarInCanvas = useCallback((targetStar: StarNode) => {
    setViewport(prev => {
      const targetZoom = Math.max(1.0, prev.zoom);
      return {
        x: -targetStar.x * targetZoom,
        y: -targetStar.y * targetZoom,
        zoom: targetZoom,
      };
    });
  }, []);

  const handleSelectStar = useCallback((star: StarNode | null) => {
    if (star) {
      setSelectedStarId(star.id);
    } else {
      setSelectedStarId(null);
    }
  }, []);

  // Open Author Profile from Star Detail Drawer or elsewhere
  const handleOpenAuthorProfile = useCallback((authorUser: User) => {
    setSelectedProfileUser(authorUser);
    setIsProfileModalOpen(true);
  }, []);

  // Follow / Unfollow Creator with instant state and localStorage synchronization
  const handleToggleFollow = useCallback((targetUserOrId: User | string) => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Sign in to follow creators.');
      return;
    }
    let targetUser: User | undefined;
    if (typeof targetUserOrId === 'string') {
      const allUsers = getAllRegisteredUsers();
      targetUser = allUsers.find(u => u.id === targetUserOrId);
    } else {
      targetUser = targetUserOrId;
    }
    if (!targetUser) return;
    const result = toggleFollowUser(currentUser, targetUser);
    setCurrentUser(result.updatedCurrentUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.updatedCurrentUser));
    } catch {
      // ignore storage errors
    }
    if (selectedProfileUser && selectedProfileUser.id === targetUser.id) {
      setSelectedProfileUser(result.updatedTargetUser);
    }
  }, [currentUser, selectedProfileUser, handleOpenAuthModal]);

  // Remix Flow (Protected)
  const handleRemix = useCallback((parentStar: StarNode) => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Please sign in or create an account to ignite a new star.');
      return;
    }
    setRemixParentStar(parentStar);
    setCustomSpawnPos(null);
    setIsCreateModalOpen(true);
  }, [currentUser, handleOpenAuthModal]);

  // Handle Double Click on Canvas to Spawn (Protected)
  const handleDoubleCanvasClick = useCallback((worldPos: { x: number; y: number }) => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Please sign in or create an account to ignite a new star.');
      return;
    }
    setRemixParentStar(null);
    setCustomSpawnPos(worldPos);
    setIsCreateModalOpen(true);
  }, [currentUser, handleOpenAuthModal]);

  // Handle Star Creation Submission
  const handleCreateStarSubmit = (starData: {
    title: string;
    authorName: string;
    authorHandle: string;
    cluster: StarCluster;
    universeName?: string;
    universes?: string[];
    content: string;
    tags: string[];
    glowColor: string;
    visibility: StarVisibility;
    allowedUserIds?: string[];
    imageUrl?: string;
    parentId?: string;
    parentTitle?: string;
    userId?: string;
    authorId?: string;
    isNsfw?: boolean;
    fontFamily?: string;
  }) => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Please sign in or create an account to ignite a new star.');
      return;
    }

    // Determine spawn position
    let pos: { x: number; y: number };
    if (customSpawnPos) {
      pos = customSpawnPos;
    } else {
      pos = calculateSpawnPosition(remixParentStar, starData.cluster, stars);
    }

    const newStarId = `star-${Date.now()}`;
    const newStar: StarNode = {
      id: newStarId,
      userId: currentUser.id,
      authorId: currentUser.id,
      title: starData.title,
      author: {
        name: currentUser.displayName || currentUser.username || 'Cosmic Explorer',
        handle: currentUser.handle.startsWith('@') ? currentUser.handle : `@${currentUser.handle}`,
        avatarUrl: currentUser?.avatarUrl,
      },
      createdAt: 'Just now',
      visibility: starData.visibility,
      allowedUserIds: starData.allowedUserIds,
      cluster: starData.cluster,
      universeName: starData.universeName,
      universes: starData.universes || (starData.universeName ? [starData.universeName] : [starData.cluster]),
      content: starData.content,
      fontFamily: starData.fontFamily,
      tags: starData.tags,
      glowColor: starData.glowColor,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      radius: 11,
      parentId: starData.parentId,
      parentTitle: starData.parentTitle,
      remixCount: 0,
      likes: currentUser ? [currentUser.id] : [],
      imageUrl: starData.imageUrl,
      isUserCreated: true,
      isNsfw: Boolean(starData.isNsfw),
    };

    // If it's a remix, increment parent's remixCount
    let updatedStars = [...stars];
    if (starData.parentId) {
      updatedStars = updatedStars.map(s => {
        if (s.id === starData.parentId) {
          return { ...s, remixCount: s.remixCount + 1 };
        }
        return s;
      });
    }

    // Add new star
    updatedStars.push(newStar);
    setStars(updatedStars);

    // Select the new star and focus viewport on it
    setSelectedStarId(newStar.id);
    handleFocusStarInCanvas(newStar);

    // Reset temporary states
    setRemixParentStar(null);
    setCustomSpawnPos(null);
  };

  // Handle Like / Unlike Toggle
  const handleLikeStar = useCallback((starId: string) => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Please sign in or create an account to resonate with stars.');
      return;
    }
    setStars(prev => prev.map(s => {
      if (s.id === starId) {
        return toggleStarLike(s, currentUser.id);
      }
      return s;
    }));
  }, [currentUser, handleOpenAuthModal]);

  // Handle Reignite (Repost) Toggle
  const handleToggleReignite = useCallback((starId: string) => {
    if (!currentUser || currentUser.isGuest) {
      handleOpenAuthModal('signin', 'Please sign in or create an account to reignite stars.');
      return;
    }
    setStars(prev => prev.map(s => {
      if (s.id === starId) {
        return toggleStarReignite(s, currentUser.id);
      }
      return s;
    }));
  }, [currentUser, handleOpenAuthModal]);

  // Handle Pin / Unpin as North Star (Limit 3)
  const handleTogglePin = useCallback((starId: string) => {
    if (!currentUser) return;
    const currentUserId = currentUser.id;
    const target = stars.find(s => s.id === starId);
    if (!target) return;

    const isAuthor =
      (target.authorId && target.authorId === currentUserId) ||
      (target.userId && target.userId === currentUserId) ||
      (target.author?.handle && target.author.handle.toLowerCase().replace(/^@/, '') === currentUser.handle.toLowerCase().replace(/^@/, ''));

    if (!isAuthor) {
      setToastNotification('Only the author can pin a star as North Star ⭐');
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    const willBePinned = !target.isPinned;
    if (willBePinned) {
      const userPinnedCount = stars.filter(s => {
        const isMine =
          (s.authorId && s.authorId === currentUserId) ||
          (s.userId && s.userId === currentUserId) ||
          (s.author?.handle && s.author.handle.toLowerCase().replace(/^@/, '') === currentUser.handle.toLowerCase().replace(/^@/, ''));
        return isMine && s.isPinned;
      }).length;

      if (userPinnedCount >= 3) {
        setToastNotification('Maximum 3 North Stars ⭐ can be pinned.');
        setTimeout(() => setToastNotification(null), 3500);
        return;
      }
    }

    setStars(prev => prev.map(s => {
      if (s.id === starId) {
        return { ...s, isPinned: willBePinned };
      }
      return s;
    }));

    setToastNotification(willBePinned ? 'Pinned as North Star ⭐' : 'Unpinned from North Star ⭐');
    setTimeout(() => setToastNotification(null), 3000);
  }, [currentUser, stars]);

  // Handle Reform Star (Edit)
  const handleReformStar = useCallback((star: StarNode) => {
    setEditingStar(star);
    setInitialDraftToResume(null);
    setRemixParentStar(null);
    setCustomSpawnPos(null);
    setIsCreateModalOpen(true);
  }, []);

  // Handle Update Reformed Star
  const handleUpdateStar = useCallback((starId: string, updatedData: Partial<StarNode>) => {
    setStars(prev => prev.map(s => {
      if (s.id === starId) {
        return {
          ...s,
          ...updatedData,
          isReformed: true,
          reformedAt: 'Just now',
        };
      }
      return s;
    }));
    setToastNotification('Star reformed successfully ⭐');
    setTimeout(() => setToastNotification(null), 3500);
  }, []);

  // Handle Resume Unlit Star Draft
  const handleResumeDraft = useCallback((draft: UnlitStarDraft) => {
    setInitialDraftToResume(draft);
    setEditingStar(null);
    setRemixParentStar(null);
    setCustomSpawnPos(null);
    setIsCreateModalOpen(true);
  }, []);

  // Handle Delete
  const handleDeleteStar = useCallback((starId: string) => {
    setStars(prev => prev.filter(s => s.id !== starId));
    if (selectedStarId === starId) {
      setSelectedStarId(null);
    }
  }, [selectedStarId]);

  // Tag Click (opens Nebula modal and highlights tag)
  const handleTagClick = useCallback((tag: string) => {
    setHighlightedTag(prev => (prev === tag ? null : tag));
    handleOpenNebulaModal(tag);
  }, [handleOpenNebulaModal]);

  // Zoom Controls
  const handleZoomIn = () => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.min(3.2, prev.zoom * 1.25),
    }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(0.25, prev.zoom / 1.25),
    }));
  };

  const handleResetView = () => {
    setViewport({
      x: 0,
      y: 0,
      zoom: 0.95,
    });
  };

  // If user is not authenticated, render the Landing / Auth Gate view
  if (!currentUser) {
    return (
      <div
        id="constellation-landing-root"
        className="dark min-h-screen w-full flex flex-col items-center justify-center overflow-y-auto bg-[#0A0E1A] text-slate-100 font-sans select-none"
      >
        {/* Global Toast Notification */}
        {toastNotification && (
          <div
            id="constellation-toast-notification"
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl frosted-glass-panel backdrop-blur-2xl bg-[#040a1c]/95 border border-amber-300/40 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(255,215,0,0.2)] text-xs text-amber-200 animate-in fade-in slide-in-from-top-3 duration-200"
          >
            <div className="p-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="font-medium text-slate-100">{toastNotification}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <LandingAuth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div
      id="constellation-app-root"
      className={`relative w-screen h-screen overflow-hidden font-sans select-none ${
        isDarkMode ? "dark bg-[#0A0E1A] text-slate-100" : "light bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Header & Cluster Filter Bar */}
      <Header
        activeCluster={activeCluster}
        onSelectCluster={(c) => {
          setActiveCluster(c);
          setHighlightedTag(null);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateModal={() => {
          if (!currentUser) {
            handleOpenAuthModal('signin', 'Please sign in or create an account to ignite a new star.');
            return;
          }
          setRemixParentStar(null);
          setCustomSpawnPos(null);
          setInitialTagForCreateModal(null);
          setInitialGalaxyForCreateModal(null);
          setIsCreateModalOpen(true);
        }}
        totalStarsCount={visibleStars.length}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onOpenProfileModal={() => {
          setSelectedProfileUser(null);
          setIsProfileModalOpen(true);
        }}
        onOpenSearchModal={handleOpenSearchModal}
        onOpenChat={() => handleOpenChat()}
        onOpenGalaxiesModal={() => handleOpenGalaxiesModal()}
        onToggleDiscoverySidebar={() => setIsDiscoverySidebarOpen(prev => !prev)}
        isDiscoverySidebarOpen={isDiscoverySidebarOpen}
        selectedGalaxy={selectedGalaxyForFilter}
        onClearGalaxyFilter={handleClearGalaxyFilter}
        clusters={allClusters}
        storyGroups={storyGroups}
        liveBroadcasts={liveBroadcasts}
        onOpenStoryViewer={handleOpenStoryViewer}
        onOpenCreateStory={handleOpenCreateStory}
        onOpenBroadcast={handleOpenBroadcast}
        onOpenGoLive={handleOpenGoLive}
        showStoriesBar={showStoriesBar}
        onToggleStoriesBar={() => setShowStoriesBar(prev => !prev)}
      />

      {/* Global Toast Notification */}
      {toastNotification && (
        <div
          id="constellation-toast-notification"
          className="fixed top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl frosted-glass-panel backdrop-blur-2xl bg-white/95 dark:bg-[#040a1c]/95 border border-amber-500/30 dark:border-amber-300/40 shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(255,215,0,0.2)] text-xs text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div className="p-1 rounded-full bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-400/30">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">{toastNotification}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Full-Viewport HTML5 Canvas */}
      <main className={`w-full h-full ${showStoriesBar ? 'pt-48 sm:pt-48' : 'pt-28'} transition-all duration-300`}>
        <ConstellationCanvas
          stars={visibleStars}
          edges={edges}
          selectedStarId={selectedStarId}
          activeCluster={activeCluster}
          searchQuery={searchQuery}
          highlightedTag={highlightedTag}
          viewport={viewport}
          onViewportChange={setViewport}
          onSelectStar={handleSelectStar}
          onDoubleCanvasClick={handleDoubleCanvasClick}
          showLabels={showLabels}
          showLines={showLines}
          currentUser={currentUser}
        >
          {/* Empty Canvas Cosmic Guide in natural canvas flow */}
          {visibleStars.length === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 z-10">
              <div className="pointer-events-auto max-w-md w-full text-center p-6 sm:p-8 rounded-3xl bg-white/60 dark:bg-[#07132c]/70 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl transition-all">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-400/10 text-amber-500 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  🌌
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  The Universe Awaits Your Spark
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  No stars have been lit in this quadrant yet. Double-click anywhere on the canvas or click create below to ignite your first star.
                </p>
                <button
                  type="button"
                  id="btn-empty-state-ignite-first-star"
                  onClick={() => {
                    setRemixParentStar(null);
                    setCustomSpawnPos(null);
                    setEditingStar(null);
                    setInitialDraftToResume(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Ignite First Star ⭐</span>
                </button>
              </div>
            </div>
          )}
        </ConstellationCanvas>
      </main>

      {/* Active Tag Filter Pill Indicator (if tag is highlighted) */}
      {highlightedTag && (
        <div className={`fixed ${showStoriesBar ? 'top-52' : 'top-32'} left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full frosted-glass-panel backdrop-blur-xl bg-amber-950/60 border border-amber-400/40 shadow-[0_0_24px_rgba(255,215,0,0.3)] text-xs text-amber-200 transition-all duration-300`}>
          <span>Filtering by tag: <strong className="text-white">{highlightedTag}</strong></span>
          <button
            onClick={() => setHighlightedTag(null)}
            className="hover:text-white p-0.5 rounded-full hover:bg-amber-500/20 cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Floating Canvas Controls */}
      <FloatingControls
        viewport={viewport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels(!showLabels)}
        showLines={showLines}
        onToggleLines={() => setShowLines(!showLines)}
        starsCount={visibleStars.length}
        edgesCount={edges.length}
      />

      {/* Slide-Over Star Detail Drawer */}
      <StarDetailDrawer
        star={selectedStar}
        allStars={visibleStars}
        edges={edges}
        currentUser={currentUser}
        onClose={() => setSelectedStarId(null)}
        onRemix={handleRemix}
        onSelectStar={(target) => {
          setSelectedStarId(target.id);
          handleFocusStarInCanvas(target);
        }}
        onTagClick={handleTagClick}
        onLikeStar={handleLikeStar}
        onToggleReignite={handleToggleReignite}
        onTogglePin={handleTogglePin}
        onReformStar={handleReformStar}
        onDeleteStar={handleDeleteStar}
        onFocusInCanvas={handleFocusStarInCanvas}
        onOpenAuthorProfile={handleOpenAuthorProfile}
        onOpenAuthModal={handleOpenAuthModal}
        onToggleFollow={handleToggleFollow}
        onStartChat={(targetAuthor) => handleOpenChat(targetAuthor)}
      />

      {/* Post Creation & Remix Modal Form */}
      <CreateStarModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setRemixParentStar(null);
          setCustomSpawnPos(null);
          setEditingStar(null);
          setInitialDraftToResume(null);
          setInitialTagForCreateModal(null);
          setInitialGalaxyForCreateModal(null);
        }}
        onSubmit={handleCreateStarSubmit}
        remixParentStar={remixParentStar}
        defaultCluster={activeCluster}
        defaultGalaxy={initialGalaxyForCreateModal}
        initialTag={initialTagForCreateModal}
        currentUser={currentUser}
        availableClusters={allClusters}
        editingStar={editingStar}
        onUpdateStar={handleUpdateStar}
        initialDraft={initialDraftToResume}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        bannerMessage={authBannerMessage}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthBannerMessage(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfileUser(null);
        }}
        currentUser={currentUser}
        targetUser={selectedProfileUser}
        allStars={visibleStars}
        onSelectStar={(targetStar) => {
          setSelectedStarId(targetStar.id);
          handleFocusStarInCanvas(targetStar);
        }}
        onOpenCreateModal={() => {
          setRemixParentStar(null);
          setCustomSpawnPos(null);
          setEditingStar(null);
          setInitialDraftToResume(null);
          setIsCreateModalOpen(true);
        }}
        onResumeDraft={handleResumeDraft}
        onSelectCluster={(cluster) => {
          setActiveCluster(cluster);
          setHighlightedTag(null);
        }}
        onUpdateUser={handleUpdateUser}
        onToggleFollow={handleToggleFollow}
        onStartChat={(targetUser) => handleOpenChat(targetUser)}
        onToggleLike={handleLikeStar}
        onToggleReignite={handleToggleReignite}
        onTogglePin={handleTogglePin}
        onReformStar={handleReformStar}
      />

      {/* Categorical Cosmic Search & Filter Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        stars={visibleStars}
        currentUser={currentUser}
        initialQuery={searchModalInitialQuery}
        initialCategory={searchModalCategory}
        onSelectStar={(targetStar) => {
          setSelectedStarId(targetStar.id);
          handleFocusStarInCanvas(targetStar);
        }}
        onOpenUserProfile={(targetUser) => {
          setSelectedProfileUser(targetUser);
          setIsProfileModalOpen(true);
        }}
        onSelectUniverse={(cluster) => {
          if (cluster === 'All') {
            setActiveCluster('All');
          } else if (cluster === 'shared' || cluster === 'private') {
            setActiveCluster('All');
          } else {
            setActiveCluster(cluster);
          }
          setHighlightedTag(null);
        }}
        onToggleLike={handleLikeStar}
        onToggleFollow={handleToggleFollow}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Private Direct & Group Messaging Drawer */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => {
          setIsChatDrawerOpen(false);
          setChatDrawerInitialRoomId(null);
          setChatDrawerInitialTargetUser(null);
        }}
        currentUser={currentUser}
        initialRoomId={chatDrawerInitialRoomId}
        initialTargetUser={chatDrawerInitialTargetUser}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenUserProfile={(user) => {
          setSelectedProfileUser(user);
          setIsProfileModalOpen(true);
        }}
      />

      {/* Galaxies 🌌 (Topic Communities Hub) Modal */}
      <GalaxiesModal
        isOpen={isGalaxiesModalOpen}
        onClose={() => {
          setIsGalaxiesModalOpen(false);
          setInitialGalaxyIdForModal(null);
        }}
        stars={visibleStars}
        currentUser={currentUser}
        initialGalaxyId={initialGalaxyIdForModal}
        onSelectStar={(targetStar) => {
          setSelectedStarId(targetStar.id);
          handleFocusStarInCanvas(targetStar);
        }}
        onOpenAuthorProfile={handleOpenAuthorProfile}
        onTagClick={handleOpenNebulaModal}
        onToggleLike={handleLikeStar}
        onToggleReignite={handleToggleReignite}
        onTogglePin={handleTogglePin}
        onReformStar={handleReformStar}
        onDeleteStar={handleDeleteStar}
        onStartChat={(targetUser) => handleOpenChat(targetUser)}
        onOpenCreateStarInGalaxy={handleOpenCreateInGalaxy}
        onOpenAuthModal={handleOpenAuthModal}
        onFilterCosmosByGalaxy={handleFilterCosmosByGalaxy}
      />

      {/* Nebula 🌫️✨ (Hashtags) Modal */}
      <NebulaModal
        isOpen={isNebulaModalOpen}
        tag={activeNebulaTag}
        stars={visibleStars}
        currentUser={currentUser}
        onClose={() => {
          setIsNebulaModalOpen(false);
          setActiveNebulaTag(null);
        }}
        onSelectStar={(targetStar) => {
          setSelectedStarId(targetStar.id);
          handleFocusStarInCanvas(targetStar);
        }}
        onOpenAuthorProfile={handleOpenAuthorProfile}
        onTagClick={handleOpenNebulaModal}
        onToggleLike={handleLikeStar}
        onToggleReignite={handleToggleReignite}
        onTogglePin={handleTogglePin}
        onReformStar={handleReformStar}
        onDeleteStar={handleDeleteStar}
        onStartChat={(targetUser) => handleOpenChat(targetUser)}
        onOpenCreateModalWithTag={handleOpenCreateWithTag}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Discovery Sidebar 🪐 (Potential Orbits, Brightest Nebulas, Galaxies) */}
      <DiscoverySidebar
        isOpen={isDiscoverySidebarOpen}
        onClose={() => setIsDiscoverySidebarOpen(false)}
        stars={visibleStars}
        currentUser={currentUser}
        onSelectTag={(tag) => handleOpenNebulaModal(tag)}
        onOpenGalaxies={(galaxyId) => handleOpenGalaxiesModal(galaxyId)}
        onOpenUserProfile={(user) => {
          setSelectedProfileUser(user);
          setIsProfileModalOpen(true);
        }}
        onToggleFollow={handleToggleFollow}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Interactive Starlight Galaxy Cursor Trail */}
      <GalaxyCursorTrail />

      {/* Star Story Creation Modal (24-Hour Ephemeral Sky) */}
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={() => setIsCreateStoryModalOpen(false)}
        currentUser={currentUser}
        onStoryCreated={handleStoryCreated}
      />

      {/* Star Story Viewer Modal */}
      <StoryViewerModal
        isOpen={isStoryViewerModalOpen}
        onClose={() => setIsStoryViewerModalOpen(false)}
        groups={storyGroups}
        initialAuthorIndex={selectedStoryAuthorIndex}
        currentUser={currentUser}
        onDeleteStory={handleDeleteStory}
        onSendSignalReply={handleSendStorySignalReply}
        onMarkAsViewed={handleMarkStoryViewed}
        onOpenProfile={(user) => {
          setSelectedProfileUser(user);
          setIsProfileModalOpen(true);
        }}
      />

      {/* Cosmic Broadcast 🌌📡 (Live Stream / Go Live Star) Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => {
          setIsBroadcastModalOpen(false);
          setActiveBroadcastId(null);
          setIsStartingBroadcast(false);
        }}
        currentUser={currentUser}
        initialBroadcastId={activeBroadcastId}
        isStartingBroadcast={isStartingBroadcast}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenUserProfile={(user) => {
          setSelectedProfileUser(user);
          setIsProfileModalOpen(true);
        }}
      />
    </div>
  );
}

