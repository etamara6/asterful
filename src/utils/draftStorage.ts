import { UnlitStarDraft, StarCluster, StarVisibility } from '../types/star';

const DRAFTS_STORAGE_KEY = 'constellation_unlit_stars_drafts_v1';

export function getStoredDrafts(userId?: string): UnlitStarDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const allDrafts: UnlitStarDraft[] = JSON.parse(raw || '[]');
    if (!Array.isArray(allDrafts)) return [];

    if (!userId) return allDrafts;
    return allDrafts.filter(
      (d) => !d.userId || d.userId === userId || d.userId === 'guest'
    );
  } catch (err) {
    return [];
  }
}

export function saveDraft(draftData: {
  id?: string;
  userId?: string;
  title: string;
  content: string;
  cluster: StarCluster;
  universeName?: string;
  universes?: string[];
  galaxyId?: string;
  galaxyName?: string;
  tags: string[];
  visibility: StarVisibility;
  allowedUserIds?: string[];
  imageUrl?: string;
  isNsfw?: boolean;
  fontFamily?: string;
}): UnlitStarDraft {
  const currentDrafts = getStoredDrafts();
  const draftId = draftData.id || `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });

  const newDraft: UnlitStarDraft = {
    id: draftId,
    userId: draftData.userId,
    title: draftData.title || '',
    content: draftData.content || '',
    cluster: draftData.cluster,
    universeName: draftData.universeName,
    universes: draftData.universes,
    galaxyId: draftData.galaxyId,
    galaxyName: draftData.galaxyName,
    tags: draftData.tags || [],
    visibility: draftData.visibility,
    allowedUserIds: draftData.allowedUserIds,
    imageUrl: draftData.imageUrl,
    isNsfw: draftData.isNsfw,
    fontFamily: draftData.fontFamily,
    savedAt: now,
  };

  const existingIndex = currentDrafts.findIndex((d) => d.id === draftId);
  let updatedDrafts: UnlitStarDraft[];
  if (existingIndex >= 0) {
    updatedDrafts = [...currentDrafts];
    updatedDrafts[existingIndex] = newDraft;
  } else {
    updatedDrafts = [newDraft, ...currentDrafts];
  }

  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    window.dispatchEvent(new CustomEvent('asterful_drafts_updated', { detail: { draft: newDraft } }));
  } catch (err) {
    console.error('Failed to save unlit star draft:', err);
  }

  return newDraft;
}

export function deleteDraft(draftId: string): void {
  const currentDrafts = getStoredDrafts();
  const updatedDrafts = currentDrafts.filter((d) => d.id !== draftId);
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    window.dispatchEvent(new CustomEvent('asterful_drafts_updated', { detail: { deletedId: draftId } }));
  } catch (err) {
    console.error('Failed to delete unlit star draft:', err);
  }
}
