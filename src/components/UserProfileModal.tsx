import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Orbit, 
  Compass, 
  Heart, 
  GitFork, 
  Calendar, 
  Tag, 
  ExternalLink,
  Plus,
  Layers,
  Star as StarIcon,
  Pencil,
  Check,
  AlertCircle,
  Users,
  Lock,
  ShieldAlert,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Flame,
  Moon,
  Pin,
  Edit3,
  Play,
  Settings,
  Shield,
  UserX,
  UserCheck,
  EyeOff,
  Eye,
  CheckCircle2,
  Clock,
  Globe,
  Link as LinkIcon,
  Palette,
  Bookmark
} from 'lucide-react';
import { User, StarNode, StarCluster, UnlitStarDraft, ExplorerRole } from '../types';
import { DEFAULT_COSMIC_AVATAR, getClusterTheme } from '../utils/colorPalette';
import { FormattedText } from './FormattedText';
import { isDisplayNameTaken, isUsernameTaken, generateCleanHandle, registerUser, toggleFollowUser, getAllRegisteredUsers, checkUserUniquenessInCloud } from '../utils/userRegistry';
import { getStarLikesCount } from '../utils/likesHelper';
import { isStarReignitedByUser, getStarReigniteCount } from '../utils/reigniteHelper';
import { getStoredDrafts, deleteDraft } from '../utils/draftStorage';
import { getSavedStarIds, SAVED_STARS_UPDATED_EVENT } from '../utils/savedStarStorage';
import { 
  isUserEclipsed, 
  eclipseUser, 
  endEclipseUser, 
  getEclipsedExplorers, 
  setPrivateSkyStatus, 
  hasRequestedOrbit, 
  toggleOrbitRequest, 
  approveOrbitRequest, 
  rejectOrbitRequest, 
  getPendingOrbitRequests,
  SAFETY_UPDATE_EVENT
} from '../utils/safetyStorage';
import { TERMS } from '../constants/terminology';
import { GuidingStarBadge, RoleBadge } from './AuthorBadge';
import { EditSkyModal } from './EditSkyModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  targetUser?: User | null;
  allStars: StarNode[];
  onSelectStar: (star: StarNode) => void;
  onOpenCreateModal: () => void;
  onResumeDraft?: (draft: UnlitStarDraft) => void;
  onSelectCluster?: (cluster: StarCluster | 'All') => void;
  onUpdateUser?: (updatedUser: User) => void;
  onToggleFollow?: (targetUser: User) => void;
  onStartChat?: (targetUser: User) => void;
  onToggleLike?: (starId: string) => void;
  onToggleReignite?: (starId: string) => void;
  onTogglePin?: (starId: string) => void;
  onReformStar?: (star: StarNode) => void;
}

type ProfileTab = 'stars' | 'reignited' | 'stargazed' | 'unlit_drafts' | 'universes' | 'settings';

const DEFAULT_COSMIC_QUOTE = 'Exploring and connecting ideas across the cosmic network.';
const AUTH_STORAGE_KEY = 'constellation_auth_user_v1';
const DEFAULT_COSMIC_BANNER = 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80';

