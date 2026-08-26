import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Copy,
  Check,
  Radio,
  Sparkles,
  Search,
  ExternalLink,
  MessageSquare,
  Globe,
  Send,
  SendHorizontal
} from 'lucide-react';
import { StarNode, User, StarLinkData } from '../types';
import { getClusterTheme } from '../utils/colorPalette';
import { getAllRegisteredUsers, generateCleanHandle } from '../utils/userRegistry';
import { createOrGetDirectRoom, sendMessage } from '../utils/chatStorage';
import { AuthMode } from './AuthModal';

interface ShareStarModalProps {
  isOpen: boolean;
  onClose: () => void;
  star: StarNode | null;
  currentUser: User | null;
  onOpenAuthModal?: (mode: AuthMode, bannerMessage?: string) => void;
  onStartChat?: (contactUser: User) => void;
  onToast?: (message: string) => void;
}

export const ShareStarModal: React.FC<ShareStarModalProps> = ({
  isOpen,
  onClose,
  star,
  currentUser,
  onOpenAuthModal,
  onStartChat,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'signal' | 'social'>('link');
  const [searchContactQuery, setSearchContactQuery] = useState('');
  const [sentToUserIds, setSentToUserIds] = useState<string[]>([]);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);

  if (!isOpen || !star) return null;

  const theme = getClusterTheme(star.cluster);
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#star=${star.id}`
    : `https://asterful.app/#star=${star.id}`;

  const hasNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  // Registered Explorer Contacts to send signal to
  const contacts = useMemo(() => {
    const all = getAllRegisteredUsers();
    return all.filter((u) => {
      if (currentUser && u.id === currentUser.id) return false;
      return true;
    });
  }, [currentUser]);

  const filteredContacts = useMemo(() => {
    if (!searchContactQuery.trim()) return contacts;
    const q = searchContactQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.displayName?.toLowerCase().includes(q) ||
        c.handle?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
    );
  }, [contacts, searchContactQuery]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (onToast) {
        onToast('Signal Link copied to clipboard! 🌌✨');
      }
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback manual copy
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Asterful Star: "${star.title}"`,
        text: `Explore "${star.title}" by ${star.author.name} in the Asterful cosmos:`,
        url: shareUrl,
      });
      if (onToast) {
        onToast('Star shared successfully 🚀✨');
      }
    } catch {
      // User cancelled or aborted
    }
  };

  const handleSendSignalToContact = async (contact: User) => {
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Please sign in to transmit cosmic signals to explorers.');
      }
      return;
    }

    setSendingUserId(contact.id);

    try {
      const room = createOrGetDirectRoom(currentUser, contact);
      if (room) {
        const starLinkData: StarLinkData = {
          starId: star.id,
          title: star.title,
          cluster: star.cluster,
          authorName: star.author.name,
          authorHandle: star.author.handle,
          authorAvatar: star.author.avatarUrl,
          snippet: star.content.slice(0, 140),
          imageUrl: star.imageUrl,
          tags: star.tags,
          glowColor: star.glowColor,
        };

        const signalMessage = `Check out this star in the ${star.cluster} constellation: "${star.title}"`;

        sendMessage(
          room.id,
          {
            id: currentUser.id,
            displayName: currentUser.displayName || currentUser.username || currentUser.name,
            username: currentUser.username || currentUser.handle,
            avatarUrl: currentUser.avatarUrl,
          },
          signalMessage,
          undefined,
          starLinkData
        );

        setSentToUserIds((prev) => [...prev, contact.id]);
        if (onToast) {
          onToast(`Signal Transmitted to @${generateCleanHandle(contact.username || contact.handle)} 📡✨`);
        }
      }
    } catch (err) {
      console.error('Failed to send star signal:', err);
    } finally {
      setSendingUserId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#0c1833] border border-slate-200 dark:border-purple-500/25 rounded-3xl shadow-2xl overflow-hidden p-6 z-10 flex flex-col max-h-[90vh]"
        >
          {/* Subtle cosmic background glow */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 flex items-center justify-center shrink-0 shadow-xs">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Share Star to Orbit</span>
                  <span className="text-sm">🪐✨</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Broadcast resonance across Asterful & the web
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-share-star-modal"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Star Summary Card */}
          <div className="p-3.5 mb-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-start gap-3">
            <div
              className="w-3 h-3 rounded-full shrink-0 mt-1.5 shadow-xs"
              style={{ backgroundColor: star.glowColor || theme.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  {star.cluster}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  by @{generateCleanHandle(star.author.handle || star.author.name)}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {star.title}
              </h4>
            </div>
          </div>

          {/* Tabs: Link / Send Signal / Social */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 mb-4">
            <button
              type="button"
              id="tab-share-link"
              onClick={() => setActiveTab('link')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-white dark:bg-[#0c1833] text-amber-600 dark:text-amber-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link 🔗</span>
            </button>
            <button
              type="button"
              id="tab-share-signal"
              onClick={() => setActiveTab('signal')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'signal'
                  ? 'bg-white dark:bg-[#0c1833] text-amber-600 dark:text-amber-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Send as Signal 📡</span>
            </button>
            <button
              type="button"
              id="tab-share-social"
              onClick={() => setActiveTab('social')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'social'
                  ? 'bg-white dark:bg-[#0c1833] text-amber-600 dark:text-amber-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>External 🌐</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {activeTab === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cosmic Signal URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs px-3 py-2.5 rounded-xl font-mono focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      id="btn-copy-star-url"
                      onClick={handleCopyLink}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs ${
                        copied
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied! ✨' : 'Copy Link 🔗'}</span>
                    </button>
                  </div>
                </div>

                {/* Native OS Share Button */}
                {hasNativeShare && (
                  <button
                    type="button"
                    id="btn-native-os-share"
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Native System Share (Mobile / Devices)</span>
                  </button>
                )}

                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/20 text-slate-600 dark:text-slate-300 text-xs leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Anyone with this Signal URL can navigate directly into this star's coordinates in the constellation and engage with its resonances.
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'signal' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchContactQuery}
                    onChange={(e) => setSearchContactQuery(e.target.value)}
                    placeholder="Search explorers to beam star signal..."
                    className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                      No matching explorers found in orbit.
                    </div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isSent = sentToUserIds.includes(contact.id);
                      const isSending = sendingUserId === contact.id;

                      return (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 hover:border-amber-400/40 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border border-amber-400/30 flex items-center justify-center shrink-0 text-xs font-bold text-amber-500">
                              {contact.avatarUrl ? (
                                <img
                                  src={contact.avatarUrl}
                                  alt={contact.displayName || contact.name || 'Explorer'}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                (contact.displayName || contact.name || 'U')[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {contact.displayName || contact.name || 'Explorer'}
                              </p>
                              <p className="text-[11px] text-amber-600 dark:text-amber-300/80 truncate">
                                @{generateCleanHandle(contact.username || contact.handle)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {onStartChat && (
                              <button
                                type="button"
                                onClick={() => {
                                  onStartChat(contact);
                                  onClose();
                                }}
                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                                title="Open Chat"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              id={`btn-send-signal-${contact.id}`}
                              disabled={isSent || isSending}
                              onClick={() => handleSendSignalToContact(contact)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSent
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs active:scale-95 disabled:opacity-50'
                              }`}
                            >
                              {isSent ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>Transmitted</span>
                                </>
                              ) : (
                                <>
                                  <SendHorizontal className="w-3 h-3" />
                                  <span>{isSending ? 'Sending...' : 'Send Signal 📡'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Explore "${star.title}" on @AsterfulCosmos 🌌✨:`
                  )}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-sky-400 hover:text-sky-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>X / Twitter</span>
                </a>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Check out this star on Asterful: "${star.title}" - ${shareUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-emerald-400 hover:text-emerald-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                    `Check out this star on Asterful: "${star.title}"`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-blue-400 hover:text-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </a>

                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    `Asterful Star: ${star.title}`
                  )}&body=${encodeURIComponent(
                    `I found this inspiring star in the Asterful cosmos:\n\n"${star.title}"\n${star.content}\n\nView star: ${shareUrl}`
                  )}`}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-purple-400 hover:text-purple-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
