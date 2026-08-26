import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Globe,
  Shield,
  Check,
  AlertCircle,
  Palette,
  Sparkles
} from 'lucide-react';
import { User, ExplorerRole } from '../types';
import { DEFAULT_COSMIC_AVATAR } from '../utils/colorPalette';
import { isDisplayNameTaken, isUsernameTaken, generateCleanHandle, registerUser } from '../utils/userRegistry';
import { TERMS } from '../constants/terminology';
import { GuidingStarBadge, RoleBadge } from './AuthorBadge';

export interface EditSkyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUpdateUser?: (updatedUser: User) => void;
}

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

export const EditSkyModal: React.FC<EditSkyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
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

  // Synchronize editing state whenever modal opens or currentUser changes
  useEffect(() => {
    if (currentUser && isOpen) {
      setEditDisplayName(currentUser.displayName || currentUser.username || '');
      setEditUsername(currentUser.username || currentUser.handle || generateCleanHandle(currentUser.displayName || ''));
      setEditQuote(currentUser.bio || currentUser.quote || DEFAULT_COSMIC_QUOTE);
      setEditAvatarUrl(currentUser.avatarUrl || DEFAULT_COSMIC_AVATAR);
      setEditBannerUrl(currentUser.bannerUrl || DEFAULT_COSMIC_BANNER);
      setEditWebsiteUrl(currentUser.websiteUrl || currentUser.portalUrl || '');
      setEditIsVerified(Boolean(currentUser.isVerified));
      setEditRole(currentUser.role || 'EXPLORER');
      setShowUrlInput(false);
      setCustomUrlInputValue('');
      setShowBannerUrlInput(false);
      setCustomBannerUrlInputValue('');
      setEditError('');
    }
  }, [currentUser, isOpen]);

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

  // Save changes to Display Name, Handle/Username, Avatar, Banner, and Quote/Bio
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

    // Check uniqueness if display name changed
    const currentName = (currentUser.displayName || currentUser.username || '').trim().toLowerCase();
    if (trimmedName.toLowerCase() !== currentName) {
      if (isDisplayNameTaken(trimmedName, currentUser.id)) {
        setEditError(`The display name "${trimmedName}" is already claimed in the cosmos.`);
        return;
      }
    }

    // Check uniqueness if handle/username changed
    const currentNormalizedUsername = generateCleanHandle(currentUser.username || currentUser.handle || '');
    if (cleanNewUsername.toLowerCase() !== currentNormalizedUsername.toLowerCase()) {
      if (isUsernameTaken(cleanNewUsername, currentUser.id)) {
        setEditError(`The handle @${cleanNewUsername} is already taken in the cosmos.`);
        return;
      }
    }

    setIsSaving(true);
    setEditError('');

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

      // Close modal
      onClose();
    } catch {
      setEditError('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <AnimatePresence>
      <div
        id="edit-sky-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="edit-sky-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="max-h-[90vh] flex flex-col w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden relative text-slate-900 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Cosmic Header Glow Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-80 z-30" />

          {/* Sticky Top Modal Header */}
          <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Edit Sky 🌌</span>
                  <span className="text-xs font-normal text-slate-400">Profile Settings</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Update your Sky Cover, Star Portrait, Name, Handle, and Star Story
                </p>
              </div>
            </div>
            <button
              id="btn-close-edit-sky-modal"
              onClick={onClose}
              aria-label="Close Edit Sky Modal"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Scroll Area */}
          <form
            id="edit-sky-form"
            onSubmit={handleSaveProfile}
            className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
          >
            {/* Hidden File Inputs */}
            <input
              id="profile-banner-file-input"
              type="file"
              accept="image/*"
              ref={bannerFileInputRef}
              onChange={handleBannerFileChange}
              className="hidden"
            />
            <input
              id="profile-avatar-file-input"
              type="file"
              accept="image/*"
              ref={avatarFileInputRef}
              onChange={handleAvatarFileChange}
              className="hidden"
            />

            {/* SECTION 1: Sky Cover 🌌 (Profile Banner) Controls */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-500" />
                  <span>{TERMS.SKY_COVER} 🌌 (Profile Banner)</span>
                </label>
                {editBannerUrl && editBannerUrl !== DEFAULT_COSMIC_BANNER && (
                  <button
                    type="button"
                    onClick={() => setEditBannerUrl(DEFAULT_COSMIC_BANNER)}
                    className="text-[10px] text-rose-600 dark:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset to Default</span>
                  </button>
                )}
              </div>

              {/* Sky Cover Preview */}
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-amber-300/30 bg-slate-950 group">
                <img
                  src={editBannerUrl || DEFAULT_COSMIC_BANNER}
                  alt="Sky Cover Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-amber-200 border border-amber-300/30 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-300" />
                    <span>Change Cover</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-edit-upload-banner"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                  <span>Upload Image</span>
                </button>

                <button
                  type="button"
                  id="btn-edit-banner-url-toggle"
                  onClick={() => {
                    setShowBannerUrlInput(!showBannerUrlInput);
                    setCustomBannerUrlInputValue(editBannerUrl.startsWith('data:') ? '' : editBannerUrl);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer active:scale-95"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{showBannerUrlInput ? 'Hide URL' : 'Banner URL'}</span>
                </button>
              </div>

              {/* Cosmic Banner Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                  Celestial Presets:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COSMIC_BANNER_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditBannerUrl(preset.url)}
                      className={`group relative h-12 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        editBannerUrl === preset.url
                          ? 'ring-2 ring-amber-400 border-amber-400 scale-[1.03]'
                          : 'border-slate-300 dark:border-white/10 hover:border-amber-400/50'
                      }`}
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-0.5 text-center">
                        <span className="text-[8px] font-bold text-white leading-none line-clamp-1">
                          {preset.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {showBannerUrlInput && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-amber-300/30 animate-in fade-in duration-150">
                  <input
                    type="url"
                    id="input-edit-banner-url"
                    value={customBannerUrlInputValue}
                    onChange={(e) => setCustomBannerUrlInputValue(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none px-2 py-1"
                  />
                  <button
                    type="button"
                    id="btn-apply-banner-url"
                    onClick={() => {
                      if (customBannerUrlInputValue.trim()) {
                        setEditBannerUrl(customBannerUrlInputValue.trim());
                        setShowBannerUrlInput(false);
                      }
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: Star Portrait ⭐ (Avatar) Controls */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-3">
              <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider block">
                {TERMS.AVATAR} (Star Portrait ⭐)
              </label>

              <div className="flex items-center gap-4">
                {/* Avatar Preview */}
                <div
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-300 ring-2 ring-amber-400/30 bg-slate-950 shrink-0 cursor-pointer group shadow-md"
                  title="Click to change portrait photo"
                >
                  <img
                    src={editAvatarUrl || DEFAULT_COSMIC_AVATAR}
                    alt="Portrait Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-amber-300" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-edit-upload-photo"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                    <span>Upload Portrait</span>
                  </button>

                  <button
                    type="button"
                    id="btn-edit-photo-url-prompt"
                    onClick={() => {
                      setShowUrlInput(!showUrlInput);
                      setCustomUrlInputValue(editAvatarUrl.startsWith('data:') ? '' : editAvatarUrl);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer active:scale-95"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{showUrlInput ? 'Hide URL' : 'Portrait URL'}</span>
                  </button>

                  {editAvatarUrl && editAvatarUrl !== DEFAULT_COSMIC_AVATAR && (
                    <button
                      type="button"
                      id="btn-edit-reset-avatar"
                      onClick={() => {
                        setEditAvatarUrl(DEFAULT_COSMIC_AVATAR);
                        if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium transition-all cursor-pointer active:scale-95"
                      title="Reset to default celestial avatar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {showUrlInput && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-amber-300/30 animate-in fade-in duration-150">
                  <input
                    type="url"
                    id="input-edit-avatar-url"
                    value={customUrlInputValue}
                    onChange={(e) => setCustomUrlInputValue(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none px-2 py-1"
                  />
                  <button
                    type="button"
                    id="btn-apply-avatar-url"
                    onClick={() => {
                      if (customUrlInputValue.trim()) {
                        setEditAvatarUrl(customUrlInputValue.trim());
                        setShowUrlInput(false);
                      }
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 3: Name & Handle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-modal-display-name"
                  className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider block"
                >
                  {TERMS.USERNAME} (Display Name)
                </label>
                <input
                  id="edit-modal-display-name"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => {
                    setEditDisplayName(e.target.value);
                    if (editError) setEditError('');
                  }}
                  placeholder="Enter cosmic display name..."
                  maxLength={32}
                  className="w-full bg-slate-50 dark:bg-[#07132c]/90 border border-slate-300 dark:border-amber-300/40 focus:border-amber-500 dark:focus:border-amber-300 focus:ring-1 focus:ring-amber-500/50 dark:focus:ring-amber-300/50 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-modal-username"
                  className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider block"
                >
                  Cosmic Handle (@handle)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs text-amber-600 dark:text-amber-300/70 font-mono select-none">
                    @
                  </span>
                  <input
                    id="edit-modal-username"
                    type="text"
                    value={editUsername}
                    onChange={(e) => {
                      setEditUsername(e.target.value);
                      if (editError) setEditError('');
                    }}
                    placeholder="stargazer_handle"
                    maxLength={32}
                    className="w-full bg-slate-50 dark:bg-[#07132c]/90 border border-slate-300 dark:border-amber-300/40 focus:border-amber-500 dark:focus:border-amber-300 focus:ring-1 focus:ring-amber-500/50 dark:focus:ring-amber-300/50 text-slate-900 dark:text-slate-100 text-sm pl-8 pr-3.5 py-2.5 rounded-xl focus:outline-none transition-all shadow-inner font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Portal 🌀 (Website Link) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-modal-portal-url"
                className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider block flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Portal 🌀 (Website / Link)</span>
              </label>
              <input
                id="edit-modal-portal-url"
                type="url"
                value={editWebsiteUrl}
                onChange={(e) => {
                  setEditWebsiteUrl(e.target.value);
                  if (editError) setEditError('');
                }}
                placeholder="https://yourportal.space or your-portfolio.dev"
                className="w-full bg-slate-50 dark:bg-[#07132c]/90 border border-slate-300 dark:border-amber-300/40 focus:border-amber-500 dark:focus:border-amber-300 focus:ring-1 focus:ring-amber-500/50 dark:focus:ring-amber-300/50 text-slate-900 dark:text-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition-all shadow-inner"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block pl-1">
                External cosmic portal, personal website, or constellation link tree.
              </span>
            </div>

            {/* SECTION 5: Star Story ⭐ (Quote / Bio) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-modal-quote"
                className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider block"
              >
                {TERMS.BIO} (Star Story ⭐)
              </label>
              <textarea
                id="edit-modal-quote"
                rows={3}
                value={editQuote}
                onChange={(e) => {
                  setEditQuote(e.target.value);
                  if (editError) setEditError('');
                }}
                placeholder="Exploring and connecting ideas across the cosmic network..."
                maxLength={180}
                className="w-full bg-slate-50 dark:bg-[#07132c]/90 border border-slate-300 dark:border-amber-300/40 focus:border-amber-500 dark:focus:border-amber-300 focus:ring-1 focus:ring-amber-500/50 dark:focus:ring-amber-300/50 text-slate-900 dark:text-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition-all resize-none shadow-inner"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                <span>Share your celestial vision with other stargazers</span>
                <span>{editQuote.length}/180</span>
              </div>
            </div>

            {/* SECTION 6: Explorer Role & Guiding Star Verification */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Explorer Role & Guiding Star Status</span>
                </label>
              </div>

              {/* Guiding Star Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <GuidingStarBadge isVerified={true} size="md" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {TERMS.VERIFIED_BADGE} (Guiding Star 🌟)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Verified Explorer status with cosmic glowing badge.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-edit-is-verified-modal"
                  onClick={() => setEditIsVerified(!editIsVerified)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    editIsVerified ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      editIsVerified ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Role Selector */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                  Select Explorer Celestial Rank:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['ADMIN', 'MODERATOR', 'EXPLORER'] as ExplorerRole[]).map((r) => {
                    const isSelected = editRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        id={`btn-select-role-modal-${r.toLowerCase()}`}
                        onClick={() => setEditRole(r)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-sm'
                            : 'bg-white/70 dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-amber-400/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <RoleBadge role={r} size="sm" />
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {r === 'ADMIN' && 'Full constellation administrative authority.'}
                          {r === 'MODERATOR' && 'Moderator tools and orbit guardianship.'}
                          {r === 'EXPLORER' && 'Standard cosmic explorer privileges.'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{editError}</span>
              </div>
            )}
          </form>

          {/* Sticky Modal Footer with Actions */}
          <div className="sticky bottom-0 z-10 bg-slate-900/90 backdrop-blur-md px-6 py-4 border-t border-white/10 flex justify-between items-center shrink-0">
            <button
              id="btn-cancel-edit-sky"
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-300 hover:text-white text-xs font-medium cursor-pointer active:scale-95 transition-all"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Cancel</span>
            </button>

            <button
              id="btn-save-edit-sky"
              type="button"
              onClick={() => handleSaveProfile()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:to-yellow-300 text-slate-950 text-xs font-bold shadow-[0_0_20px_rgba(255,215,0,0.35)] border border-amber-200 cursor-pointer active:scale-95 disabled:opacity-60 transition-all"
            >
              {isSaving ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Sky...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