const COSMIC_BANNER_PRESETS = [
  { name: 'Stellar Nursery', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Deep Nebula', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Orion Arm', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Cosmic Horizon', url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Quantum Void', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Solar Latitude', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&auto=format&fit=crop&q=80' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  allStars,
  onSelectStar,
  onOpenCreateModal,
  onResumeDraft,
  onSelectCluster,
  onUpdateUser,
  onToggleFollow,
  onStartChat,
  onToggleLike,
  onToggleReignite,
  onTogglePin,
  onReformStar,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('stars');
  const [draftsList, setDraftsList] = useState<UnlitStarDraft[]>([]);
  const [eclipsedExplorers, setEclipsedExplorers] = useState<User[]>([]);
  const [pendingOrbitRequests, setPendingOrbitRequests] = useState<User[]>([]);
  const [eclipseHover, setEclipseHover] = useState(false);
  const [savedStarIds, setSavedStarIds] = useState<string[]>([]);

  // Determine active profile subject (either targetUser or currentUser)
  const activeUser = targetUser || currentUser;
  const isOwnProfile = Boolean(currentUser && activeUser && currentUser.id === activeUser.id);

  // Load and refresh saved stars for active user
  useEffect(() => {
    if (activeUser) {
      setSavedStarIds(getSavedStarIds(activeUser.id));
    } else if (currentUser) {
      setSavedStarIds(getSavedStarIds(currentUser.id));
    }
    const handleSavedUpdate = () => {
      if (activeUser) {
        setSavedStarIds(getSavedStarIds(activeUser.id));
      } else if (currentUser) {
        setSavedStarIds(getSavedStarIds(currentUser.id));
      }
    };
    window.addEventListener(SAVED_STARS_UPDATED_EVENT, handleSavedUpdate);
    return () => window.removeEventListener(SAVED_STARS_UPDATED_EVENT, handleSavedUpdate);
  }, [activeUser, currentUser]);

  // Load and refresh safety lists (Eclipsed Explorers and Orbit Requests)
  const refreshSafetyData = () => {
    if (currentUser) {
      setEclipsedExplorers(getEclipsedExplorers(currentUser.id));
      setPendingOrbitRequests(getPendingOrbitRequests(currentUser.id));
    }
  };

  useEffect(() => {
    refreshSafetyData();

    const handleSafetyUpdate = () => {
      refreshSafetyData();
    };

    window.addEventListener(SAFETY_UPDATE_EVENT, handleSafetyUpdate);
    return () => window.removeEventListener(SAFETY_UPDATE_EVENT, handleSafetyUpdate);
  }, [currentUser]);

  // Load and refresh drafts
  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setDraftsList(getStoredDrafts(currentUser.id));
    }
    const handleDraftsUpdate = () => {
      if (isOwnProfile && currentUser) {
        setDraftsList(getStoredDrafts(currentUser.id));
      }
    };
    window.addEventListener('asterful_drafts_updated', handleDraftsUpdate);
    return () => window.removeEventListener('asterful_drafts_updated', handleDraftsUpdate);
  }, [isOwnProfile, currentUser]);

  // Check if target user is currently Eclipsed by currentUser
  const isTargetEclipsed = useMemo(() => {
    if (!currentUser || !activeUser || isOwnProfile) return false;
    return isUserEclipsed(currentUser.id, activeUser.id);
  }, [currentUser, activeUser, isOwnProfile]);

  // Check if currentUser has an active Orbit Request for activeUser
  const isOrbitRequested = useMemo(() => {
    if (!currentUser || !activeUser || isOwnProfile) return false;
    return hasRequestedOrbit(currentUser.id, activeUser.id);
  }, [currentUser, activeUser, isOwnProfile]);

  // Follow state check
  const isFollowing = useMemo(() => {
    if (!currentUser || !activeUser || isOwnProfile) return false;
    return Boolean(currentUser.following?.includes(activeUser.id));
  }, [currentUser, activeUser, isOwnProfile]);

  // Check if target profile is a Private Sky and currentUser is not following
  const isPrivateSkyLocked = useMemo(() => {
    if (isOwnProfile || !activeUser) return false;
    return Boolean(activeUser.isPrivateSky && !isFollowing);
  }, [isOwnProfile, activeUser, isFollowing]);

  const [followHover, setFollowHover] = useState(false);

  // Inline Profile Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editQuote, setEditQuote] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [editRole, setEditRole] = useState<ExplorerRole>('EXPLORER');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInputValue, setCustomUrlInputValue] = useState('');
  const [showBannerUrlInput, setShowBannerUrlInput] = useState(false);
  const [customBannerUrlInputValue, setCustomBannerUrlInputValue] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize editing state whenever modal opens or activeUser changes
  useEffect(() => {
    if (activeUser) {
      setEditDisplayName(activeUser.displayName || activeUser.username || '');
      setEditUsername(activeUser.username || activeUser.handle || generateCleanHandle(activeUser.displayName || ''));
      setEditQuote(activeUser.bio || activeUser.quote || DEFAULT_COSMIC_QUOTE);
      setEditAvatarUrl(activeUser.avatarUrl || DEFAULT_COSMIC_AVATAR);
      setEditBannerUrl(activeUser.bannerUrl || DEFAULT_COSMIC_BANNER);
      setEditWebsiteUrl(activeUser.websiteUrl || activeUser.portalUrl || '');
      setEditIsVerified(Boolean(activeUser.isVerified));
      setEditRole(activeUser.role || 'EXPLORER');
      setShowUrlInput(false);
      setCustomUrlInputValue('');
      setShowBannerUrlInput(false);
      setCustomBannerUrlInputValue('');
      setEditError('');
      setIsEditing(false);
    }
  }, [activeUser, isOpen]);

  // Primary display name resolution (displayName takes precedence across all views)
  const resolvedDisplayName = activeUser?.displayName || activeUser?.username || 'Cosmic Traveler';
  const resolvedQuote = activeUser?.bio || activeUser?.quote || DEFAULT_COSMIC_QUOTE;
  const resolvedBannerUrl = activeUser?.bannerUrl || DEFAULT_COSMIC_BANNER;
  const resolvedWebsiteUrl = activeUser?.websiteUrl || activeUser?.portalUrl || '';

  // Resolved clean username/handle for gold secondary subtitle (@username)
  const resolvedHandle = useMemo(() => {
    if (!activeUser) return 'stargazer';
    if (activeUser.username) {
      return generateCleanHandle(activeUser.username);
    }
    if (activeUser.handle) {
      return generateCleanHandle(activeUser.handle);
    }
    if (activeUser.displayName) {
      return generateCleanHandle(activeUser.displayName);
    }
    return 'stargazer';
  }, [activeUser]);

  // Handle avatar file selection (local file upload via FileReader)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditError('Profile photo must be smaller than 5MB.');
      return;
    }

    setEditError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setEditAvatarUrl(result);
      }
    };
    reader.onerror = () => {
      setEditError('Failed to read selected image. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Handle banner file selection (local file upload via FileReader)
  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditError('Please select a valid image file (PNG, JPG, WebP, GIF) for Sky Cover.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setEditError('Sky Cover image must be smaller than 8MB.');
      return;
    }

    setEditError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setEditBannerUrl(result);
      }
    };
    reader.onerror = () => {
      setEditError('Failed to read selected Sky Cover image. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Start editing profile
  const handleStartEditing = () => {
    if (!activeUser) return;
    setEditDisplayName(activeUser.displayName || activeUser.username || '');
    setEditUsername(activeUser.username || activeUser.handle || generateCleanHandle(activeUser.displayName || ''));
    setEditQuote(activeUser.bio || activeUser.quote || DEFAULT_COSMIC_QUOTE);
    setEditAvatarUrl(activeUser.avatarUrl || DEFAULT_COSMIC_AVATAR);
    setEditBannerUrl(activeUser.bannerUrl || DEFAULT_COSMIC_BANNER);
    setEditWebsiteUrl(activeUser.websiteUrl || activeUser.portalUrl || '');
    setEditIsVerified(Boolean(activeUser.isVerified));
    setEditRole(activeUser.role || 'EXPLORER');
    setShowUrlInput(false);
    setCustomUrlInputValue('');
    setShowBannerUrlInput(false);
    setCustomBannerUrlInputValue('');
    setEditError('');
    setIsEditing(true);
  };

  // Cancel profile editing
  const handleCancelEditing = () => {
    if (!activeUser) return;
    setEditDisplayName(activeUser.displayName || activeUser.username || '');
    setEditUsername(activeUser.username || activeUser.handle || generateCleanHandle(activeUser.displayName || ''));
    setEditQuote(activeUser.bio || activeUser.quote || DEFAULT_COSMIC_QUOTE);
    setEditAvatarUrl(activeUser.avatarUrl || DEFAULT_COSMIC_AVATAR);
    setEditBannerUrl(activeUser.bannerUrl || DEFAULT_COSMIC_BANNER);
    setEditWebsiteUrl(activeUser.websiteUrl || activeUser.portalUrl || '');
    setEditIsVerified(Boolean(activeUser.isVerified));
    setEditRole(activeUser.role || 'EXPLORER');
    setShowUrlInput(false);
    setCustomUrlInputValue('');
    setShowBannerUrlInput(false);
    setCustomBannerUrlInputValue('');
    setEditError('');
    setIsEditing(false);
  };

  // Filter stars created by active user, with pinned (North Star) sorted first (limit 3)
  const userStars = useMemo(() => {
    if (!activeUser) return [];
    const userId = activeUser.id;
    const userDisplayName = (activeUser.displayName || activeUser.username || '').trim().toLowerCase();
    const userHandle = activeUser.handle?.replace(/^@/, '').trim().toLowerCase();

    const filtered = allStars.filter((star) => {
      if (star.authorId && star.authorId === userId) return true;
      if (star.userId && star.userId === userId) return true;
      if (star.author?.handle && star.author.handle.replace(/^@/, '').trim().toLowerCase() === userHandle) {
        return true;
      }
      if (star.author?.name && star.author.name.trim().toLowerCase() === userDisplayName) {
        return true;
      }
      return false;
    });

    // Pinned posts first (North Star ⭐), max 3 pinned, then remainder
    const pinned = filtered.filter((s) => s.isPinned).slice(0, 3);
    const unpinned = filtered.filter((s) => !pinned.some((p) => p.id === s.id));
    return [...pinned, ...unpinned];
  }, [allStars, activeUser]);

  // Filter stars reignited by active user
  const reignitedStars = useMemo(() => {
    if (!activeUser) return [];
    const userId = activeUser.id;
    return allStars.filter((star) => {
      if (star.reignitedBy && Array.isArray(star.reignitedBy) && star.reignitedBy.includes(userId)) {
        return true;
      }
      return false;
    });
  }, [allStars, activeUser]);

  // Filter stars stargazed (saved) by active user
  const stargazedStars = useMemo(() => {
    if (!activeUser || !Array.isArray(savedStarIds)) return [];
    return allStars.filter((star) => savedStarIds.includes(star.id));
  }, [allStars, activeUser, savedStarIds]);

  // Aggregate user's clusters/universes and tag distribution
  const userUniverses = useMemo(() => {
    const clusterMap = new Map<string, { cluster: string; stars: StarNode[]; tags: Set<string> }>();
    
    userStars.forEach((star) => {
      const uNames = new Set<string>();
      if (star.cluster) uNames.add(star.cluster);
      if (star.universeName) uNames.add(star.universeName);
      if (star.universes && Array.isArray(star.universes)) {
        star.universes.forEach((u) => {
          if (u && u.trim()) uNames.add(u.trim());
        });
      }
      if (uNames.size === 0) uNames.add('General');

      uNames.forEach((clusterName) => {
        if (!clusterMap.has(clusterName)) {
          clusterMap.set(clusterName, {
            cluster: clusterName,
            stars: [],
            tags: new Set<string>(),
          });
        }
        const entry = clusterMap.get(clusterName)!;
        if (!entry.stars.some((s) => s.id === star.id)) {
          entry.stars.push(star);
        }
        star.tags.forEach((t) => entry.tags.add(t));
      });
    });

    return Array.from(clusterMap.values()).map((item) => ({
      cluster: item.cluster,
      stars: item.stars,
      starCount: item.stars.length,
      tags: Array.from(item.tags),
    }));
  }, [userStars]);

  // Calculate cumulative stats
  const totalLikes = useMemo(() => {
    return userStars.reduce((acc, star) => acc + getStarLikesCount(star), 0);
  }, [userStars]);

  const totalRemixes = useMemo(() => {
    return userStars.reduce((acc, star) => acc + (star.remixCount || 0), 0);
  }, [userStars]);

  const handleCardClick = (star: StarNode) => {
    onClose();
    onSelectStar(star);
  };

  const handleResumeDraftClick = (draft: UnlitStarDraft) => {
    onClose();
    if (onResumeDraft) {
      onResumeDraft(draft);
    } else {
      onOpenCreateModal();
    }
  };

  const handleDeleteDraftClick = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    deleteDraft(draftId);
    if (currentUser) {
      setDraftsList(getStoredDrafts(currentUser.id));
    }
  };

  const handleUniverseFilter = (cluster: string) => {
    if (onSelectCluster) {
      onSelectCluster(cluster);
    }
    onClose();
  };

  // Follow / Unfollow handler
  const handleFollowToggle = () => {
    if (!currentUser || !activeUser || isOwnProfile) return;
    
    if (onToggleFollow) {
      onToggleFollow(activeUser);
    }
  };

  // Eclipse 🌒 / End Eclipse handler for target profile
  const handleEclipseToggle = () => {
    if (!currentUser || !activeUser || isOwnProfile) return;
    if (isTargetEclipsed) {
      const res = endEclipseUser(currentUser, activeUser.id);
      if (onUpdateUser) {
        onUpdateUser(res.updatedCurrentUser);
      }
    } else {
      const res = eclipseUser(currentUser, activeUser.id);
      if (onUpdateUser) {
        onUpdateUser(res.updatedCurrentUser);
      }
    }
    refreshSafetyData();
  };

  // Private Sky toggle handler for own profile
  const handleTogglePrivateSky = () => {
    if (!currentUser || !isOwnProfile) return;
    const updated = setPrivateSkyStatus(currentUser, !currentUser.isPrivateSky);
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
  };

  // Approve incoming orbit request ("Join Orbit 🪐")
  const handleApproveOrbitRequest = (requesterId: string) => {
    if (!currentUser) return;
    const res = approveOrbitRequest(currentUser, requesterId);
    if (onUpdateUser) {
      onUpdateUser(res.updatedCurrentUser);
    }
    refreshSafetyData();
  };

  // Reject incoming orbit request ("Pass Orbit")
  const handleRejectOrbitRequest = (requesterId: string) => {
    if (!currentUser) return;
    const updated = rejectOrbitRequest(currentUser, requesterId);
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
    refreshSafetyData();
  };

  // Unblock / End Eclipse for an explorer in Settings
  const handleEndEclipseExplorer = (userId: string) => {
    if (!currentUser) return;
    const res = endEclipseUser(currentUser, userId);
    if (onUpdateUser) {
      onUpdateUser(res.updatedCurrentUser);
    }
    refreshSafetyData();
  };

  // Save changes to Display Name, Handle/Username, Avatar, and Quote/Bio
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    const trimmedName = editDisplayName.trim();
    const trimmedQuote = editQuote.trim();

    if (!trimmedName) {
      setEditError('Display name cannot be empty.');
      return;
    }

    if (trimmedName.length > 32) {
      setEditError('Display name cannot exceed 32 characters.');
      return;
    }

    // Validate and sanitize handle
    const cleanNewUsername = generateCleanHandle(editUsername);
    if (!cleanNewUsername) {
      setEditError('Username handle cannot be empty.');
      return;
    }

    setIsSaving(true);
    setEditError('');

    // Check uniqueness across Firestore Cloud Database and local storage
    const uniquenessCheck = await checkUserUniquenessInCloud({
      displayName: trimmedName,
      handle: cleanNewUsername,
      username: cleanNewUsername,
      excludeUserId: currentUser.id,
    });

    if (!uniquenessCheck.isUnique) {
      setIsSaving(false);
      setEditError(uniquenessCheck.error || 'This display name or handle is already taken in the cosmos.');
      return;
    }

    try {
      const finalQuote = trimmedQuote || DEFAULT_COSMIC_QUOTE;
      const finalAvatar = editAvatarUrl || currentUser.avatarUrl || DEFAULT_COSMIC_AVATAR;
      const finalBanner = editBannerUrl || currentUser.bannerUrl || DEFAULT_COSMIC_BANNER;
      const finalWebsite = editWebsiteUrl.trim();
      const updatedUser: User = {
        ...currentUser,
        displayName: trimmedName,
        username: cleanNewUsername,
        handle: cleanNewUsername,
        bio: finalQuote,
        quote: finalQuote,
        avatarUrl: finalAvatar,
        bannerUrl: finalBanner,
        websiteUrl: finalWebsite,
        portalUrl: finalWebsite,
        isVerified: editIsVerified,
        role: editRole,
      };

      // Persist to localStorage
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      } catch {
        // storage quota fallback
      }

      // Update in registered users database
      registerUser(updatedUser);

      // Invoke parent updater callback
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      // Exit edit mode immediately
      setIsEditing(false);
    } catch {
      setEditError('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !activeUser) return null;

  const glowColor = activeUser.glowColor || '#FFE57F';
  const followersCount = activeUser.followers?.length || 0;
  const followingCount = activeUser.following?.length || 0;

  return (
    <AnimatePresence>
      <div 
        id="user-profile-modal-overlay" 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="user-profile-modal-container"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl frosted-glass-panel bg-white/95 dark:bg-[#040a1c]/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-amber-300/30 shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(255,215,0,0.15)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Cosmic Header Glow Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-80 z-30" />

          {/* Close Button */}
          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            aria-label="Close Profile Modal"
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md border border-white/20 shadow-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 1. Sky Cover 🌌 (Full-Width Profile Banner) */}
          <div className="relative w-full h-36 sm:h-48 md:h-52 bg-slate-950 overflow-hidden shrink-0">
            <img
              id="profile-sky-cover-image"
              src={isEditing ? editBannerUrl || DEFAULT_COSMIC_BANNER : resolvedBannerUrl}
              alt={`${resolvedDisplayName} Sky Cover`}
              className="w-full h-full object-cover brightness-90 transition-all duration-300"
              referrerPolicy="no-referrer"
            />
            {/* Subtle Gradient Overlays for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10 pointer-events-none" />

            {/* Quick "Change Sky Cover 🌌" Action Button (Own Profile, View Mode) */}
            {isOwnProfile && !isEditing && (
              <button
                id="btn-quick-change-sky-cover"
                type="button"
                onClick={handleStartEditing}
                className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-amber-200 hover:text-amber-100 text-xs font-semibold backdrop-blur-md border border-amber-300/30 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Change Sky Cover 🌌 (Profile Banner)"
              >
                <Camera className="w-3.5 h-3.5 text-amber-300" />
                <span>{TERMS.SKY_COVER} 🌌</span>
              </button>
            )}

            {/* Hidden Banner File Input */}
            <input
              id="profile-banner-file-input"
              type="file"
              accept="image/*"
              ref={bannerFileInputRef}
              onChange={handleBannerFileChange}
              className="hidden"
            />
          </div>

          {/* Modal Header & User Hero Info */}
          <div className="px-6 sm:px-8 pb-6 pt-0 border-b border-slate-200 dark:border-amber-300/15 bg-gradient-to-b from-amber-500/[0.05] to-transparent">
            {/* Top Section: Avatar, User Details, and Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full -mt-12 sm:-mt-16 relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 min-w-0 flex-1">
                {/* Glowing Avatar circle (Star Portrait ⭐) */}
                <div className="relative shrink-0 group">
                  <div 
                    id="profile-avatar-circle"
                    onClick={() => {
                      if (isEditing) {
                        avatarFileInputRef.current?.click();
                      }
                    }}
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 p-0.5 bg-slate-100 dark:bg-[#081226] shadow-[0_0_30px_rgba(0,0,0,0.6)] transition-all relative ${
                      isEditing ? 'cursor-pointer hover:border-amber-300 ring-4 ring-amber-400/40' : ''
                    }`}
                    style={{ borderColor: glowColor }}
                    title={isEditing ? 'Click to change Star Portrait ⭐' : resolvedDisplayName}
                  >
                    <img
                      src={(isEditing ? editAvatarUrl : activeUser.avatarUrl) || DEFAULT_COSMIC_AVATAR}
                      alt={resolvedDisplayName}
                      className="w-full h-full object-cover rounded-full"
                      referrerPolicy="no-referrer"
                    />

                    {/* Camera Icon & Change Photo Overlay when Editing */}
                    {isEditing && (
                      <div 
                        id="avatar-change-photo-overlay"
                        className="absolute inset-0 rounded-full bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-amber-200 hover:text-white transition-all border border-amber-300/40 shadow-inner group-hover:bg-black/75"
                      >
                        <Camera className="w-6 h-6 text-amber-300 mb-0.5 animate-pulse" />
                        <span className="text-[9px] font-semibold tracking-tight text-amber-200 text-center leading-none">
                          {TERMS.AVATAR}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hidden File Input for Avatar */}
                  <input
                    id="profile-avatar-file-input"
                    type="file"
                    accept="image/*"
                    ref={avatarFileInputRef}
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  {!isEditing ? (
                    <div 
                      className="absolute bottom-1 right-1 p-1.5 rounded-full bg-white dark:bg-[#040a1c] border border-amber-500/30 dark:border-amber-300/40 shadow-sm"
                      title="Stellar Explorer Status"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 animate-pulse" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="btn-avatar-camera-badge"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 p-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border border-amber-200 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      title="Upload or Change Star Portrait ⭐"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  )}
                </div>

                {/* User Identity Details & Badges */}
                <div className="flex-1 text-center sm:text-left w-full min-w-0 pt-2 sm:pt-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5 justify-center sm:justify-start">
                    {/* Main Header (Large Text): Star Name ⭐ + Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                      <h2 
                        id="profile-primary-title" 
                        className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate"
                      >
                        <span className="truncate">{resolvedDisplayName}</span>
                      </h2>

                      {/* Guiding Star 🌟 (Verified Explorer Badge) */}
                      <GuidingStarBadge isVerified={activeUser.isVerified} size="md" />

                      {/* Galaxy Keeper / Orbit Keeper 🛡️ (Role Badge) */}
                      <RoleBadge role={activeUser.role} size="md" />

                      {activeUser.isGuest && (
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-300/30 shrink-0">
                          Guest
                        </span>
                      )}
                    </div>

                    {/* Action buttons (Edit Profile, Enter Orbit, Send Signal, Eclipse) */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-center sm:justify-start ml-auto">
                      {/* Edit Profile Button (Own Profile Only) */}
                      {isOwnProfile && (
                        <button
                          id="btn-edit-profile"
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-400/15 dark:hover:bg-amber-400/25 border border-amber-500/30 hover:border-amber-500/50 dark:border-amber-300/30 dark:hover:border-amber-300/50 text-amber-800 dark:text-amber-200 text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                          title="Edit Sky Cover, Star Portrait, Name, and Roles"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                          <span>Edit Sky 🌌</span>
                        </button>
                      )}

                      {/* Follow / Following / Orbit Request Toggle Button (Other Users' Profiles Only) */}
                      {!isOwnProfile && currentUser && (
                        <button
                          id="btn-profile-follow-toggle"
                          type="button"
                          onClick={handleFollowToggle}
                          onMouseEnter={() => setFollowHover(true)}
                          onMouseLeave={() => setFollowHover(false)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 whitespace-nowrap ${
                            isFollowing
                              ? followHover
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                              : isOrbitRequested
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40'
                              : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-bold border border-amber-200 shadow-[0_0_16px_rgba(255,215,0,0.35)]'
                          }`}
                        >
                          {isFollowing ? (
                            followHover ? (
                              <span>🪐 Leave Orbit</span>
                            ) : (
                              <span>🪐 In Orbit</span>
                            )
                          ) : isOrbitRequested ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-300" style={{ animationDuration: '4s' }} />
                              <span>Orbit Requested</span>
                            </span>
                          ) : activeUser.isPrivateSky ? (
                            <span>🔒 Request Orbit</span>
                          ) : (
                            <span>🪐 Enter Orbit</span>
                          )}
                        </button>
                      )}

                      {/* Direct Message User button (hidden if eclipsed) */}
                      {!isOwnProfile && activeUser && onStartChat && !isTargetEclipsed && (
                        <button
                          id="btn-profile-message-user"
                          type="button"
                          onClick={() => {
                            onClose();
                            onStartChat(activeUser);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 whitespace-nowrap"
                          title={`📡 Send Signal to @${resolvedHandle}`}
                        >
                          <span>📡 Send Signal</span>
                        </button>
                      )}

                      {/* Eclipse 🌒 / End Eclipse Button (Other Users' Profiles Only) */}
                      {!isOwnProfile && currentUser && activeUser && (
                        <button
                          id="btn-profile-eclipse-toggle"
                          type="button"
                          onClick={handleEclipseToggle}
                          onMouseEnter={() => setEclipseHover(true)}
                          onMouseLeave={() => setEclipseHover(false)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 whitespace-nowrap ${
                            isTargetEclipsed
                              ? eclipseHover
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-500/40 shadow-sm'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              : 'bg-slate-100 hover:bg-rose-500/15 dark:bg-white/[0.06] dark:hover:bg-rose-500/20 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-300 dark:border-white/10'
                          }`}
                          title={isTargetEclipsed ? 'End Eclipse for this explorer' : 'Eclipse 🌒 this explorer to hide their stars and signals'}
                        >
                          {isTargetEclipsed ? (
                            eclipseHover ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                                <span>End Eclipse</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                                <span>🌒 Eclipsed</span>
                              </>
                            )
                          ) : (
                            <>
                              <Moon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              <span>Eclipse 🌒</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Secondary Subtitle (@handle, Joined Date, Portal Link, Private Sky, Eclipsed) */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    <span id="profile-handle-subtitle" className="text-amber-700 dark:text-amber-300 font-medium tracking-wide">
                      @{resolvedHandle}
                    </span>

                    {activeUser.joinedAt && (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>Joined {activeUser.joinedAt}</span>
                      </span>
                    )}

                    {/* Portal 🌀 / Website Link */}
                    {resolvedWebsiteUrl && (
                      <a
                        id="profile-portal-link"
                        href={resolvedWebsiteUrl.startsWith('http') ? resolvedWebsiteUrl : `https://${resolvedWebsiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-200 hover:underline font-semibold transition-colors"
                        title={`Visit Portal: ${resolvedWebsiteUrl}`}
                      >
                        <Globe className="w-3 h-3 text-amber-500" />
                        <span className="truncate max-w-[180px]">{resolvedWebsiteUrl.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}

                    {activeUser.isPrivateSky && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/[0.06] text-amber-800 dark:text-amber-300 border border-slate-300 dark:border-amber-300/20 text-[10px] font-semibold">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{TERMS.PRIVATE_ACCOUNT}</span>
                      </span>
                    )}

                    {isTargetEclipsed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                        <EyeOff className="w-2.5 h-2.5" />
                        <span>Explorer Eclipsed</span>
                      </span>
                    )}
                  </div>

                  {/* Star Story ⭐ (Cosmic Bio / Quote) */}
                  <p id="profile-quote-display" className="text-xs text-slate-600 dark:text-slate-300 max-w-xl line-clamp-3 leading-relaxed">
                    "{resolvedQuote}"
                  </p>
                </div>
              </div>
            </div>

            {/* Dedicated Stats Section Container */}
            <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-slate-200/60 dark:border-white/[0.06] sm:justify-start justify-center flex-wrap sm:flex-nowrap">
              <div 
                id="stat-stars-ignited"
                className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-amber-300/20 backdrop-blur-md min-w-[80px] shrink-0"
              >
                <span className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-200">{userStars.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Stars</span>
              </div>

              <div 
                id="stat-profile-followers"
                className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-amber-300/20 backdrop-blur-md min-w-[80px] shrink-0"
              >
                <span className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-300">{followersCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Followers</span>
              </div>

              <div 
                id="stat-profile-following"
                className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-amber-300/20 backdrop-blur-md min-w-[80px] shrink-0"
              >
                <span className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-300">{followingCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Following</span>
              </div>

              <div 
                id="stat-universes-joined"
                className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-amber-300/20 backdrop-blur-md min-w-[80px] shrink-0"
              >
                <span className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200">{userUniverses.length}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Universes</span>
              </div>

              <div 
                id="stat-cosmic-resonance"
                className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-amber-300/20 backdrop-blur-md min-w-[80px] shrink-0"
              >
                <span className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200">{totalLikes + totalRemixes}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Resonances</span>
              </div>
            </div>

            {/* Navigation Tab Bar */}
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/[0.08] overflow-x-auto custom-scrollbar pb-1">
              <button
                id="tab-my-stars"
                onClick={() => setActiveTab('stars')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'stars'
                    ? 'bg-amber-500/20 dark:bg-amber-400/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 dark:border-amber-300/40 shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <span>{isOwnProfile ? '🌌 Your Sky' : '🌌 Created Stars'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-white/[0.08] text-amber-800 dark:text-amber-300">
                  {userStars.length}
                </span>
              </button>

              <button
                id="tab-reignited-stars"
                onClick={() => setActiveTab('reignited')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'reignited'
                    ? 'bg-orange-500/20 dark:bg-orange-400/20 text-orange-800 dark:text-orange-200 border border-orange-500/40 dark:border-orange-300/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <span>🔥 {TERMS.REPOST}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-white/[0.08] text-orange-800 dark:text-orange-300">
                  {reignitedStars.length}
                </span>
              </button>

              <button
                id="tab-stargazed-stars"
                onClick={() => setActiveTab('stargazed')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'stargazed'
                    ? 'bg-amber-500/25 dark:bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-500/50 dark:border-amber-300/50 shadow-[0_0_15px_rgba(255,215,0,0.25)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <span>🔖 Stargazed</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-white/[0.08] text-amber-800 dark:text-amber-300">
                  {stargazedStars.length}
                </span>
              </button>

              {isOwnProfile && (
                <button
                  id="tab-unlit-stars"
                  onClick={() => setActiveTab('unlit_drafts')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'unlit_drafts'
                      ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-800 dark:text-indigo-200 border border-indigo-500/40 dark:border-indigo-300/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{TERMS.DRAFT}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-white/[0.08] text-indigo-800 dark:text-indigo-300">
                    {draftsList.length}
                  </span>
                </button>
              )}

              <button
                id="tab-universes"
                onClick={() => setActiveTab('universes')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'universes'
                    ? 'bg-amber-500/20 dark:bg-amber-400/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 dark:border-amber-300/40 shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <span>🪐 Universes</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-white/[0.08] text-amber-800 dark:text-amber-300">
                  {userUniverses.length}
                </span>
              </button>

              {isOwnProfile && (
                <button
                  id="tab-control-center"
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'bg-amber-500/25 dark:bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-500/50 dark:border-amber-300/50 shadow-[0_0_15px_rgba(255,215,0,0.25)]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                  <span>{TERMS.SETTINGS}</span>
                  {pendingOrbitRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold animate-pulse">
                      {pendingOrbitRequests.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Modal Body & Dynamic Content Panels */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar max-h-[55vh]">
            {activeTab === 'stars' && (
              <div>
                {/* Check if target explorer is eclipsed */}
                {isTargetEclipsed ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
                      <EyeOff className="w-7 h-7 text-rose-500" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">Explorer Eclipsed 🌒</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                      You have placed @{resolvedHandle} in Eclipse. Their stars, resonance, and direct signals are hidden from your cosmos.
                    </p>
                    <button
                      id="btn-end-eclipse-stars-view"
                      onClick={handleEclipseToggle}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 transition-all cursor-pointer active:scale-95 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>End Eclipse</span>
                    </button>
                  </div>
                ) : isPrivateSkyLocked ? (
                  /* Private Sky Locked Screen */
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-300/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                      <Lock className="w-7 h-7 text-amber-600 dark:text-amber-300" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">{TERMS.PRIVATE_ACCOUNT}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                      This Explorer's Sky is protected. Transmit an Orbit Request to enter @{resolvedHandle}'s orbit and view their ignited stars.
                    </p>
                    <button
                      id="btn-private-sky-orbit-request"
                      onClick={handleFollowToggle}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md active:scale-95 ${
                        isOrbitRequested
                          ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/20'
                          : 'text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:to-yellow-300 border border-amber-200 shadow-[0_0_20px_rgba(255,215,0,0.35)]'
                      }`}
                    >
                      {isOrbitRequested ? (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                          <span>Orbit Requested ⏳ (Click to Cancel)</span>
                        </>
                      ) : (
                        <>
                          <Orbit className="w-4 h-4 text-slate-950" />
                          <span>🪐 Transmit Orbit Request</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : userStars.length === 0 ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-300/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                      <Sparkles className="w-7 h-7 text-amber-600 dark:text-amber-300 animate-pulse" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">No Stars Ignited Yet</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                      {isOwnProfile 
                        ? "You haven't ignited any stars yet. Cast your first creative thought, poem, or idea into the cosmic orbit!"
                        : `${resolvedDisplayName} hasn't ignited any public stars in this region yet.`}
                    </p>
                    {isOwnProfile && (
                      <button
                        id="btn-empty-ignite-star"
                        onClick={() => {
                          onClose();
                          onOpenCreateModal();
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:to-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.35)] border border-amber-200 active:scale-98 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-slate-950" />
                        <span>Ignite First Star</span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Responsive Card Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userStars.map((star) => {
                      const clusterTheme = getClusterTheme(star.cluster);
                      const starGlow = star.glowColor || clusterTheme.color;
                      const isPinned = Boolean(star.isPinned);

                      return (
                        <div
                          key={star.id}
                          id={`profile-star-card-${star.id}`}
                          className={`group relative flex flex-col justify-between p-4 rounded-2xl transition-all duration-200 cursor-pointer ${
                            isPinned
                              ? 'bg-gradient-to-b from-amber-500/[0.08] to-slate-50/95 dark:from-amber-500/[0.12] dark:to-white/[0.04] border-2 border-amber-400/60 dark:border-amber-400/50 shadow-lg shadow-amber-500/10'
                              : 'bg-slate-50/90 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-amber-300/20 hover:border-amber-500/50 dark:hover:border-amber-300/50 shadow-md hover:shadow-[0_0_25px_rgba(255,215,0,0.2)]'
                          }`}
                          onClick={() => handleCardClick(star)}
                        >
                          {/* Top Card Info Bar */}
                          <div>
                            {/* North Star Highlight Badge if pinned */}
                            {isPinned && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 mb-2.5 rounded-lg bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                <span>⭐</span>
                                <span>{TERMS.PINNED_POST}</span>
                              </div>
                            )}

                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border truncate max-w-[130px]"
                                  style={{
                                    backgroundColor: `${clusterTheme.color}20`,
                                    borderColor: `${clusterTheme.color}60`,
                                    color: clusterTheme.color,
                                  }}
                                >
                                  {star.cluster}
                                </span>

                                {star.visibility === 'private' && (
                                  <span 
                                    id={`badge-private-${star.id}`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/15 dark:bg-amber-400/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 dark:border-amber-300/30"
                                    title={star.allowedUserIds && star.allowedUserIds.length > 1 ? `Shared with ${star.allowedUserIds.length} stargazers` : 'My Private Space (Only Me)'}
                                  >
                                    <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" />
                                    <span>{star.allowedUserIds && star.allowedUserIds.length > 1 ? 'Shared' : 'Private'}</span>
                                  </span>
                                )}

                                {star.isNsfw && (
                                  <span 
                                    id={`badge-nsfw-${star.id}`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40"
                                    title="18+ Sensitive Content"
                                  >
                                    <ShieldAlert className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                                    <span>18+</span>
                                  </span>
                                )}
                              </div>

                              {/* Glow Color Dot */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                                  style={{ backgroundColor: starGlow, color: starGlow }}
                                  title={`Glow color: ${starGlow}`}
                                />
                              </div>
                            </div>

                            {/* Title */}
                            <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-200 transition-colors line-clamp-1">
                                {star.title}
                              </h4>
                              {star.isReformed && (
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                  (Reformed)
                                </span>
                              )}
                            </div>

                            {/* Content Body Preview */}
                            <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
                              <FormattedText text={star.content} />
                            </div>

                            {/* Tags Preview */}
                            {star.tags && star.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {star.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] text-amber-800 dark:text-amber-300/80 bg-amber-500/10 dark:bg-amber-400/[0.06] border border-amber-500/20 dark:border-amber-300/20 px-1.5 py-0.5 rounded-md"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {star.tags.length > 3 && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 px-1 py-0.5">
                                    +{star.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Footer Actions & Stats */}
                          <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1" title={`${getStarLikesCount(star)} ${TERMS.LIKE}`}>
                                <Heart className="w-3 h-3 text-pink-500 dark:text-pink-400/80" />
                                <span>{getStarLikesCount(star)}</span>
                              </span>
                              <span className="flex items-center gap-1" title={`${getStarReigniteCount(star)} ${TERMS.REPOST}`}>
                                <Flame className="w-3 h-3 text-orange-500 dark:text-orange-400/80" />
                                <span>{getStarReigniteCount(star)}</span>
                              </span>
                              <span className="flex items-center gap-1" title={`${star.remixCount || 0} ${TERMS.REMIX}`}>
                                <GitFork className="w-3 h-3 text-amber-600 dark:text-amber-300/80" />
                                <span>{star.remixCount || 0}</span>
                              </span>
                            </div>

                            {/* View on Graph Button */}
                            <button
                              id={`btn-view-graph-${star.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(star);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 dark:bg-amber-400/15 dark:hover:bg-amber-400/30 border border-amber-500/30 dark:border-amber-300/30 text-amber-800 dark:text-amber-200 text-[11px] font-medium transition-all group-hover:scale-102"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reignited' && (
              <div>
                {reignitedStars.length === 0 ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 dark:bg-orange-400/10 border border-orange-500/30 dark:border-orange-300/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                      <Flame className="w-7 h-7 text-orange-600 dark:text-orange-400 animate-pulse" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">No Stars Reignited Yet</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                      {isOwnProfile
                        ? "Click the 🔥 Reignite button on any star in the cosmos to amplify it across your personal orbit!"
                        : `${resolvedDisplayName} hasn't reignited any stars in their orbit yet.`}
                    </p>
                  </div>
                ) : (
                  /* Reignited Cards Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reignitedStars.map((star) => {
                      const clusterTheme = getClusterTheme(star.cluster);

                      return (
                        <div
                          key={star.id}
                          id={`profile-reignited-card-${star.id}`}
                          className="group relative flex flex-col justify-between p-4 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-orange-400/30 dark:border-orange-400/25 hover:border-orange-500/50 shadow-md hover:shadow-[0_0_25px_rgba(249,115,22,0.2)] transition-all duration-200 cursor-pointer"
                          onClick={() => handleCardClick(star)}
                        >
                          {/* Reignited Banner */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 mb-2.5 rounded-lg bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 text-[11px] font-semibold text-orange-800 dark:text-orange-300">
                            <span>🔥</span>
                            <span className="truncate">Reignited by {resolvedDisplayName}</span>
                          </div>

                          {/* Top Card Info Bar */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span 
                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border truncate max-w-[130px]"
                                style={{
                                  backgroundColor: `${clusterTheme.color}20`,
                                  borderColor: `${clusterTheme.color}60`,
                                  color: clusterTheme.color,
                                }}
                              >
                                {star.cluster}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                by @{(star.author?.handle || star.author?.name || '').replace(/^@/, '')}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors line-clamp-1 mb-1.5">
                              {star.title}
                            </h4>

                            {/* Content Body Preview */}
                            <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
                              <FormattedText text={star.content} />
                            </div>
                          </div>

                          {/* Footer Actions & Stats */}
                          <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1" title={`${getStarLikesCount(star)} ${TERMS.LIKE}`}>
                                <Heart className="w-3 h-3 text-pink-500 dark:text-pink-400/80" />
                                <span>{getStarLikesCount(star)}</span>
                              </span>
                              <span className="flex items-center gap-1" title={`${getStarReigniteCount(star)} ${TERMS.REPOST}`}>
                                <Flame className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                                <span>{getStarReigniteCount(star)}</span>
                              </span>
                            </div>

                            <button
                              id={`btn-view-reignited-${star.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(star);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/30 dark:bg-orange-400/15 dark:hover:bg-orange-400/30 border border-orange-500/30 text-orange-800 dark:text-orange-200 text-[11px] font-medium transition-all group-hover:scale-102"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3 text-orange-600 dark:text-orange-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stargazed' && (
              <div>
                {stargazedStars.length === 0 ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-300/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                      <Bookmark className="w-7 h-7 text-amber-600 dark:text-amber-300" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">No Stargazed Stars yet 🔖</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                      {isOwnProfile
                        ? "Stars you bookmark and stargaze across the cosmic network will be preserved here in your personal stellar archive."
                        : `${resolvedDisplayName} hasn't stargazed any posts yet.`}
                    </p>
                    {isOwnProfile && (
                      <button
                        id="btn-empty-explore-cosmos"
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:to-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.35)] border border-amber-200 active:scale-98 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>Explore the Cosmos</span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Stargazed Stars Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stargazedStars.map((star) => {
                      const clusterTheme = getClusterTheme(star.cluster);

                      return (
                        <div
                          key={star.id}
                          id={`stargazed-card-${star.id}`}
                          className="group relative flex flex-col justify-between p-4 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-amber-400/40 dark:border-amber-400/30 hover:border-amber-400/70 shadow-sm hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] transition-all cursor-pointer"
                          onClick={() => handleCardClick(star)}
                        >
                          <div>
                            {/* Top Card Info Bar */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border truncate"
                                style={{
                                  backgroundColor: `${clusterTheme.color}20`,
                                  borderColor: `${clusterTheme.color}60`,
                                  color: clusterTheme.color,
                                }}
                              >
                                {star.cluster}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                by @{(star.author?.handle || star.author?.name || '').replace(/^@/, '')}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors line-clamp-1 mb-1.5">
                              {star.title}
                            </h4>

                            {/* Content Body Preview */}
                            <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
                              <FormattedText text={star.content} />
                            </div>
                          </div>

                          {/* Footer Actions & Stats */}
                          <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1" title={`${getStarLikesCount(star)} ${TERMS.LIKE}`}>
                                <Heart className="w-3 h-3 text-pink-500 dark:text-pink-400/80" />
                                <span>{getStarLikesCount(star)}</span>
                              </span>
                              <span className="flex items-center gap-1" title={`${getStarReigniteCount(star)} ${TERMS.REPOST}`}>
                                <Flame className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                                <span>{getStarReigniteCount(star)}</span>
                              </span>
                            </div>

                            <button
                              id={`btn-view-stargazed-${star.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(star);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 dark:bg-amber-400/15 dark:hover:bg-amber-400/30 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] font-medium transition-all group-hover:scale-102"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'unlit_drafts' && isOwnProfile && (
              <div>
                {draftsList.length === 0 ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-500/30 dark:border-indigo-300/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                      <Moon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">No Unlit Stars</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                      Saved drafts will rest here in the dark sky until you are ready to ignite them into the universe.
                    </p>
                    <button
                      id="btn-draft-compose-new"
                      onClick={() => {
                        onClose();
                        onOpenCreateModal();
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md border border-indigo-400/40 active:scale-98 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>{TERMS.CREATE_POST}</span>
                    </button>
                  </div>
                ) : (
                  /* Drafts List */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {draftsList.map((draft) => {
                      const clusterTheme = getClusterTheme(draft.cluster || 'General');

                      return (
                        <div
                          key={draft.id}
                          id={`draft-card-${draft.id}`}
                          className="group relative flex flex-col justify-between p-4 rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-indigo-300/40 dark:border-indigo-500/30 hover:border-indigo-400/60 shadow-sm transition-all"
                        >
                          <div>
                            {/* Top Info */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border truncate"
                                style={{
                                  backgroundColor: `${clusterTheme.color}20`,
                                  borderColor: `${clusterTheme.color}60`,
                                  color: clusterTheme.color,
                                }}
                              >
                                {draft.cluster || 'General'}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {draft.savedAt || 'Saved Draft'}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1.5">
                              {draft.title || '(Untitled Unlit Star)'}
                            </h4>

                            {/* Content preview */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
                              {draft.content || 'No description entered yet...'}
                            </p>

                            {/* Tags preview */}
                            {draft.tags && draft.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {draft.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2 mt-auto">
                            <button
                              id={`btn-resume-draft-${draft.id}`}
                              type="button"
                              onClick={() => handleResumeDraftClick(draft)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Resume</span>
                            </button>

                            <button
                              id={`btn-delete-draft-${draft.id}`}
                              type="button"
                              onClick={(e) => handleDeleteDraftClick(e, draft.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Unlit Star Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && isOwnProfile && currentUser && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Control Center Header Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 shadow-sm">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{TERMS.SETTINGS}</span>
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">& Privacy</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Control your cosmic visibility, approve orbit requests, and manage eclipsed explorers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 0: Explorer Roles & Authority */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Celestial Authority & Roles 🛡️</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GuidingStarBadge isVerified={currentUser.isVerified} size="sm" />
                      <RoleBadge role={currentUser.role} size="sm" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Galaxy Keepers (Admins) have full authority over all star constellations and orbits. Orbit Keepers (Moderators) can manage content harmony and mute signals.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Change Role or Verification in Edit Profile</span>
                  </button>
                </div>

                {/* Section 1: Private Sky (Account Privacy) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{TERMS.PRIVATE_ACCOUNT}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          currentUser.isPrivateSky
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30'
                            : 'bg-slate-200/80 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
                        }`}>
                          {currentUser.isPrivateSky ? 'Active 🔒' : 'Public Sky 🌐'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                        When enabled, your ignited stars and orbit details are only visible to approved explorers. Other stargazers must send an Orbit Request to enter your orbit.
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      id="toggle-private-sky-switch"
                      type="button"
                      role="switch"
                      aria-checked={currentUser.isPrivateSky}
                      onClick={handleTogglePrivateSky}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentUser.isPrivateSky ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          currentUser.isPrivateSky ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Section 2: Pending Orbit Requests */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Orbit className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Orbit Requests 🪐</h4>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                      {pendingOrbitRequests.length} Pending
                    </span>
                  </div>

                  {pendingOrbitRequests.length === 0 ? (
                    <div className="py-6 px-4 text-center rounded-xl bg-slate-100/60 dark:bg-black/20 border border-dashed border-slate-300 dark:border-white/10">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No pending orbit requests. New explorers seeking entry to your sky will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingOrbitRequests.map((requester) => (
                        <div
                          key={requester.id}
                          id={`orbit-request-${requester.id}`}
                          className="p-3 rounded-xl bg-white dark:bg-[#07132c]/80 border border-slate-200 dark:border-amber-300/20 flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={requester.avatarUrl || DEFAULT_COSMIC_AVATAR}
                              alt={requester.displayName || requester.username}
                              className="w-9 h-9 rounded-full object-cover border border-amber-500/30 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {requester.displayName || requester.username}
                              </p>
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-mono truncate">
                                @{requester.username || requester.handle || generateCleanHandle(requester.displayName || '')}
                              </p>
                            </div>
                          </div>

                          {/* Approval Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              id={`btn-approve-orbit-${requester.id}`}
                              type="button"
                              onClick={() => handleApproveOrbitRequest(requester.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Join Orbit 🪐</span>
                            </button>

                            <button
                              id={`btn-reject-orbit-${requester.id}`}
                              type="button"
                              onClick={() => handleRejectOrbitRequest(requester.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-rose-500/20 dark:bg-white/[0.06] dark:hover:bg-rose-500/20 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-300 dark:border-white/10 text-xs font-medium transition-all cursor-pointer active:scale-95"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Pass Orbit</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Eclipsed Explorers (Block List) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-rose-500" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Eclipsed Explorers 🌒</h4>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      {eclipsedExplorers.length} Eclipsed
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Eclipsed explorers are hidden from your Galaxy feed and prevented from sending signals or commenting on your stars.
                  </p>

                  {eclipsedExplorers.length === 0 ? (
                    <div className="py-6 px-4 text-center rounded-xl bg-slate-100/60 dark:bg-black/20 border border-dashed border-slate-300 dark:border-white/10">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No explorers currently in eclipse. All orbits are harmonious.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {eclipsedExplorers.map((eclipsedUser) => (
                        <div
                          key={eclipsedUser.id}
                          id={`eclipsed-user-${eclipsedUser.id}`}
                          className="p-3 rounded-xl bg-white dark:bg-[#07132c]/80 border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={eclipsedUser.avatarUrl || DEFAULT_COSMIC_AVATAR}
                              alt={eclipsedUser.displayName || eclipsedUser.username}
                              className="w-9 h-9 rounded-full object-cover border border-rose-500/30 grayscale opacity-80 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {eclipsedUser.displayName || eclipsedUser.username}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                @{eclipsedUser.username || eclipsedUser.handle || generateCleanHandle(eclipsedUser.displayName || '')}
                              </p>
                            </div>
                          </div>

                          <button
                            id={`btn-end-eclipse-${eclipsedUser.id}`}
                            type="button"
                            onClick={() => handleEndEclipseExplorer(eclipsedUser.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                            <span>End Eclipse</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Bottom Bar */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-amber-300/15 bg-slate-50/90 dark:bg-[#030712]/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
              <span>Asterful Cosmic Identity</span>
            </span>
            <button
              id="btn-close-profile-footer"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-300 dark:border-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>

        {/* Dedicated Scrollable Edit Sky Modal */}
        <EditSkyModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          currentUser={activeUser}
          onUpdateUser={onUpdateUser}
        />
      </div>
    </AnimatePresence>
  );
};

