import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  GitFork,
  Tag,
  Globe,
  Lock,
  Palette,
  Image as ImageIcon,
  Wand2,
  Send,
  AlertCircle,
  User as UserIcon,
  Orbit,
  Check,
  Plus,
  Users,
  UserCheck,
  ShieldCheck,
  Key,
  Shield,
  ShieldAlert,
  Moon,
  Trash2,
  RotateCcw,
  Edit3,
  Bookmark,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eye,
  FileEdit,
  Type,
  Search,
  Hash
} from 'lucide-react';
import { StarCluster, StarNode, StarVisibility, User, Universe, UnlitStarDraft, Galaxy } from '../types';
import {
  DEFAULT_CLUSTERS,
  CLUSTER_THEMES,
  MOOD_COLORS,
  UNIVERSE_PRESET_COLORS,
  DEFAULT_UNIVERSE_GLOW,
  getDefaultUniverseGlow,
  hexToRgba,
  getClusterTheme,
  getDynamicUniverseColor
} from '../utils/colorPalette';
import { extractThematicTags, extractThematicTagsWithAI } from '../utils/tagEngine';
import { getAllRegisteredUsers, generateCleanHandle } from '../utils/userRegistry';
import { getStoredUniverses, saveUniverse, getUserUniverses } from '../utils/universeRegistry';
import { getStoredDrafts, saveDraft, deleteDraft } from '../utils/draftStorage';
import { getStoredGalaxies } from '../utils/galaxyRegistry';
import { TERMS } from '../constants/terminology';
import { FormattedText } from './FormattedText';
import { CUSTOM_FONTS, getFontFamilyClass, getFontFamilyStyle } from '../constants/fonts';

export type VisibilityMode = 'public' | 'shared' | 'only_me';

interface CreateStarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (starData: {
    title: string;
    authorName: string;
    authorHandle: string;
    cluster: StarCluster;
    universeName?: string;
    universes?: string[];
    galaxyId?: string;
    galaxyName?: string;
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
    isReformed?: boolean;
    reformedAt?: string;
    fontFamily?: string;
  }) => void;
  remixParentStar: StarNode | null;
  defaultCluster?: StarCluster | 'All';
  defaultGalaxy?: Galaxy | null;
  initialTag?: string | null;
  currentUser?: User | null;
  availableClusters?: StarCluster[];
  editingStar?: StarNode | null;
  onUpdateStar?: (starId: string, updatedData: Partial<StarNode>) => void;
  initialDraft?: UnlitStarDraft | null;
}

