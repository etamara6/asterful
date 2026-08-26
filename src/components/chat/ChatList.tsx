import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Users, 
  Search, 
  Plus, 
  Sparkles, 
  Lock,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Globe2,
  CircleDot,
  VolumeX,
  Volume2,
  BellOff,
  Bell
} from 'lucide-react';
import { User, ChatRoom } from '../../types';
import { 
  getRoomsForUser, 
  getRoomDisplayInfo, 
  formatChatTimestamp, 
  CHAT_UPDATE_EVENT,
  getUnreadCountForRoom,
  deleteChatRoom,
  isUserInOrbit,
  toggleRoomQuietOrbit,
  isRoomInQuietOrbit
} from '../../utils/chatStorage';
import { TERMS } from '../../constants/terminology';

interface ChatListProps {
  currentUser: User;
  onSelectRoom: (roomId: string) => void;
  onOpenCreateChat: () => void;
  activeRoomId?: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({
  currentUser,
  onSelectRoom,
  onOpenCreateChat,
  activeRoomId,
}) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'direct' | 'groups'>('all');
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);

  const loadRooms = () => {
    if (!currentUser || currentUser.isGuest) {
      setRooms([]);
      return;
    }
    const userRooms = getRoomsForUser(currentUser.id);
    setRooms(userRooms);
  };

  useEffect(() => {
    loadRooms();

    const handleUpdate = () => {
      loadRooms();
    };

    window.addEventListener(CHAT_UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handleUpdate);
    };
  }, [currentUser]);

  const handleConfirmDelete = () => {
    if (!roomToDelete || !currentUser) return;
    deleteChatRoom(roomToDelete.id, currentUser.id);
    setRoomToDelete(null);
    loadRooms();
  };

  // Filter rooms
  const filteredRooms = useMemo(() => {
    let list = rooms;

    if (filterMode === 'direct') {
      list = list.filter((r) => !r.isGroup);
    } else if (filterMode === 'groups') {
      list = list.filter((r) => r.isGroup);
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((room) => {
      const info = getRoomDisplayInfo(room, currentUser.id);
      return (
        info.title.toLowerCase().includes(q) ||
        info.subtitle.toLowerCase().includes(q) ||
        (room.lastMessage && room.lastMessage.toLowerCase().includes(q))
      );
    });
  }, [rooms, filterMode, searchQuery, currentUser.id]);

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Header controls: Search & New Chat Button */}
      <div className="p-4 space-y-3 border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>{TERMS.INBOX}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono">
                {rooms.length}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
              <Lock className="w-2.5 h-2.5" />
              <span>Direct Telemetry</span>
            </span>
          </div>

          <button
            id="btn-new-chat-list"
            type="button"
            onClick={onOpenCreateChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-105 transition-all shadow-sm active:scale-95 cursor-pointer"
            title={`Transmit new ${TERMS.MESSAGE}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{TERMS.SEND_MESSAGE}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-chats"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${TERMS.CONVERSATION} & ${TERMS.GROUP_CHAT}...`}
            className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs pl-9 pr-3.5 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 placeholder-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            All Signals
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('direct')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterMode === 'direct'
                ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {TERMS.CONVERSATION} ({rooms.filter((r) => !r.isGroup).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('groups')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterMode === 'groups'
                ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {TERMS.GROUP_CHAT} ({rooms.filter((r) => r.isGroup).length})
          </button>
        </div>
      </div>

      {/* Room list items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-300 mb-3">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {searchQuery ? 'No matching signal frequencies' : 'No cosmic signals yet'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
              {searchQuery
                ? 'Try a different search frequency or ignite a new signal.'
                : `Transmit a direct ${TERMS.MESSAGE} to any Explorer in ${TERMS.FOLLOWING} or ignite a ${TERMS.GROUP_CHAT}.`}
            </p>
            <button
              type="button"
              onClick={onOpenCreateChat}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-105 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Transmit Signal 📡</span>
            </button>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const info = getRoomDisplayInfo(room, currentUser.id);
            const isSelected = activeRoomId === room.id;
            const formattedTime = formatChatTimestamp(room.updatedAt);
            const unreadCount = getUnreadCountForRoom(room.id, currentUser.id);
            const isOnline = info.otherUser ? isUserInOrbit(info.otherUser.id, currentUser.id) : false;
            const isMuted = Boolean(room.mutedUserIds && room.mutedUserIds.includes(currentUser.id));

            return (
              <div
                key={room.id}
                id={`chat-room-item-${room.id}`}
                onClick={() => onSelectRoom(room.id)}
                className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 dark:bg-amber-400/15 border-amber-500/40 dark:border-amber-300/40 shadow-sm'
                    : 'bg-white/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.07] hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:border-amber-400/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                  {/* Avatar or Group Icon */}
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border border-amber-400/40 bg-slate-200 dark:bg-slate-900 flex items-center justify-center shrink-0">
                    {room.isGroup ? (
                      <div className="w-full h-full bg-gradient-to-tr from-amber-500/30 to-yellow-300/30 flex items-center justify-center text-amber-700 dark:text-amber-200">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : info.avatarUrl ? (
                      <img
                        src={info.avatarUrl}
                        alt={info.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    )}

                    {/* Online / Orbit status indicator */}
                    {!room.isGroup && (
                      <span 
                        title={isOnline ? TERMS.ONLINE : TERMS.OFFLINE}
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 ${
                          isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-400 dark:bg-slate-600'
                        }`} 
                      />
                    )}
                  </div>

                  {/* Title, Subtitle, and Last Message */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors">
                          {info.title}
                        </h4>
                        {isMuted && (
                          <span title="Quiet Orbit 🤫 (Muted)" className="text-slate-400 dark:text-slate-500 shrink-0">
                            <BellOff className="w-3 h-3" />
                          </span>
                        )}
                        {!room.isGroup && isOnline && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-0.5">
                            <CircleDot className="w-2.5 h-2.5 animate-pulse" />
                            <span className="hidden sm:inline">{TERMS.ONLINE}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {formattedTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[11px] truncate font-medium ${
                        unreadCount > 0 
                          ? 'text-slate-900 dark:text-amber-200 font-bold' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {room.lastMessage || 'No signals transmitted yet'}
                      </p>

                      {unreadCount > 0 && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Quiet Orbit Toggle Button */}
                  <button
                    type="button"
                    id={`btn-toggle-quiet-orbit-${room.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleRoomQuietOrbit(room.id, currentUser.id);
                      loadRooms();
                    }}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isMuted
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                        : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                    title={isMuted ? 'Restore Orbit 🔔' : 'Quiet Orbit 🤫'}
                  >
                    {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  </button>

                  {/* Delete Conversation Button on hover */}
                  <button
                    type="button"
                    id={`btn-delete-room-list-${room.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setRoomToDelete(room);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
                    title={`Delete ${room.isGroup ? TERMS.GROUP_CHAT : TERMS.CONVERSATION}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {roomToDelete && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-amber-300/30 rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Disconnect {roomToDelete.isGroup ? TERMS.GROUP_CHAT : TERMS.CONVERSATION}?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to disconnect this signal thread with{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {getRoomDisplayInfo(roomToDelete, currentUser.id).title}
                </span>
                ? All signals will be permanently archived for you.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-room"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-md shadow-rose-600/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


