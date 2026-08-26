import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Globe,
  Users,
  Key,
  Palette,
  Check,
  Orbit,
  Info,
} from 'lucide-react';
import { Universe, User } from '../types';
import { UNIVERSE_PRESET_COLORS, DEFAULT_UNIVERSE_GLOW, hexToRgba } from '../utils/colorPalette';
import { saveUniverse } from '../utils/universeRegistry';
import { getAllRegisteredUsers } from '../utils/userRegistry';

interface CreateUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUniverseCreated?: (newUniverse: Universe) => void;
  currentUser: User | null;
  initialUniverseName?: string;
  initialVisibility?: 'public' | 'shared' | 'only_me';
}

export const CreateUniverseModal: React.FC<CreateUniverseModalProps> = ({
  isOpen,
  onClose,
  onUniverseCreated,
  currentUser,
  initialUniverseName = '',
  initialVisibility = 'public',
}) => {
  const [universeName, setUniverseName] = useState(initialUniverseName);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'shared' | 'only_me'>(initialVisibility);
  const [glowColor, setGlowColor] = useState<string>('#FFD700');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial values on open
  useEffect(() => {
    if (isOpen) {
      setUniverseName(initialUniverseName);
      setDescription('');
      setVisibility(initialVisibility);
      setGlowColor('#FFD700');
      setSelectedMemberIds(currentUser ? [currentUser.id] : ['guest-explorer']);
      setErrorMessage(null);
    }
  }, [isOpen, initialUniverseName, initialVisibility, currentUser]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allUsers = getAllRegisteredUsers();

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllMembers = () => {
    setSelectedMemberIds(allUsers.map((u) => u.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!universeName.trim()) {
      setErrorMessage('Please enter a name for your universe.');
      return;
    }

    const ownerId = currentUser?.id || 'guest-explorer';
    const isPrivate = visibility === 'only_me';
    const finalMemberIds = Array.from(
      new Set([ownerId, ...(visibility === 'shared' ? selectedMemberIds : [])])
    );

    const newUniverse: Universe = {
      id: `universe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: universeName.trim(),
      isPrivate,
      ownerId,
      memberIds: finalMemberIds,
      glowColor: glowColor || DEFAULT_UNIVERSE_GLOW,
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    saveUniverse(newUniverse);
    if (onUniverseCreated) {
      onUniverseCreated(newUniverse);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="create-universe-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="create-universe-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-lg rounded-3xl bg-[#0A0E1A]/95 text-slate-100 border border-slate-700/60 shadow-2xl backdrop-blur-xl overflow-hidden my-6"
          style={{
            boxShadow: `0 0 40px ${hexToRgba(glowColor, 0.25)}, 0 20px 30px rgba(0,0,0,0.7)`,
          }}
        >
          {/* Top Decorative Header Accent */}
          <div
            className="h-1.5 w-full transition-all duration-300"
            style={{
              background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
            }}
          />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center border transition-all duration-300"
                style={{
                  backgroundColor: hexToRgba(glowColor, 0.15),
                  borderColor: hexToRgba(glowColor, 0.4),
                  color: glowColor,
                  boxShadow: `0 0 15px ${hexToRgba(glowColor, 0.3)}`,
                }}
              >
                <Orbit className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Create New Universe</span>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: glowColor }} />
                </h2>
                <p className="text-xs text-slate-400">
                  Establish a thematic constellation realm across the cosmos
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-create-universe"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body / Form */}
          <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Universe Name */}
            <div>
              <label
                htmlFor="input-universe-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Universe Name *
              </label>
              <input
                id="input-universe-name"
                type="text"
                value={universeName}
                onChange={(e) => setUniverseName(e.target.value)}
                placeholder="e.g. Cyber Sanctuary, Quantum Research, Poetry Club..."
                className="w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-500 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                autoFocus
                required
              />
            </div>

            {/* Universe Description */}
            <div>
              <label
                htmlFor="input-universe-description"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Theme Description <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="input-universe-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the cosmic theme or thought space of this universe..."
                className="w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-500 border border-slate-700/80 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-400 transition-colors custom-scrollbar"
              />
            </div>

            {/* Universe Aura Color Selector (User Requirement #2) */}
            <div className="p-4 rounded-2xl bg-[#131B2E]/70 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" style={{ color: glowColor }} />
                  <span>Universe Aura Color</span>
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block shadow-md transition-all"
                    style={{
                      backgroundColor: glowColor,
                      boxShadow: `0 0 8px ${glowColor}`,
                    }}
                  />
                  <span className="text-xs font-mono text-slate-300 uppercase">{glowColor}</span>
                </div>
              </div>

              {/* Preset Swatches Row */}
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-1">
                {UNIVERSE_PRESET_COLORS.map((preset) => {
                  const isSelected = glowColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      id={`universe-preset-color-${preset.hex.replace('#', '')}`}
                      onClick={() => setGlowColor(preset.hex)}
                      title={`${preset.name} (${preset.category})`}
                      className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/10 border-white/80 ring-2 ring-offset-2 ring-offset-[#0A0E1A]'
                          : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'
                      }`}
                      style={{
                        borderColor: isSelected ? preset.hex : undefined,
                        boxShadow: isSelected ? `0 0 14px ${preset.hex}` : 'none',
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs"
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" />}
                      </span>
                      <span className="text-[10px] text-slate-300 text-center font-medium leading-tight truncate w-full">
                        {preset.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}

                {/* Native Custom Color Picker */}
                {(() => {
                  const isCustom = !UNIVERSE_PRESET_COLORS.some(
                    (p) => p.hex.toLowerCase() === glowColor.toLowerCase()
                  );
                  return (
                    <label
                      id="btn-custom-universe-color-picker"
                      title={`Custom Hex Color (${glowColor})`}
                      className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                        isCustom
                          ? 'bg-white/10 border-white/80 ring-2 ring-offset-2 ring-offset-[#0A0E1A]'
                          : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'
                      }`}
                      style={{
                        borderColor: isCustom ? glowColor : undefined,
                        boxShadow: isCustom ? `0 0 14px ${glowColor}` : 'none',
                      }}
                    >
                      <input
                        type="color"
                        value={glowColor.startsWith('#') ? glowColor : '#FFD700'}
                        onChange={(e) => setGlowColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
                        title="Pick custom hex color"
                      />
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 relative overflow-hidden"
                        style={{
                          backgroundColor: isCustom ? glowColor : 'transparent',
                          backgroundImage: isCustom
                            ? 'none'
                            : 'conic-gradient(from 180deg at 50% 50%, #FFD700, #FF70A6, #3A86FF, #06D6A0, #8338EC, #FFD700)',
                        }}
                      >
                        <Palette className="w-3.5 h-3.5 text-white mix-blend-difference" />
                      </span>
                      <span className="text-[10px] text-slate-300 text-center font-medium leading-tight truncate w-full">
                        Custom
                      </span>
                    </label>
                  );
                })()}
              </div>

              {/* Live Preview of Universe Node Aura */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-slate-700/50"
                style={{
                  borderColor: hexToRgba(glowColor, 0.4),
                }}
              >
                <div className="relative flex items-center justify-center shrink-0 w-8 h-8">
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: glowColor }}
                  />
                  <div
                    className="w-5 h-5 rounded-full shadow-lg"
                    style={{
                      backgroundColor: glowColor,
                      boxShadow: `0 0 16px ${glowColor}`,
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {universeName.trim() || 'Universe Name Preview'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Single-universe stars will glow with this radiant aura
                  </div>
                </div>
              </div>
            </div>

            {/* Visibility Mode */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Cosmic Space & Visibility
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  id="btn-universe-visibility-public"
                  onClick={() => setVisibility('public')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    visibility === 'public'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                      : 'bg-[#131B2E] text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-4 h-4 mb-1 text-emerald-400" />
                  <span>Public Universe</span>
                </button>

                <button
                  type="button"
                  id="btn-universe-visibility-shared"
                  onClick={() => setVisibility('shared')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    visibility === 'shared'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 shadow-xs'
                      : 'bg-[#131B2E] text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 mb-1 text-amber-400" />
                  <span>Our Universe</span>
                </button>

                <button
                  type="button"
                  id="btn-universe-visibility-private"
                  onClick={() => setVisibility('only_me')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    visibility === 'only_me'
                      ? 'bg-violet-500/20 text-violet-200 border-violet-400/50 shadow-xs'
                      : 'bg-[#131B2E] text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  <Key className="w-4 h-4 mb-1 text-violet-400" />
                  <span>Private (Only Me)</span>
                </button>
              </div>
            </div>

            {/* Collaborator Selector when Shared */}
            {visibility === 'shared' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-[#131B2E]/70 border border-slate-700/60 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Select Stargazers / Members:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-400/30 cursor-pointer"
                  >
                    Select All
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {allUsers.map((user) => {
                    const isSelected = selectedMemberIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleToggleMember(user.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-100 border-amber-400/40 shadow-xs'
                            : 'bg-black/20 text-slate-300 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-5 h-5 rounded-full object-cover border border-amber-400/30"
                            referrerPolicy="no-referrer"
                          />
                          <span className="truncate font-medium">{user.displayName}</span>
                          <span className="text-[10px] text-slate-500">@{user.handle}</span>
                        </div>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-md bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-md border border-slate-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-create-universe"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-create-universe"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                style={{
                  backgroundColor: glowColor,
                  boxShadow: `0 0 20px ${hexToRgba(glowColor, 0.4)}`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Create Universe</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
