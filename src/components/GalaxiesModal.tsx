import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Users,
  Search,
  Plus,
  Compass,
  ArrowRight,
  ShieldCheck,
  Check,
  BookOpen,
  Filter,
  Layers,
  Star,
  Orbit,
} from 'lucide-react';
import { Galaxy, StarNode, User } from '../types';
import {
  getStoredGalaxies,
  saveGalaxy,
  toggleJoinGalaxy,
  isUserMemberOfGalaxy,
  GALAXY_UPDATE_EVENT,
} from '../utils/galaxyRegistry';
import { StarCard } from './StarCard';
import { TERMS } from '../constants/terminology';

interface GalaxiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  stars: StarNode[];
  currentUser: User | null;
  initialGalaxyId?: string | null;
  onSelectStar: (star: StarNode) => void;
  onOpenAuthorProfile?: (user: User) => void;
  onTagClick?: (tag: string) => void;
  onToggleLike?: (starId: string) => void;
  onToggleReignite?: (starId: string) => void;
  onTogglePin?: (starId: string) => void;
  onReformStar?: (star: StarNode) => void;
  onDeleteStar?: (starId: string) => void;
  onStartChat?: (user: User) => void;
  onOpenCreateStarInGalaxy?: (galaxy: Galaxy) => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup', bannerMessage?: string) => void;
  onFilterCosmosByGalaxy?: (galaxy: Galaxy) => void;
}

