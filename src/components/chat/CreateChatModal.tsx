import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Radio, 
  Users, 
  Sparkles, 
  Check, 
  Lock,
  ArrowRight,
  Orbit,
  Dices,
  CircleDot
} from 'lucide-react';
import { User, ChatRoom } from '../../types';
import { getAllRegisteredUsers, generateCleanHandle } from '../../utils/userRegistry';
import { createOrGetDirectRoom, createGroupChatRoom, isUserInOrbit } from '../../utils/chatStorage';
import { TERMS } from '../../constants/terminology';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRoomCreated: (room: ChatRoom) => void;
  initialTargetUser?: User | null;
}

const CLUSTER_NAME_SUGGESTIONS = [
  '✨ Orion Nebula Vanguard',
  '🪐 Andromeda Cartographers',
  '💫 Starlight Symphony Cluster',
  '🌌 Deep Sky Observers',
  '🔭 Quantum Wave Navigators',
  '⚡ Heliospheric Pioneers',
  '🌠 Pulsar Signal Syndicate',
  '🌙 Lunar Horizon Network'
];

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRoomCreated,
  initialTargetUser,
}) => {
  const [chatType, setChatType] = useState<'dm' | 'group'>('dm');
  const [searchQuery, setSearchQuery] = useState('');
  const [orbitFilter, setOrbitFilter] = useState<'all' | 'orbit'>('orbit');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    initialTargetUser && initialTargetUser.id !== currentUser.id ? [initialTargetUser.id] : []
  );
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch all other users
  const allUsers = useMemo(() => {
    const users = getAllRegisteredUsers();
    return users.filter((u) => u.id !== currentUser.id && !u.isGuest);
  }, [currentUser.id]);

  // Orbit / Following list
  const userFollowingIds = useMemo(() => {
    return Array.isArray(currentUser.following) ? currentUser.following : [];
  }, [currentUser.following]);

  // Filter users by orbit tab and search query
  const filteredUsers = useMemo(() => {
    let list = allUsers;

    if (orbitFilter === 'orbit' && userFollowingIds.length > 0) {
      list = list.filter((u) => userFollowingIds.includes(u.id));
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((u) => {
      const name = (u.displayName || u.username || '').toLowerCase();
      const handle = (u.handle || '').toLowerCase().replace(/^@/, '');
      const bio = (u.bio || u.quote || '').toLowerCase();
      return name.includes(q) || handle.includes(q) || bio.includes(q);
    });
  }, [allUsers, orbitFilter, userFollowingIds, searchQuery]);

  const handleRandomizeClusterName = () => {
    const randomPick = CLUSTER_NAME_SUGGESTIONS[Math.floor(Math.random() * CLUSTER_NAME_SUGGESTIONS.length)];
    setGroupName(randomPick);
  };

  const handleToggleUserSelection = (userId: string) => {
    if (chatType === 'dm') {
      const targetUser = allUsers.find((u) => u.id === userId);
      if (targetUser) {
        const room = createOrGetDirectRoom(currentUser, targetUser);
        onRoomCreated(room);
        onClose();
      }
    } else {
      setSelectedUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
      setErrorMsg('');
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setErrorMsg(`Please select at least one Explorer from ${TERMS.FOLLOWING} to ignite a ${TERMS.GROUP_CHAT}.`);
      return;
    }
    const name = groupName.trim() || `✨ Signal Cluster (${selectedUserIds.length + 1} Explorers)`;
    const room = createGroupChatRoom(currentUser, selectedUserIds, name, groupDescription);
    onRoomCreated(room);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="create-chat-modal-overlay"
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="create-chat-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white/95 dark:bg-[#040a1c]/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-amber-300/30 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Accent Bar */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-300/30 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{chatType === 'dm' ? `Transmit ${TERMS.MESSAGE}` : `Ignite ${TERMS.GROUP_CHAT}`}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Strictly private & encrypted across cosmos</p>
              </div>
            </div>

            <button
              id="btn-close-create-chat"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher: 1-on-1 vs Signal Cluster */}
          <div className="px-5 pt-3">
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10">
              <button
                type="button"
                id="tab-create-dm"
                onClick={() => {
                  setChatType('dm');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  chatType === 'dm'
                    ? 'bg-white dark:bg-amber-400/20 text-slate-950 dark:text-amber-200 shadow-sm border border-slate-200/80 dark:border-amber-300/40'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{TERMS.CONVERSATION}</span>
              </button>

              <button
                type="button"
                id="tab-create-group"
                onClick={() => {
                  setChatType('group');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  chatType === 'group'
                    ? 'bg-white dark:bg-amber-400/20 text-slate-950 dark:text-amber-200 shadow-sm border border-slate-200/80 dark:border-amber-300/40'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{TERMS.GROUP_CHAT}</span>
              </button>
            </div>
          </div>

          {/* Form fields for Group */}
          <div className="px-5 pt-3 space-y-2.5">
            {chatType === 'group' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                    Cluster Name
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomizeClusterName}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    <Dices className="w-3 h-3" />
                    <span>Cosmic Idea</span>
                  </button>
                </div>
                <input
                  id="input-group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. ✨ Orion Nebula Vanguard, Quantum Poets..."
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 placeholder-slate-400"
                />
              </div>
            )}

            {/* Orbit Filter Tabs */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrbitFilter('orbit')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    orbitFilter === 'orbit'
                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Orbit className="w-3 h-3 text-amber-500" />
                  <span>{TERMS.FOLLOWING} ({userFollowingIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrbitFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    orbitFilter === 'all'
                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  All Explorers ({allUsers.length})
                </button>
              </div>

              {chatType === 'group' && (
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {selectedUserIds.length} Selected
                </span>
              )}
            </div>

            {/* Selected User Pills for Group */}
            {chatType === 'group' && selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto p-1.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                {selectedUserIds.map((id) => {
                  const user = allUsers.find((u) => u.id === id);
                  if (!user) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 dark:border-amber-300/30 shadow-2xs"
                    >
                      <span>{user.displayName || user.username}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleUserSelection(id)}
                        className="hover:text-rose-500 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* User Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-chat-users"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Explorers by name or @handle..."
                className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs pl-9 pr-3.5 py-2 rounded-xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 placeholder-slate-400"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 min-h-[180px] max-h-[260px] custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {orbitFilter === 'orbit' && userFollowingIds.length === 0
                  ? `You are not currently in orbit with any Explorers. Switch to "All Explorers" to find crew!`
                  : `No Explorers found matching "${searchQuery}"`}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const handle = generateCleanHandle(user.username || user.handle || user.displayName);
                const isOnline = isUserInOrbit(user.id, currentUser.id);

                return (
                  <div
                    key={user.id}
                    id={`chat-user-item-${user.id}`}
                    onClick={() => handleToggleUserSelection(user.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 dark:bg-amber-400/15 border-amber-500/40 dark:border-amber-300/40 shadow-xs'
                        : 'bg-white/80 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border border-amber-400/40 bg-slate-200 dark:bg-slate-900 flex items-center justify-center shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Sparkles className="w-4 h-4 text-amber-500" />
                        )}
                        <span 
                          title={isOnline ? TERMS.ONLINE : TERMS.OFFLINE}
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-950 ${
                            isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-400 dark:bg-slate-600'
                          }`} 
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {user.displayName || user.username}
                          </p>
                          {isOnline && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-0.5">
                              <CircleDot className="w-2 h-2 animate-pulse" />
                              <span>{TERMS.ONLINE}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium truncate">
                          @{handle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {chatType === 'dm' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                          <span>{TERMS.CONVERSATION}</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-xs'
                              : 'border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer for Group creation */}
          {chatType === 'group' && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/20 flex flex-col gap-2">
              {errorMsg && (
                <p className="text-xs text-rose-500 dark:text-rose-400 font-medium text-center">
                  {errorMsg}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedUserIds.length} Explorer{selectedUserIds.length === 1 ? '' : 's'} linked
                </span>
                <button
                  id="btn-confirm-create-group"
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={selectedUserIds.length === 0}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 ${
                    selectedUserIds.length > 0
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 hover:brightness-105 border border-amber-200'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Ignite {TERMS.GROUP_CHAT}</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