export const CreateStarModal: React.FC<CreateStarModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  remixParentStar,
  defaultCluster,
  defaultGalaxy,
  initialTag,
  currentUser,
  availableClusters = DEFAULT_CLUSTERS,
  editingStar,
  onUpdateStar,
  initialDraft,
}) => {
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('Cosmic Explorer');
  const [authorHandle, setAuthorHandle] = useState('@stargazer');
  const [cluster, setCluster] = useState<StarCluster>('Cosmic');
  const [selectedUniverses, setSelectedUniverses] = useState<string[]>([]);
  const [universeSearchInput, setUniverseSearchInput] = useState('');
  const [isUniverseDropdownOpen, setIsUniverseDropdownOpen] = useState(false);
  const universeSearchContainerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');
  const [fontFamily, setFontFamily] = useState<string>('default');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [glowColor, setGlowColor] = useState('#FFD700');
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('public');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isNsfw, setIsNsfw] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAutoExtracting, setIsAutoExtracting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);
  const [customUniverseGlowColor, setCustomUniverseGlowColor] = useState<string>('#FFD700');
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('__create_new__');
  const [newUniverseName, setNewUniverseName] = useState<string>('');
  const [selectedGalaxyId, setSelectedGalaxyId] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Helper for applying markdown and text formatting with selection detection
  const applyFormat = (prefix: string, suffix: string, defaultPlaceholder = 'text') => {
    const textarea = contentRef.current;
    if (!textarea) {
      setContent((prev) => prev + prefix + defaultPlaceholder + suffix);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = content.substring(start, end);
    const replacement = selectedText
      ? `${prefix}${selectedText}${suffix}`
      : `${prefix}${defaultPlaceholder}${suffix}`;

    const updatedContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(updatedContent);

    // Re-focus and update cursor selection
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + defaultPlaceholder.length);
      }
    }, 10);
  };

  // Drafts (Unlit Stars) state
  const [drafts, setDrafts] = useState<UnlitStarDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [showDraftsList, setShowDraftsList] = useState(false);
  const [draftToast, setDraftToast] = useState<string | null>(null);

  // Load drafts on open or user change
  const refreshDrafts = () => {
    const loaded = getStoredDrafts(currentUser?.id);
    setDrafts(loaded);
  };

  useEffect(() => {
    if (isOpen) {
      refreshDrafts();
    }
  }, [isOpen, currentUser?.id]);

  // Load stored galaxies
  const allStoredGalaxies = useMemo(() => {
    if (!isOpen) return [];
    return getStoredGalaxies();
  }, [isOpen]);

  // Available users for Our Universe sharing
  const registeredUsers = useMemo(() => {
    if (!isOpen) return [];
    const all = getAllRegisteredUsers();
    return all.filter((u) => u.id !== currentUser?.id);
  }, [isOpen, currentUser]);

  // Load existing universes
  const allStoredUniverses = useMemo(() => {
    if (!isOpen) return [];
    return getStoredUniverses();
  }, [isOpen]);

  const relevantUniverses = useMemo(() => {
    if (visibilityMode === 'public') return [];
    const isPrivate = visibilityMode === 'only_me';
    return allStoredUniverses.filter((u) => u.isPrivate === isPrivate || !u.isPrivate);
  }, [allStoredUniverses, visibilityMode]);

  // Close universe dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        universeSearchContainerRef.current &&
        !universeSearchContainerRef.current.contains(event.target as Node)
      ) {
        setIsUniverseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Collect all unique known universe names across storage and clusters
  const allKnownUniverseNames = useMemo(() => {
    const names = new Set<string>();
    allStoredUniverses.forEach((u) => {
      if (u.name) names.add(u.name);
    });
    availableClusters.forEach((c) => {
      if (c) names.add(c);
    });
    return Array.from(names);
  }, [allStoredUniverses, availableClusters]);

  // Autocomplete suggestions based on search query
  const filteredUniverseSuggestions = useMemo(() => {
    const query = universeSearchInput.trim().toLowerCase().replace(/^#/, '');
    if (!query) {
      return allKnownUniverseNames.filter((name) => !selectedUniverses.includes(name)).slice(0, 10);
    }
    return allKnownUniverseNames.filter(
      (name) => name.toLowerCase().includes(query) && !selectedUniverses.includes(name)
    );
  }, [universeSearchInput, allKnownUniverseNames, selectedUniverses]);

  const isExactMatch = useMemo(() => {
    const query = universeSearchInput.trim().toLowerCase().replace(/^#/, '');
    if (!query) return true;
    return allKnownUniverseNames.some((name) => name.toLowerCase() === query);
  }, [universeSearchInput, allKnownUniverseNames]);

  const handleAddUniverseTag = (universeName: string) => {
    const raw = universeName.trim();
    if (!raw) return;
    const clean = raw.startsWith('#') ? raw.slice(1).trim() : raw;
    if (!clean) return;

    if (!selectedUniverses.includes(clean)) {
      const updated = [...selectedUniverses, clean];
      setSelectedUniverses(updated);
      const primary = updated[0] || clean;
      setCluster(primary);
      const chosenColor = getClusterTheme(primary)?.color || getDynamicUniverseColor(primary);
      setGlowColor(chosenColor);

      // Persist new custom universe if not yet in stored list
      const exists = allStoredUniverses.some((u) => u.name.toLowerCase() === clean.toLowerCase());
      if (!exists) {
        saveUniverse({
          id: `univ-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: clean,
          isPrivate: false,
          ownerId: currentUser?.id || 'guest-explorer',
          memberIds: [currentUser?.id || 'guest-explorer'],
          glowColor: chosenColor,
        });
      }
    }

    setUniverseSearchInput('');
    setIsUniverseDropdownOpen(false);
  };

  const handleRemoveUniverseTag = (nameToRemove: string) => {
    setSelectedUniverses((prev) => {
      const updated = prev.filter((name) => name !== nameToRemove);
      if (updated.length > 0) {
        setCluster(updated[0]);
        setGlowColor(getClusterTheme(updated[0])?.color || getDynamicUniverseColor(updated[0]));
      } else {
        setCluster('Cosmic');
        setGlowColor('#FFD700');
      }
      return updated;
    });
  };

  // Reset or initialize state when opening modal or changing remix parent / editing star / initial draft
  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setAuthorName(currentUser.displayName || currentUser.username || 'Cosmic Explorer');
        setAuthorHandle(currentUser.handle.startsWith('@') ? currentUser.handle : `@${currentUser.handle}`);
      } else {
        setAuthorName('Cosmic Explorer');
        setAuthorHandle('@stargazer');
      }

      setShowDraftsList(false);
      setDraftToast(null);
      setIsPreviewMode(false);
      setUniverseSearchInput('');
      setIsUniverseDropdownOpen(false);

      if (editingStar) {
        // Reform Star Mode
        setTitle(editingStar.title);
        const univs = (editingStar.universes && editingStar.universes.length > 0)
          ? editingStar.universes
          : (editingStar.cluster ? [editingStar.cluster] : []);
        setSelectedUniverses(univs);
        setCluster(editingStar.cluster || univs[0] || 'Cosmic');
        setGlowColor(editingStar.glowColor || '#FFD700');
        setTags(editingStar.tags || []);
        setContent(editingStar.content || '');
        setVisibilityMode(
          editingStar.visibility === 'public'
            ? 'public'
            : editingStar.allowedUserIds && editingStar.allowedUserIds.length > 1
            ? 'shared'
            : 'only_me'
        );
        setAllowedUserIds(editingStar.allowedUserIds || []);
        setImageUrl(editingStar.imageUrl || '');
        setShowImageInput(Boolean(editingStar.imageUrl));
        setIsNsfw(Boolean(editingStar.isNsfw));
        setFontFamily(editingStar.fontFamily || 'default');
        setSelectedUniverseId('__create_new__');
        setNewUniverseName(editingStar.universeName || '');
        setSelectedGalaxyId(editingStar.galaxyId || '');
        setActiveDraftId(null);
      } else if (initialDraft) {
        // Resume from Unlit Star Draft
        setActiveDraftId(initialDraft.id);
        setTitle(initialDraft.title);
        const univs = (initialDraft.universes && initialDraft.universes.length > 0)
          ? initialDraft.universes
          : (initialDraft.cluster ? [initialDraft.cluster] : []);
        setSelectedUniverses(univs);
        setCluster(initialDraft.cluster || univs[0] || 'Cosmic');
        setTags(initialDraft.tags || []);
        setContent(initialDraft.content || '');
        setFontFamily(initialDraft.fontFamily || 'default');
        setVisibilityMode(
          initialDraft.visibility === 'public'
            ? 'public'
            : initialDraft.allowedUserIds && initialDraft.allowedUserIds.length > 1
            ? 'shared'
            : 'only_me'
        );
        setAllowedUserIds(initialDraft.allowedUserIds || []);
        setImageUrl(initialDraft.imageUrl || '');
        setShowImageInput(Boolean(initialDraft.imageUrl));
        setIsNsfw(Boolean(initialDraft.isNsfw));
        setSelectedUniverseId('__create_new__');
        setNewUniverseName(initialDraft.universeName || '');
        setSelectedGalaxyId(initialDraft.galaxyId || '');
      } else if (remixParentStar) {
        setTitle(`Remix: ${remixParentStar.title}`);
        const parentUnivs = (remixParentStar.universes && remixParentStar.universes.length > 0)
          ? remixParentStar.universes
          : (remixParentStar.cluster ? [remixParentStar.cluster] : []);
        setSelectedUniverses(parentUnivs);
        setCluster(parentUnivs[0] || remixParentStar.cluster || 'Cosmic');
        setGlowColor(remixParentStar.glowColor || '#FFD700');
        setFontFamily(remixParentStar.fontFamily || 'default');
        // Inherit parent tags plus a remix tag
        const inheritedTags = Array.from(new Set([...remixParentStar.tags.slice(0, 2), '#remix', '#evolution']));
        setTags(inheritedTags);
        setContent(`Building upon the concept from @${remixParentStar.author.handle}...\n\n`);
        setVisibilityMode('public');
        setAllowedUserIds([]);
        setIsNsfw(Boolean(remixParentStar.isNsfw));
        setSelectedUniverseId('__create_new__');
        setNewUniverseName('');
        setSelectedGalaxyId(remixParentStar.galaxyId || '');
        setActiveDraftId(null);
      } else {
        setTitle('');
        setFontFamily('default');
        const initialCluster = defaultCluster && defaultCluster !== 'All' ? defaultCluster : '';
        const initialUnivs = initialCluster ? [initialCluster] : [];
        setCluster(initialCluster || 'Cosmic');
        setSelectedUniverses(initialUnivs);
        setGlowColor(initialCluster ? (getClusterTheme(initialCluster)?.color || getDynamicUniverseColor(initialCluster)) : '#FFD700');
        setContent('');
        const baseTags = defaultGalaxy ? [defaultGalaxy.tag] : [];
        if (initialTag) {
          const formatted = initialTag.startsWith('#') ? initialTag : `#${initialTag}`;
          setTags(Array.from(new Set([formatted, ...baseTags])));
        } else {
          setTags(baseTags);
        }
        setImageUrl('');
        setShowImageInput(false);
        setIsNsfw(false);
        if (defaultCluster === 'Our Universe') {
          setVisibilityMode('shared');
          setSelectedUniverseId('__create_new__');
          setNewUniverseName('Our Universe');
        } else {
          setVisibilityMode('public');
          setSelectedUniverseId('__create_new__');
          setNewUniverseName('');
        }
        setAllowedUserIds([]);
        setSelectedGalaxyId(defaultGalaxy?.id || '');
        setActiveDraftId(null);
      }
      setErrorMsg('');
      setIsAutoExtracting(false);
      setAiSuccessBadge(false);
    }
  }, [isOpen, remixParentStar, defaultCluster, defaultGalaxy, currentUser, editingStar, initialDraft]);

  const handleSaveAsDraft = () => {
    if (!title.trim() && !content.trim()) {
      setErrorMsg('Please enter a title or thought before saving as an Unlit Star.');
      return;
    }
    const chosenGalaxy = allStoredGalaxies.find((g) => g.id === selectedGalaxyId);
    const saved = saveDraft({
      id: activeDraftId || undefined,
      userId: currentUser?.id,
      title: title.trim(),
      content: content.trim(),
      cluster,
      universeName: newUniverseName.trim() || undefined,
      universes: selectedUniverses,
      galaxyId: selectedGalaxyId || undefined,
      galaxyName: chosenGalaxy?.name || undefined,
      tags,
      visibility: visibilityMode === 'only_me' ? 'private' : visibilityMode === 'shared' ? 'private' : 'public',
      allowedUserIds,
      imageUrl: imageUrl.trim() || undefined,
      isNsfw,
      fontFamily: fontFamily !== 'default' ? fontFamily : undefined,
    });
    setActiveDraftId(saved.id);
    refreshDrafts();
    setDraftToast('Saved as Unlit Star 🌑⭐');
    setTimeout(() => setDraftToast(null), 3000);
  };

  const handleResumeDraft = (draft: UnlitStarDraft) => {
    setActiveDraftId(draft.id);
    setTitle(draft.title || '');
    setContent(draft.content || '');
    setFontFamily(draft.fontFamily || 'default');
    setCluster(draft.cluster || 'Cosmic');
    setSelectedUniverses(draft.universes && draft.universes.length > 0 ? draft.universes : (draft.cluster ? [draft.cluster] : []));
    setSelectedGalaxyId(draft.galaxyId || '');
    setTags(draft.tags || []);
    setVisibilityMode(
      draft.visibility === 'public'
        ? 'public'
        : draft.allowedUserIds && draft.allowedUserIds.length > 1
        ? 'shared'
        : 'only_me'
    );
    setAllowedUserIds(draft.allowedUserIds || []);
    setImageUrl(draft.imageUrl || '');
    setShowImageInput(Boolean(draft.imageUrl));
    setIsNsfw(Boolean(draft.isNsfw));
    setShowDraftsList(false);
    setDraftToast('Unlit Star loaded into orbit 🌑⭐');
    setTimeout(() => setDraftToast(null), 3000);
  };

  const handleDeleteDraftClick = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    deleteDraft(draftId);
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
    }
    refreshDrafts();
    setDraftToast('Unlit Star extinguished 🗑️');
    setTimeout(() => setDraftToast(null), 2500);
  };

  const toggleCollaborator = (userId: string) => {
    setAllowedUserIds((prev) => 
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFollowers = () => {
    const followerIds = (currentUser?.followers || []);
    if (followerIds.length === 0) {
      // If no followers, select all registered creators
      setAllowedUserIds(registeredUsers.map((u) => u.id));
    } else {
      setAllowedUserIds(followerIds);
    }
  };

  if (!isOpen) return null;


  // Auto-extract tags, cluster and suggested mood color using Gemini AI
  const handleAutoExtractTags = async () => {
    if (!content.trim() && !title.trim()) {
      setErrorMsg('Please enter a title or thought first before auto-extracting with AI.');
      return;
    }
    setErrorMsg('');
    setIsAutoExtracting(true);
    setAiSuccessBadge(false);

    try {
      const result = await extractThematicTagsWithAI(content, title, cluster);
      
      if (result.tags && result.tags.length > 0) {
        setTags(result.tags);
      }
      if (result.cluster) {
        setCluster(result.cluster);
      }
      if (result.moodColor) {
        setGlowColor(result.moodColor);
      }

      setAiSuccessBadge(true);
      setTimeout(() => setAiSuccessBadge(false), 3000);
    } catch {
      // Fallback already handled inside extractThematicTagsWithAI
      const localTags = extractThematicTags(content, title, cluster);
      setTags(localTags);
    } finally {
      setIsAutoExtracting(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#*/, '#').toLowerCase();
      if (cleanTag.length > 1 && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const isGuest = !currentUser || currentUser.isGuest === true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      setErrorMsg('Please sign in or create an account to ignite a new star.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please give your star a title.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Please write some content or inspiration for your star.');
      return;
    }

    // Ensure at least 3 thematic tags are generated
    let finalTags = [...tags];
    const chosenGalaxy = allStoredGalaxies.find((g) => g.id === selectedGalaxyId);
    if (chosenGalaxy && chosenGalaxy.tag) {
      finalTags = Array.from(new Set([...finalTags, chosenGalaxy.tag]));
    }
    if (finalTags.length < 3) {
      const autoTags = extractThematicTags(content, title, cluster);
      finalTags = Array.from(new Set([...finalTags, ...autoTags])).slice(0, 4);
    }

    const finalAuthorName = (currentUser.displayName || currentUser.username || 'Cosmic Explorer').trim();
    const cleanHandle = generateCleanHandle(currentUser.handle || currentUser.username || 'explorer');
    const finalAuthorHandle = `@${cleanHandle}`;

    // Calculate visibility attributes based on three-way selection
    let finalVisibility: StarVisibility = 'public';
    let finalAllowedUserIds: string[] | undefined = undefined;
    let finalUniverseName: string | undefined = undefined;

    if (visibilityMode === 'shared') {
      finalVisibility = 'private';
      finalAllowedUserIds = Array.from(new Set([currentUser.id, ...allowedUserIds]));
      if (selectedUniverseId === '__create_new__') {
        finalUniverseName = newUniverseName.trim() || 'Our Universe';
      } else {
        const found = allStoredUniverses.find((u) => u.id === selectedUniverseId);
        finalUniverseName = found ? found.name : newUniverseName.trim() || 'Our Universe';
      }
      // Persist universe with customizable glowColor
      saveUniverse({
        id: selectedUniverseId !== '__create_new__' ? selectedUniverseId : `univ-${Date.now()}`,
        name: finalUniverseName,
        isPrivate: false,
        ownerId: currentUser.id,
        memberIds: finalAllowedUserIds,
        glowColor: customUniverseGlowColor || getDefaultUniverseGlow(finalUniverseName),
      });
    } else if (visibilityMode === 'only_me') {
      finalVisibility = 'private';
      finalAllowedUserIds = [currentUser.id];
      if (selectedUniverseId === '__create_new__') {
        finalUniverseName = newUniverseName.trim() || 'Personal Journal';
      } else {
        const found = allStoredUniverses.find((u) => u.id === selectedUniverseId);
        finalUniverseName = found ? found.name : newUniverseName.trim() || 'Personal Journal';
      }
      // Persist universe with customizable glowColor
      saveUniverse({
        id: selectedUniverseId !== '__create_new__' ? selectedUniverseId : `univ-${Date.now()}`,
        name: finalUniverseName,
        isPrivate: true,
        ownerId: currentUser.id,
        memberIds: [currentUser.id],
        glowColor: customUniverseGlowColor || getDefaultUniverseGlow(finalUniverseName),
      });
    } else {
      finalVisibility = 'public';
      finalAllowedUserIds = undefined;
      finalUniverseName = undefined;
    }

    const finalCluster =
      visibilityMode === 'shared' && (!cluster || cluster === 'Cosmic')
        ? (finalUniverseName || 'Our Universe')
        : (cluster || 'Cosmic');

    const finalUniverses = selectedUniverses.length > 0
      ? selectedUniverses
      : [finalCluster];

    if (editingStar) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (onUpdateStar) {
        onUpdateStar(editingStar.id, {
          title: title.trim(),
          content: content.trim(),
          fontFamily: fontFamily !== 'default' ? fontFamily : undefined,
          cluster: finalCluster,
          universeName: finalUniverseName || finalUniverses[0],
          universes: finalUniverses,
          galaxyId: chosenGalaxy?.id || undefined,
          galaxyName: chosenGalaxy?.name || undefined,
          tags: finalTags,
          glowColor,
          visibility: finalVisibility,
          allowedUserIds: finalAllowedUserIds,
          imageUrl: imageUrl.trim() || undefined,
          isNsfw,
          isReformed: true,
          reformedAt: nowStr,
        });
      } else {
        onSubmit({
          userId: currentUser.id,
          authorId: currentUser.id,
          title: title.trim(),
          authorName: finalAuthorName,
          authorHandle: finalAuthorHandle,
          cluster: finalCluster,
          universeName: finalUniverseName || finalUniverses[0],
          universes: finalUniverses,
          galaxyId: chosenGalaxy?.id || undefined,
          galaxyName: chosenGalaxy?.name || undefined,
          content: content.trim(),
          fontFamily: fontFamily !== 'default' ? fontFamily : undefined,
          tags: finalTags,
          glowColor,
          visibility: finalVisibility,
          allowedUserIds: finalAllowedUserIds,
          imageUrl: imageUrl.trim() || undefined,
          parentId: editingStar.parentId,
          parentTitle: editingStar.parentTitle,
          isNsfw,
          isReformed: true,
          reformedAt: nowStr,
        });
      }
      onClose();
      return;
    }

    if (activeDraftId) {
      deleteDraft(activeDraftId);
      setActiveDraftId(null);
    }

    onSubmit({
      userId: currentUser.id,
      authorId: currentUser.id,
      title: title.trim(),
      authorName: finalAuthorName,
      authorHandle: finalAuthorHandle,
      cluster: finalCluster,
      universeName: finalUniverseName || finalUniverses[0],
      universes: finalUniverses,
      galaxyId: chosenGalaxy?.id || undefined,
      galaxyName: chosenGalaxy?.name || undefined,
      content: content.trim(),
      fontFamily: fontFamily !== 'default' ? fontFamily : undefined,
      tags: finalTags,
      glowColor,
      visibility: finalVisibility,
      allowedUserIds: finalAllowedUserIds,
      imageUrl: imageUrl.trim() || undefined,
      parentId: remixParentStar?.id,
      parentTitle: remixParentStar?.title,
      isNsfw,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#05050a]/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          id="create-star-modal-card"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-xl bg-white/95 dark:bg-[#07132c]/95 border border-slate-200 dark:border-amber-300/30 rounded-3xl overflow-hidden z-10 text-slate-900 dark:text-slate-100 my-auto shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
        >
          {/* Header Glow Band */}
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${glowColor}, #a78bfa, #4fd1c5)`,
              boxShadow: `0 0 18px ${hexToRgba(glowColor, 0.7)}`
            }}
          />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center border backdrop-blur-sm shadow-xs"
                style={{
                  backgroundColor: hexToRgba(glowColor, 0.15),
                  borderColor: hexToRgba(glowColor, 0.4),
                  boxShadow: `0 0 12px ${hexToRgba(glowColor, 0.3)}`
                }}
              >
                {editingStar ? (
                  <Edit3 className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                ) : remixParentStar ? (
                  <GitFork className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-teal-300" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>
                    {editingStar
                      ? TERMS.EDIT_POST
                      : remixParentStar
                      ? 'Remix Cosmic Idea'
                      : TERMS.CREATE_POST}
                  </span>
                  {activeDraftId && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      Unlit Star 🌑
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingStar
                    ? 'Re-align and reform the thoughts within this star node'
                    : remixParentStar
                    ? `Linking new thoughts to ${remixParentStar.title}`
                    : `Add your ${TERMS.POST.toLowerCase()} to the living Asterful star graph`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!editingStar && !remixParentStar && (
                <button
                  type="button"
                  id="btn-toggle-drafts-list"
                  onClick={() => setShowDraftsList(!showDraftsList)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    showDraftsList
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                  title="View your saved Unlit Stars"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Unlit Stars</span>
                  {drafts.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/20 dark:bg-white/20 font-bold">
                      {drafts.length}
                    </span>
                  )}
                </button>
              )}

              <button
                id="btn-close-create-modal"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drafts Drawer / View inside modal */}
          {showDraftsList ? (
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {TERMS.DRAFT} Repository
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDraftsList(false)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  ← Back to Composer
                </button>
              </div>

              {drafts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <Moon className="w-10 h-10 mx-auto mb-2 opacity-30 animate-pulse" />
                  <p className="text-sm font-medium">No Unlit Stars currently in storage.</p>
                  <p className="text-xs mt-1 text-slate-500 dark:text-slate-500">
                    Draft your thoughts and click "Save as Unlit Star" anytime to save your progress.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((d) => (
                    <div
                      key={d.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        activeDraftId === d.id
                          ? 'bg-amber-500/10 border-amber-400/50 shadow-sm'
                          : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {d.title || 'Untitled Star'}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                              {d.cluster}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Saved {d.savedAt}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {d.content || '(No content yet)'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResumeDraft(d)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDraftClick(e, d.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete this unlit star draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Guest Hard Guard Notification Banner */}
            {isGuest && (
              <div
                id="create-star-guest-guard-banner"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-900 dark:text-amber-200 text-xs backdrop-blur-md shadow-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-300" />
                <span>
                  <strong>Guest Mode (Read-Only):</strong> Please sign in or create an account to ignite a new star.
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-700 dark:text-pink-300 text-xs backdrop-blur-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Remix Banner */}
            {remixParentStar && (
              <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-300 dark:border-pink-500/30 flex items-center justify-between text-xs text-pink-800 dark:text-pink-200 backdrop-blur-md shadow-xs">
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  <span>
                    <strong>Parent Node:</strong> {remixParentStar.title}
                  </span>
                </div>
                <span className="text-[11px] text-pink-600 dark:text-pink-400">Pulsating edge will connect</span>
              </div>
            )}

            {/* Title Input */}
            <div>
              <label htmlFor="star-title-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Star Title *
              </label>
              <input
                id="star-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Title of your star..."
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder-slate-400"
                required
              />
            </div>

            {/* Author Details (Locked to Authenticated Account) */}
            {currentUser ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-300/30 backdrop-blur-md space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400/60 bg-slate-100 dark:bg-[#040a1c] flex items-center justify-center shrink-0 shadow-xs">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <UserIcon className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{currentUser.displayName}</span>
                      <span className="text-[11px] font-mono text-amber-700 dark:text-amber-300/90 font-medium">
                        {currentUser.handle.startsWith('@') ? currentUser.handle : `@${currentUser.handle}`}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium">
                    <Lock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-300" />
                    Locked Identity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="star-author-name" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Author Name
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="star-author-name"
                        type="text"
                        value={currentUser.displayName}
                        readOnly
                        disabled
                        aria-readonly="true"
                        className="w-full text-slate-700 dark:text-slate-200 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 cursor-not-allowed opacity-90 select-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300/70 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="star-author-handle" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Handle
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="star-author-handle"
                        type="text"
                        value={currentUser.handle.startsWith('@') ? currentUser.handle : `@${currentUser.handle}`}
                        readOnly
                        disabled
                        aria-readonly="true"
                        className="w-full text-amber-700 dark:text-amber-300/90 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 cursor-not-allowed opacity-90 font-mono select-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300/70 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-700 dark:text-pink-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-pink-500 dark:text-pink-400" />
                <span>You must be signed in to post a new star.</span>
              </div>
            )}

            {/* Galaxy (Topic Hub) Dropdown Selector */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-400/20 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="select-star-galaxy" className="block text-xs font-semibold uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <span>🌌</span>
                    <span>{TERMS.COMMUNITY} (Optional Hub)</span>
                  </label>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30">
                    Topic Hub
                  </span>
                </div>
                {selectedGalaxyId && (
                  <button
                    type="button"
                    onClick={() => setSelectedGalaxyId('')}
                    className="text-[10px] text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100 transition-colors"
                  >
                    Clear Hub
                  </button>
                )}
              </div>

              <select
                id="select-star-galaxy"
                value={selectedGalaxyId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedGalaxyId(newId);
                  if (newId) {
                    const match = allStoredGalaxies.find((g) => g.id === newId);
                    if (match && match.tag) {
                      setTags((prev) => Array.from(new Set([...prev, match.tag])));
                    }
                  }
                }}
                className="w-full bg-white dark:bg-black/60 border border-purple-300 dark:border-purple-500/30 text-purple-950 dark:text-purple-100 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 cursor-pointer"
              >
                <option value="">✨ None (Publish to Global Universe)</option>
                {allStoredGalaxies.map((galaxy) => (
                  <option key={galaxy.id} value={galaxy.id}>
                    {galaxy.icon} {galaxy.name} ({galaxy.tag}) — {galaxy.membersCount ?? galaxy.memberIds?.length ?? 0} explorers
                  </option>
                ))}
              </select>

              {selectedGalaxyId && (() => {
                const sel = allStoredGalaxies.find((g) => g.id === selectedGalaxyId);
                if (!sel) return null;
                return (
                  <div className="mt-2 text-[11px] text-purple-800 dark:text-purple-200/80 flex items-center gap-1.5">
                    <span className="font-semibold">{sel.icon} {sel.name}:</span>
                    <span className="truncate">{sel.description}</span>
                  </div>
                );
              })()}
            </div>

            {/* TAG UNIVERSES (Instagram-style Search & Tag Input) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="input-universe-search"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    TAG UNIVERSES 🌌
                  </label>
                  {selectedUniverses.length > 0 && (
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30">
                      {selectedUniverses.length} tagged
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Search or type custom #universe
                </span>
              </div>

              {/* Search & Tag Input Container */}
              <div ref={universeSearchContainerRef} className="relative">
                <div
                  onClick={() => {
                    const input = document.getElementById('input-universe-search');
                    if (input) input.focus();
                  }}
                  className="w-full min-h-[46px] p-2.5 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-amber-400/40 focus-within:border-amber-400/50 flex flex-wrap items-center gap-2 transition-all cursor-text"
                >
                  {/* Selected Universe Chips */}
                  {selectedUniverses.map((univ) => {
                    const theme = getClusterTheme(univ);
                    const glowCol = theme?.color || getDynamicUniverseColor(univ);
                    return (
                      <span
                        key={univ}
                        id={`universe-tag-chip-${univ.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/15 dark:bg-amber-400/15 text-slate-900 dark:text-amber-200 border border-amber-400/40 shadow-xs animate-in fade-in zoom-in-95 duration-150"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: glowCol }}
                        />
                        <span className="font-semibold">#{univ.replace(/^#/, '')}</span>
                        <button
                          type="button"
                          id={`btn-remove-universe-${univ.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          aria-label={`Remove ${univ}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveUniverseTag(univ);
                          }}
                          className="ml-0.5 p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/20 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}

                  {/* Text Input */}
                  <div className="flex-1 min-w-[140px] flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />
                    <input
                      id="input-universe-search"
                      type="text"
                      value={universeSearchInput}
                      onChange={(e) => {
                        setUniverseSearchInput(e.target.value);
                        setIsUniverseDropdownOpen(true);
                      }}
                      onFocus={() => setIsUniverseDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const trimmed = universeSearchInput.trim().replace(/^#/, '');
                          if (trimmed) {
                            const match = filteredUniverseSuggestions.find(
                              (s) => s.toLowerCase() === trimmed.toLowerCase()
                            );
                            handleAddUniverseTag(match || trimmed);
                          }
                        } else if (e.key === 'Escape') {
                          setIsUniverseDropdownOpen(false);
                        } else if (e.key === 'Backspace' && !universeSearchInput && selectedUniverses.length > 0) {
                          handleRemoveUniverseTag(selectedUniverses[selectedUniverses.length - 1]);
                        }
                      }}
                      placeholder={
                        selectedUniverses.length === 0
                          ? 'Search universes or type custom #universe...'
                          : 'Add another universe tag...'
                      }
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {isUniverseDropdownOpen && (
                  <div
                    id="universe-autocomplete-dropdown"
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto bg-white/95 dark:bg-[#071126]/95 border border-slate-200 dark:border-white/15 rounded-xl shadow-xl backdrop-blur-xl custom-scrollbar p-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {/* "+ Add '#[typed_text]'" button when typing a term that doesn't match an existing universe */}
                    {universeSearchInput.trim() && !isExactMatch && (
                      <button
                        type="button"
                        id="btn-add-typed-universe-tag"
                        onClick={() => handleAddUniverseTag(universeSearchInput)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-400/10 dark:hover:bg-amber-400/20 rounded-lg text-left transition-colors cursor-pointer border border-amber-400/30 mb-1"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          + Add <span className="font-bold underline">#{universeSearchInput.trim().replace(/^#/, '')}</span>
                        </span>
                      </button>
                    )}

                    {/* Suggestions list */}
                    {filteredUniverseSuggestions.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {filteredUniverseSuggestions.map((name) => {
                          const theme = getClusterTheme(name);
                          const color = theme?.color || getDynamicUniverseColor(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              id={`universe-suggest-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              onClick={() => handleAddUniverseTag(name)}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white transition-colors text-left cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-medium truncate group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                                  #{name.replace(/^#/, '')}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0">
                                Select
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      !universeSearchInput.trim() ? (
                        <div className="px-3 py-2.5 text-center text-xs text-slate-400">
                          Type to search or create a new universe tag
                        </div>
                      ) : isExactMatch ? (
                        <div className="px-3 py-2 text-center text-xs text-slate-400">
                          Universe already tagged
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content Body with Formatting Toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label htmlFor="star-content-input" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Thought / Body Content *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {cluster === 'Late Night Poetry' ? 'Poetic verse & musings' : 'Markdown formatting supported'}
                  </span>
                  {/* Write / Preview Tab Pill */}
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-[11px]">
                    <button
                      type="button"
                      id="btn-composer-tab-write"
                      onClick={() => setIsPreviewMode(false)}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                        !isPreviewMode
                          ? 'bg-white dark:bg-[#0c1833] text-amber-600 dark:text-amber-300 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <FileEdit className="w-3 h-3" />
                      <span>Write</span>
                    </button>
                    <button
                      type="button"
                      id="btn-composer-tab-preview"
                      onClick={() => setIsPreviewMode(true)}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                        isPreviewMode
                          ? 'bg-white dark:bg-[#0c1833] text-amber-600 dark:text-amber-300 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div
                id="composer-formatting-toolbar"
                className="flex items-center justify-between gap-1.5 p-1.5 mb-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/50 border border-slate-200 dark:border-purple-500/20 backdrop-blur-sm flex-wrap"
              >
                {/* Left: Text Styles (B, I, U, S, Code) & Alignments */}
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Text Styles */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      id="btn-format-bold"
                      onClick={() => applyFormat('**', '**', 'bold text')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Bold (**text**)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-format-italic"
                      onClick={() => applyFormat('*', '*', 'italic text')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Italic (*text*)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-format-underline"
                      onClick={() => applyFormat('<u>', '</u>', 'underlined text')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Underline (<u>text</u>)"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-format-strikethrough"
                      onClick={() => applyFormat('~~', '~~', 'strikethrough text')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Strikethrough (~~text~~)"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-format-code"
                      onClick={() => applyFormat('`', '`', 'code snippet')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Inline Code (`code`)"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-300 dark:bg-white/15 mx-0.5 hidden xs:block" />

                  {/* Paragraph Alignment Controls */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      id="btn-align-left"
                      onClick={() => applyFormat('[align=left]', '[/align]', 'Left-aligned thought')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Align Left ([align=left])"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-align-center"
                      onClick={() => applyFormat('[align=center]', '[/align]', 'Centered cosmic thought')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Align Center ([align=center])"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-align-right"
                      onClick={() => applyFormat('[align=right]', '[/align]', 'Right-aligned note')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Align Right ([align=right])"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-align-justify"
                      onClick={() => applyFormat('[align=justify]', '[/align]', 'Justified paragraph')}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 hover:bg-amber-100/80 dark:hover:bg-purple-900/30 border border-slate-200/80 dark:border-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer active:scale-95 shadow-xs"
                      title="Justify ([align=justify])"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right: Font Type 🔤 Dropdown Select */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <label htmlFor="star-font-family-select" className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                    <Type className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Font Type:</span>
                  </label>
                  <select
                    id="star-font-family-select"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="px-2 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-purple-500/40 text-slate-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer shadow-xs"
                  >
                    {CUSTOM_FONTS.map((f) => (
                      <option key={f.id} value={f.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 py-1">
                        {f.name} {f.id !== 'default' ? '🔤' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Textarea or Live Formatted Preview with Dynamic Custom Font */}
              {isPreviewMode ? (
                <div
                  className={`w-full min-h-[110px] p-4 rounded-xl bg-slate-50/90 dark:bg-black/50 border border-amber-400/40 text-slate-900 dark:text-white text-sm custom-scrollbar overflow-y-auto max-h-48 leading-relaxed shadow-inner ${getFontFamilyClass(
                    fontFamily
                  )}`}
                  style={{ fontFamily: getFontFamilyStyle(fontFamily) }}
                >
                  {content.trim() ? (
                    <FormattedText text={content} />
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic text-xs">
                      (No content written yet. Switch to Write to draft your star.)
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={contentRef}
                  id="star-content-input"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe your star..."
                  className={`w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder-slate-400 custom-scrollbar font-normal transition-all ${getFontFamilyClass(
                    fontFamily
                  )}`}
                  style={{ fontFamily: getFontFamilyStyle(fontFamily) }}
                  required
                />
              )}
            </div>

            {/* Thematic Tags & Auto-Extractor */}
            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                  <span>Thematic Tags</span>
                </label>

                <div className="flex items-center gap-2">
                  {aiSuccessBadge && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-500/30 animate-in fade-in duration-200">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Gemini Analyzed</span>
                    </span>
                  )}

                  <button
                    type="button"
                    id="btn-auto-extract-tags"
                    onClick={handleAutoExtractTags}
                    disabled={isAutoExtracting}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer backdrop-blur-sm shadow-xs ${
                      isAutoExtracting
                        ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-400/40 cursor-wait'
                        : 'text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/30 hover:border-amber-400/50'
                    }`}
                  >
                    {isAutoExtracting ? (
                      <>
                        <Orbit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 animate-spin" />
                        <span>AI Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Auto-extract with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl min-h-[42px]">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-400/30 text-xs backdrop-blur-sm shadow-xs"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-slate-900 dark:hover:text-white p-0.5 cursor-pointer"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? 'Type tag and press Enter...' : '+ add tag'}
                  className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none px-2 py-1"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Stars sharing 1+ tags will automatically draw glowing constellation connection lines!
              </p>
            </div>

            {/* Mood Glow Color & Visibility Controls */}
            <div className="space-y-4 pt-1">
              {/* Mood Glow Palette */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    <span>Mood Glow</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shadow-[0_0_6px_currentColor]"
                      style={{ backgroundColor: glowColor, color: glowColor }}
                    />
                    {glowColor.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 p-2.5 frosted-glass-card rounded-xl">
                  {MOOD_COLORS.map((m) => {
                    const isSelected = glowColor.toLowerCase() === m.hex.toLowerCase();
                    return (
                      <button
                        key={m.hex}
                        type="button"
                        id={`mood-color-${m.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => setGlowColor(m.hex)}
                        title={`${m.name} (${m.hex})`}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer relative ${
                          isSelected
                            ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0c0c1a] z-10'
                            : 'hover:scale-110 opacity-75 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: m.hex,
                          boxShadow: isSelected ? `0 0 12px ${m.hex}` : 'none',
                        }}
                        aria-label={m.name}
                      />
                    );
                  })}

                  {/* Custom Color Picker Button */}
                  {(() => {
                    const isCustomSelected = !MOOD_COLORS.some(
                      (m) => m.hex.toLowerCase() === glowColor.toLowerCase()
                    );
                    return (
                      <label
                        id="custom-color-picker-label"
                        title={`Custom Color Picker (${glowColor})`}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer relative flex items-center justify-center border border-white/40 overflow-hidden ${
                          isCustomSelected
                            ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0c0c1a] z-10'
                            : 'hover:scale-110 opacity-75 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isCustomSelected ? glowColor : 'transparent',
                          backgroundImage: isCustomSelected
                            ? 'none'
                            : 'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ffaa00 60deg, #00ff88 120deg, #00f3ff 180deg, #0077ff 240deg, #b026ff 300deg, #ff0000 360deg)',
                          boxShadow: isCustomSelected ? `0 0 12px ${glowColor}` : 'none',
                        }}
                      >
                        <input
                          id="custom-color-picker-input"
                          type="color"
                          value={glowColor.startsWith('#') ? glowColor : '#00f3ff'}
                          onChange={(e) => setGlowColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          title="Choose custom cosmic glow"
                        />
                        <Palette
                          className={`w-3 h-3 pointer-events-none drop-shadow ${
                            isCustomSelected ? 'text-white' : 'text-white mix-blend-difference'
                          }`}
                        />
                      </label>
                    );
                  })()}
                </div>
              </div>

              {/* Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                    <span>Cosmic Space & Visibility</span>
                  </label>
                  {visibilityMode === 'shared' && (
                    <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{allowedUserIds.length} Invited Stargazers</span>
                    </span>
                  )}
                  {visibilityMode === 'only_me' && (
                    <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Strictly Only You</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl">
                  {/* Public Universe */}
                  <button
                    type="button"
                    id="btn-visibility-public"
                    onClick={() => {
                      setVisibilityMode('public');
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      visibilityMode === 'public'
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 shadow-xs backdrop-blur-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Public Universe</span>
                  </button>

                  {/* Our Universe (Shared) */}
                  <button
                    type="button"
                    id="btn-visibility-shared"
                    onClick={() => {
                      setVisibilityMode('shared');
                      if (cluster === 'Digital Art') {
                        setCluster('Our Universe');
                        setGlowColor('#F59E0B');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      visibilityMode === 'shared'
                        ? 'bg-gradient-to-r from-amber-400/25 to-yellow-500/25 text-amber-900 dark:text-amber-200 border border-amber-400/50 shadow-xs backdrop-blur-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Users className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
                    <span className="truncate">Our Universe (Shared)</span>
                  </button>

                  {/* My Private Space (Only Me) */}
                  <button
                    type="button"
                    id="btn-visibility-private"
                    onClick={() => {
                      setVisibilityMode('only_me');
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      visibilityMode === 'only_me'
                        ? 'bg-gradient-to-r from-amber-500/25 to-yellow-600/25 text-amber-900 dark:text-amber-100 border border-amber-400/50 shadow-xs backdrop-blur-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Key className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
                    <span className="truncate">My Private Space (Only Me)</span>
                  </button>
                </div>

                {/* Universe Naming UI Section for Shared & Private Spaces */}
                {(visibilityMode === 'shared' || visibilityMode === 'only_me') && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-3 p-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-300/30 space-y-3 backdrop-blur-md shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <label htmlFor="universe-select-dropdown" className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Orbit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Universe Name</span>
                      </label>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300/80 uppercase font-medium tracking-wider">
                        {visibilityMode === 'shared' ? 'Shared Space' : 'Private Journal'}
                      </span>
                    </div>

                    {/* Universe Dropdown Selection */}
                    <div className="relative">
                      <select
                        id="universe-select-dropdown"
                        value={selectedUniverseId}
                        onChange={(e) => {
                          setSelectedUniverseId(e.target.value);
                        }}
                        className="w-full text-slate-900 dark:text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-amber-300/30 bg-white dark:bg-[#060e22]/95 focus:outline-none focus:border-amber-400 dark:focus:border-amber-300/60 transition-all cursor-pointer"
                      >
                        <option value="__create_new__" className="bg-white dark:bg-[#040a1c] text-amber-700 dark:text-amber-300 font-semibold">
                          ✨ + Create New Universe...
                        </option>
                        {relevantUniverses.length > 0 && (
                          <optgroup label={visibilityMode === 'shared' ? "Existing Shared Universes" : "Existing Private Universes"} className="bg-white dark:bg-[#040a1c] text-slate-800 dark:text-slate-300">
                            {relevantUniverses.map((u) => (
                              <option key={u.id} value={u.id} className="bg-white dark:bg-[#040a1c] text-slate-900 dark:text-white">
                                🪐 {u.name} {u.isPrivate ? '(Private)' : '(Shared)'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* If + Create New Universe is selected, show Text Input field */}
                    {selectedUniverseId === '__create_new__' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-1"
                      >
                        <div>
                          <label htmlFor="input-new-universe-name" className="text-[11px] font-medium text-amber-900 dark:text-amber-200/90 flex items-center justify-between mb-1">
                            <span>Custom Universe Name</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">e.g., Quantum Research, Poetry Club, Personal Journal</span>
                          </label>
                          <div className="relative">
                            <input
                              id="input-new-universe-name"
                              type="text"
                              value={newUniverseName}
                              onChange={(e) => setNewUniverseName(e.target.value)}
                              placeholder="e.g., Quantum Research, Poetry Club, Personal Journal"
                              className="w-full text-slate-900 dark:text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-amber-300/40 bg-white dark:bg-[#060e22]/95 focus:outline-none focus:border-amber-400 dark:focus:border-amber-300 placeholder-slate-400 dark:placeholder-slate-500 shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Universe Aura Color Swatches */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-medium text-amber-900 dark:text-amber-200/90">Universe Aura Color:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {UNIVERSE_PRESET_COLORS.map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                title={preset.name}
                                onClick={() => setCustomUniverseGlowColor(preset.hex)}
                                className={`w-5 h-5 rounded-full cursor-pointer transition-all flex items-center justify-center ${
                                  customUniverseGlowColor === preset.hex
                                    ? 'ring-2 ring-white scale-110 shadow-sm'
                                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ backgroundColor: preset.hex }}
                              >
                                {customUniverseGlowColor === preset.hex && (
                                  <Check className="w-2.5 h-2.5 text-black/80" />
                                )}
                              </button>
                            ))}
                            <label
                              title="Custom Color"
                              className="relative w-5 h-5 rounded-full border border-slate-400/50 cursor-pointer overflow-hidden flex items-center justify-center bg-conic-gradient hover:scale-105 transition-transform"
                            >
                              <input
                                type="color"
                                value={customUniverseGlowColor}
                                onChange={(e) => setCustomUniverseGlowColor(e.target.value)}
                                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                              />
                            </label>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Follower / Collaborator Multi-Select Dropdown for Our Universe (Shared) */}
                {visibilityMode === 'shared' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3.5 rounded-2xl bg-amber-500/[0.06] border border-amber-300/30 space-y-3 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-200 font-semibold">
                        <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Select Permitted Followers & Creators:</span>
                      </div>
                      <button
                        type="button"
                        id="btn-select-all-followers"
                        onClick={handleSelectAllFollowers}
                        className="text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-400/30 transition-all cursor-pointer"
                      >
                        Select All Stargazers
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Only you and selected followers will be able to discover and read this star on the Asterful star graph.
                    </p>

                    {registeredUsers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/5">
                        No other stargazers registered yet. You will be the sole creator in this private space until others join.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {registeredUsers.map((user) => {
                          const isSelected = allowedUserIds.includes(user.id);
                          const isFollower = currentUser?.followers?.includes(user.id);

                          return (
                            <button
                              key={user.id}
                              type="button"
                              id={`collaborator-item-${user.id}`}
                              onClick={() => toggleCollaborator(user.id)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-amber-500/20 text-amber-950 dark:text-amber-100 border-amber-400/40 shadow-xs'
                                  : 'bg-slate-50 dark:bg-black/20 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={user.avatarUrl}
                                  alt={user.displayName || user.username}
                                  className="w-6 h-6 rounded-full object-cover border border-amber-400/30 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="text-left truncate">
                                  <div className="font-semibold truncate text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{user.displayName || user.username}</span>
                                    {isFollower && (
                                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-400/30">
                                        Follower
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">@{user.handle}</span>
                                </div>
                              </div>

                              <div className="shrink-0 pl-2">
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-lg border border-slate-400 dark:border-slate-500 hover:border-amber-400" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Only Me Mode - Informational Confirmation Notice */}
                {visibilityMode === 'only_me' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-300/30 flex items-start gap-3 backdrop-blur-md"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Key className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <span>Strictly Private Constellation</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/30">
                          Only Me
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                        This star is visible only to your authenticated account. It will never be rendered to other stargazers, followers, or guest explorers on the cosmic graph.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Optional Image URL Toggle */}
            <div>
              {!showImageInput ? (
                <button
                  type="button"
                  onClick={() => setShowImageInput(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-teal-300 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>+ Attach Visual Image URL (optional)</span>
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="star-image-url" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Visual Image URL
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowImageInput(false);
                        setImageUrl('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    id="star-image-url"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
              )}
            </div>

            {/* 18+ / Sensitive Content Moderation Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/15 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isNsfw ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 shadow-xs' : 'bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10'
                  }`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="toggle-nsfw-star" className="text-xs font-semibold text-slate-900 dark:text-white cursor-pointer select-none">
                        Mark as 18+ / Sensitive Content
                      </label>
                      {isNsfw && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold">
                          18+ Restricted
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                      Restricts visibility to verified 18+ stargazers and renders a safety warning blur overlay.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-nsfw-star"
                  role="switch"
                  aria-checked={isNsfw}
                  onClick={() => setIsNsfw(!isNsfw)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isNsfw ? 'bg-rose-500 shadow-xs' : 'bg-slate-300 dark:bg-slate-700/80'
                  }`}
                >
                  <span className="sr-only">Toggle 18+ sensitive content</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isNsfw ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                {!editingStar && !remixParentStar && !isGuest && (
                  <button
                    type="button"
                    id="btn-save-as-draft"
                    onClick={handleSaveAsDraft}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-98 transition-all cursor-pointer"
                    title="Save current progress to Unlit Stars (Drafts)"
                  >
                    <Moon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Save as Unlit Star 🌑⭐</span>
                  </button>
                )}

                {draftToast && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-300 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    {draftToast}
                  </motion.span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  id="btn-cancel-create"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-star"
                  disabled={isGuest}
                  title={isGuest ? `Sign in to ${TERMS.CREATE_POST.toLowerCase()}` : undefined}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold ${
                    isGuest
                      ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                      : 'text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:to-yellow-300 shadow-md border border-amber-200 active:scale-98 cursor-pointer'
                  } transition-all`}
                >
                  {editingStar ? (
                    <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                  ) : (
                    <Send className={`w-3.5 h-3.5 ${isGuest ? 'text-slate-400' : 'text-slate-950'}`} />
                  )}
                  <span>
                    {isGuest
                      ? `Sign in to ${TERMS.CREATE_POST}`
                      : editingStar
                      ? TERMS.EDIT_POST
                      : remixParentStar
                      ? 'Cast Remix into Orbit'
                      : TERMS.CREATE_POST}
                  </span>
                </button>
              </div>
            </div>
          </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