export const GalaxiesModal: React.FC<GalaxiesModalProps> = ({
  isOpen,
  onClose,
  stars,
  currentUser,
  initialGalaxyId,
  onSelectStar,
  onOpenAuthorProfile,
  onTagClick,
  onToggleLike,
  onToggleReignite,
  onTogglePin,
  onReformStar,
  onDeleteStar,
  onStartChat,
  onOpenCreateStarInGalaxy,
  onOpenAuthModal,
  onFilterCosmosByGalaxy,
}) => {
  const [galaxies, setGalaxies] = useState<Galaxy[]>(() => getStoredGalaxies());
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGalaxy, setSelectedGalaxy] = useState<Galaxy | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Galaxy Form state
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState<Galaxy['category']>('Science & Cosmos');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('🌌');
  const [newGlowColor, setNewGlowColor] = useState('#FFD700');
  const [newRuleInput, setNewRuleInput] = useState('');
  const [newRules, setNewRules] = useState<string[]>([
    'Respect fellow explorers.',
    'Share creative and high-signal cosmic discoveries.',
  ]);

  // Sync galaxies from storage
  useEffect(() => {
    const sync = () => {
      setGalaxies(getStoredGalaxies());
    };
    window.addEventListener(GALAXY_UPDATE_EVENT, sync);
    return () => window.removeEventListener(GALAXY_UPDATE_EVENT, sync);
  }, []);

  // Sync initialGalaxyId when modal opens
  useEffect(() => {
    if (isOpen) {
      const all = getStoredGalaxies();
      setGalaxies(all);
      if (initialGalaxyId) {
        const found = all.find((g) => g.id === initialGalaxyId);
        if (found) {
          setSelectedGalaxy(found);
        }
      } else {
        setSelectedGalaxy(null);
      }
      setIsCreatingNew(false);
    }
  }, [isOpen, initialGalaxyId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleJoin = (galaxy: Galaxy) => {
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to join cosmic topic hubs (Galaxies 🌌).');
      }
      return;
    }
    const updated = toggleJoinGalaxy(galaxy.id, currentUser.id);
    setGalaxies(updated);
    const updatedGalaxy = updated.find((g) => g.id === galaxy.id);
    if (updatedGalaxy && selectedGalaxy?.id === galaxy.id) {
      setSelectedGalaxy(updatedGalaxy);
    }
    const isNowMember = isUserMemberOfGalaxy(updatedGalaxy || galaxy, currentUser.id);
    showToast(isNowMember ? `Joined ${galaxy.name} Galaxy 🌌` : `Left ${galaxy.name} Galaxy 🌌`);
  };

  // Get star count for each galaxy
  const galaxyStarCounts = useMemo(() => {
    const map = new Map<string, number>();
    galaxies.forEach((g) => {
      const count = stars.filter((s) => {
        const matchesId = s.galaxyId === g.id;
        const matchesName = s.galaxyName?.toLowerCase() === g.name.toLowerCase();
        const matchesTag = s.tags?.some(
          (t) => t.toLowerCase().replace(/^#+/, '') === g.tag.toLowerCase().replace(/^#+/, '')
        );
        const matchesCluster = s.cluster.toLowerCase() === g.name.toLowerCase();
        return matchesId || matchesName || matchesTag || matchesCluster;
      }).length;
      map.set(g.id, count);
    });
    return map;
  }, [galaxies, stars]);

  // Categories list
  const categories = ['All', 'My Galaxies 🌌', 'Science & Cosmos', 'Code & Dev', 'Art & Creation', 'Philosophy & Writing', 'General'];

  // Filtered galaxies list
  const filteredGalaxies = useMemo(() => {
    return galaxies.filter((g) => {
      if (activeCategory === 'My Galaxies 🌌') {
        if (!currentUser || !isUserMemberOfGalaxy(g, currentUser.id)) return false;
      } else if (activeCategory !== 'All') {
        if (g.category !== activeCategory) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = g.name.toLowerCase().includes(q);
        const inTag = g.tag.toLowerCase().includes(q);
        const inDesc = g.description.toLowerCase().includes(q);
        return inName || inTag || inDesc;
      }
      return true;
    });
  }, [galaxies, activeCategory, searchQuery, currentUser]);

  // Stars belonging to selected Galaxy
  const selectedGalaxyStars = useMemo(() => {
    if (!selectedGalaxy) return [];
    const g = selectedGalaxy;
    return stars.filter((s) => {
      const matchesId = s.galaxyId === g.id;
      const matchesName = s.galaxyName?.toLowerCase() === g.name.toLowerCase();
      const matchesTag = s.tags?.some(
        (t) => t.toLowerCase().replace(/^#+/, '') === g.tag.toLowerCase().replace(/^#+/, '')
      );
      const matchesCluster = s.cluster.toLowerCase() === g.name.toLowerCase();
      return matchesId || matchesName || matchesTag || matchesCluster;
    });
  }, [selectedGalaxy, stars]);

  const handleCreateGalaxySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) onOpenAuthModal('signin', 'Sign in to create a new Galaxy community.');
      return;
    }
    if (!newName.trim()) return;

    const formattedTag = newTag.trim()
      ? newTag.trim().startsWith('#')
        ? newTag.trim()
        : `#${newTag.trim()}`
      : `#${newName.trim().replace(/\s+/g, '')}`;

    const newGalaxy: Galaxy = {
      id: `galaxy-${Date.now()}`,
      name: newName.trim(),
      tag: formattedTag,
      description: newDescription.trim() || 'A vibrant starlight community in the Asterful cosmos.',
      icon: newIcon || '🌌',
      category: newCategory,
      glowColor: newGlowColor,
      memberIds: [currentUser.id],
      creatorId: currentUser.id,
      createdAt: new Date().toISOString().split('T')[0],
      rules: newRules,
    };

    const updated = saveGalaxy(newGalaxy);
    setGalaxies(updated);
    setSelectedGalaxy(newGalaxy);
    setIsCreatingNew(false);
    showToast(`Galaxy ${newGalaxy.name} ignited successfully! 🌌`);
  };

  const handleAddRule = () => {
    if (newRuleInput.trim()) {
      setNewRules([...newRules, newRuleInput.trim()]);
      setNewRuleInput('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setNewRules(newRules.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="galaxies-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#050914]/85 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          id="galaxies-modal-container"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#07132c] border border-slate-200 dark:border-amber-300/30 rounded-3xl overflow-hidden z-10 text-slate-900 dark:text-slate-100 flex flex-col shadow-2xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)]"
        >
          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/90 text-amber-300 border border-amber-400/40 text-xs font-semibold backdrop-blur-md shadow-xl animate-in fade-in zoom-in duration-150">
              {toastMessage}
            </div>
          )}

          {/* Modal Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border border-amber-400/40 text-amber-500 dark:text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                  🌌
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {TERMS.COMMUNITY} Hubs
                    </h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                      {galaxies.length} Active Hubs
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Browse and join topic-based community Galaxies across the cosmos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!selectedGalaxy && !isCreatingNew && (
                  <button
                    type="button"
                    id="btn-launch-new-galaxy"
                    onClick={() => setIsCreatingNew(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-sm border border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Launch Galaxy 🌌</span>
                    <span className="sm:hidden">New 🌌</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-close-galaxies-modal"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Galaxies Hub"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Breadcrumb if inside single Galaxy or Creating Galaxy */}
            {(selectedGalaxy || isCreatingNew) && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGalaxy(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-amber-600 dark:text-amber-300 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>🌌 All Galaxies</span>
                </button>
                <span className="text-slate-400">/</span>
                <span className="text-slate-700 dark:text-slate-200 font-bold truncate">
                  {isCreatingNew ? 'Launch New Galaxy' : `${selectedGalaxy?.name} (${selectedGalaxy?.tag})`}
                </span>
              </div>
            )}
          </div>

          {/* MAIN MODAL CONTENT */}
          {isCreatingNew ? (
            /* Create New Galaxy Form */
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
              <form onSubmit={handleCreateGalaxySubmit} className="space-y-4 max-w-xl mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🌌 Launch a New Topic Hub (Galaxy)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Establish a persistent community for explorers to publish stars, discuss ideas, and form shared constellations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Galaxy Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (!newTag) {
                          setNewTag(`#${e.target.value.replace(/\s+/g, '')}`);
                        }
                      }}
                      placeholder="e.g. AstroPhotography"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hashtag Identifier *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="e.g. #AstroPhotography"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="Science & Cosmos">Science & Cosmos</option>
                      <option value="Code & Dev">Code & Dev</option>
                      <option value="Art & Creation">Art & Creation</option>
                      <option value="Philosophy & Writing">Philosophy & Writing</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Icon Emoji
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['🌌', '🔭', '💻', '🧬', '🎨', '🚀', '✨', '📜'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewIcon(emoji)}
                          className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition-all ${
                            newIcon === emoji
                              ? 'border-amber-400 bg-amber-400/20 scale-110'
                              : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Glow Aura
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['#FFD700', '#38BDF8', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewGlowColor(color)}
                          className={`w-6 h-6 rounded-full border transition-all ${
                            newGlowColor === color ? 'ring-2 ring-white ring-offset-2 scale-110' : 'opacity-70'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Community Story & Purpose
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe the mission, themes, and discussions explorers will share in this galaxy..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                {/* Community Rules */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {TERMS.GUIDELINES} (Community Rules)
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRule();
                        }
                      }}
                      placeholder="Add a galaxy code rule..."
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-semibold hover:bg-amber-400/20 hover:text-amber-300 cursor-pointer"
                    >
                      Add Rule
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {newRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-xs"
                      >
                        <span className="text-slate-700 dark:text-slate-300">
                          {idx + 1}. {rule}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(idx)}
                          className="text-slate-400 hover:text-rose-500 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ignite Galaxy 🌌</span>
                  </button>
                </div>
              </form>
            </div>
          ) : selectedGalaxy ? (
            /* Single Galaxy Detail View with Community Stars Feed */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-5">
              {/* Galaxy Banner / Hero Card */}
              <div
                className="relative p-5 sm:p-6 rounded-2xl border bg-gradient-to-br from-slate-900/5 dark:from-white/[0.03] to-amber-500/[0.05] overflow-hidden"
                style={{ borderColor: selectedGalaxy.glowColor + '60' }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: selectedGalaxy.glowColor }}
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shrink-0 shadow-lg"
                      style={{
                        backgroundColor: selectedGalaxy.glowColor + '20',
                        borderColor: selectedGalaxy.glowColor + '60',
                      }}
                    >
                      {selectedGalaxy.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {selectedGalaxy.name}
                        </h3>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                          {selectedGalaxy.tag}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06]">
                          {selectedGalaxy.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                        {selectedGalaxy.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Join Galaxy, Ignite Star, Filter Universe */}
                  <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
                    <button
                      type="button"
                      id={`btn-join-galaxy-${selectedGalaxy.id}`}
                      onClick={() => handleToggleJoin(selectedGalaxy)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm ${
                        isUserMemberOfGalaxy(selectedGalaxy, currentUser?.id)
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-400/50 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-400/40'
                          : 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 hover:scale-105'
                      }`}
                    >
                      {isUserMemberOfGalaxy(selectedGalaxy, currentUser?.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>In Galaxy 🌌</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Join {TERMS.COMMUNITY}</span>
                        </>
                      )}
                    </button>

                    {onOpenCreateStarInGalaxy && (
                      <button
                        type="button"
                        id="btn-publish-in-selected-galaxy"
                        onClick={() => {
                          onOpenCreateStarInGalaxy(selectedGalaxy);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-500" />
                        <span>Ignite Star ⭐</span>
                      </button>
                    )}

                    {onFilterCosmosByGalaxy && (
                      <button
                        type="button"
                        onClick={() => {
                          onFilterCosmosByGalaxy(selectedGalaxy);
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 transition-all cursor-pointer"
                        title="Filter Constellation Canvas"
                      >
                        <Orbit className="w-4 h-4 text-teal-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Rules accordion / snippet if present */}
                {selectedGalaxy.rules && selectedGalaxy.rules.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      <span>{TERMS.GUIDELINES}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {selectedGalaxy.rules.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Feed Header */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Stars in {selectedGalaxy.name}
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">
                    ({selectedGalaxyStars.length} Stars)
                  </span>
                </div>
              </div>

              {/* Stars Feed in this Galaxy */}
              <div className="space-y-3.5">
                {selectedGalaxyStars.length === 0 ? (
                  <div
                    id="galaxy-empty-feed"
                    className="flex flex-col items-center justify-center py-14 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.01]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-500 flex items-center justify-center text-2xl mb-3">
                      🌌
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {TERMS.EMPTY_FEED}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                      No stars have been published to the <strong>{selectedGalaxy.name}</strong> Galaxy yet. Be the guiding explorer to ignite the first star!
                    </p>

                    {onOpenCreateStarInGalaxy && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenCreateStarInGalaxy(selectedGalaxy);
                          onClose();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Ignite First Star in {selectedGalaxy.name}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  selectedGalaxyStars.map((s) => (
                    <StarCard
                      key={s.id}
                      star={s}
                      currentUser={currentUser}
                      onSelectStar={(clickedStar) => {
                        onSelectStar(clickedStar);
                        onClose();
                      }}
                      onToggleLike={onToggleLike}
                      onToggleReignite={onToggleReignite}
                      onTogglePin={onTogglePin}
                      onReformStar={onReformStar}
                      onDeleteStar={onDeleteStar}
                      onTagClick={(t) => {
                        if (onTagClick) onTagClick(t);
                      }}
                      onOpenAuthorProfile={onOpenAuthorProfile}
                      onStartChat={onStartChat}
                      onOpenAuthModal={onOpenAuthModal}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Galaxies Grid Browser */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Category Filter Pills & Search */}
              <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search galaxies by topic or tag..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full shrink-0 transition-all cursor-pointer border ${
                        activeCategory === cat
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Galaxies Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                {filteredGalaxies.length === 0 ? (
                  <div
                    id="galaxies-empty-search"
                    className="flex flex-col items-center justify-center py-16 px-4 text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-500 flex items-center justify-center text-2xl mb-3">
                      🌌
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {TERMS.NO_RESULTS}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-5">
                      No galaxies found matching your query. Launch your own topic hub!
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Launch Galaxy 🌌</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredGalaxies.map((galaxy) => {
                      const isMember = isUserMemberOfGalaxy(galaxy, currentUser?.id);
                      const starCount = galaxyStarCounts.get(galaxy.id) || 0;

                      return (
                        <div
                          key={galaxy.id}
                          id={`galaxy-card-${galaxy.id}`}
                          onClick={() => setSelectedGalaxy(galaxy)}
                          className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-300/50 hover:bg-slate-50 dark:hover:bg-white/[0.07] transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md overflow-hidden"
                        >
                          <div
                            className="absolute top-0 left-0 right-0 h-1 opacity-75 group-hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: galaxy.glowColor }}
                          />

                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border shrink-0 shadow-xs"
                                  style={{
                                    backgroundColor: galaxy.glowColor + '20',
                                    borderColor: galaxy.glowColor + '50',
                                  }}
                                >
                                  {galaxy.icon}
                                </div>
                                <div>
                                  <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-200 transition-colors">
                                    {galaxy.name}
                                  </h4>
                                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                                    {galaxy.tag}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                {galaxy.category}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
                              {galaxy.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.08] text-xs">
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-amber-500" />
                                <span>{galaxy.memberIds?.length || 0} Explorers</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span>{starCount} Stars</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                id={`btn-card-join-${galaxy.id}`}
                                onClick={() => handleToggleJoin(galaxy)}
                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                  isMember
                                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 hover:border-rose-300'
                                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-amber-400/20 hover:text-amber-800 dark:hover:text-amber-200 border-slate-200 dark:border-white/10'
                                }`}
                              >
                                {isMember ? 'In Galaxy 🌌' : 'Join Galaxy 🌌'}
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedGalaxy(galaxy)}
                                className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-300"
                                title="Open Galaxy Star Feed"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
