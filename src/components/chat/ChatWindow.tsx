import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Users, 
  Lock, 
  ShieldCheck, 
  Clock, 
  User as UserIcon,
  Info,
  X,
  ExternalLink,
  MoreVertical,
  Trash2,
  LogOut,
  AlertTriangle,
  Plus,
  FileText,
  Download,
  Maximize2,
  BellOff,
  Bell
} from 'lucide-react';
import { User, ChatRoom, ChatMessage, ChatAttachment } from '../../types';
import { 
  getRoomById, 
  getMessagesForRoom, 
  sendMessage, 
  markRoomAsRead, 
  getRoomDisplayInfo, 
  resolveParticipants, 
  formatChatTimestamp,
  deleteMessage,
  leaveGroupChat,
  deleteChatRoom,
  toggleRoomQuietOrbit,
  isRoomInQuietOrbit,
  CHAT_UPDATE_EVENT
} from '../../utils/chatStorage';
import { TERMS } from '../../constants/terminology';

interface ChatWindowProps {
  roomId: string;
  currentUser: User;
  onBack: () => void;
  onOpenUserProfile?: (user: User) => void;
}

type ConfirmModalType = 'delete_message' | 'leave_group' | 'delete_room' | null;

export const ChatWindow: React.FC<ChatWindowProps> = ({
  roomId,
  currentUser,
  onBack,
  onOpenUserProfile,
}) => {
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalType>(null);
  const [targetMessageIdToDelete, setTargetMessageIdToDelete] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!roomId || !currentUser) return;
    const r = getRoomById(roomId, currentUser.id);
    setRoom(r);

    if (r) {
      const msgs = getMessagesForRoom(roomId, currentUser.id);
      setMessages(msgs);
      markRoomAsRead(roomId, currentUser.id);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener(CHAT_UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handleUpdate);
    };
  }, [roomId, currentUser.id]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Auto-scroll to bottom on messages change or attachment change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAttachments]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, [roomId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          const newAttachment: ChatAttachment = {
            url: resultUrl,
            name: file.name,
            type: isImage ? 'image' : 'file',
            size: file.size,
          };
          setPendingAttachments((prev) => [...prev, newAttachment]);
        }
      };

      reader.readAsDataURL(file);
    });

    // Reset input so re-selecting the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingAttachment = (indexToRemove: number) => {
    setPendingAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if ((!text && !hasAttachments) || !room || isSending) return;

    setIsSending(true);
    const newMsg = sendMessage(roomId, currentUser, text, hasAttachments ? pendingAttachments : undefined);
    if (newMsg) {
      setInputText('');
      setPendingAttachments([]);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents default form submit from firing twice
      handleSend();
    }
  };

  const handleConfirmDeleteMessage = (msgId: string) => {
    const success = deleteMessage(roomId, msgId, currentUser.id);
    if (success) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
    setTargetMessageIdToDelete(null);
    setConfirmModal(null);
  };

  const handleConfirmLeaveGroup = () => {
    if (!room) return;
    const success = leaveGroupChat(room.id, currentUser);
    if (success) {
      setConfirmModal(null);
      onBack();
    }
  };

  const handleConfirmDeleteRoom = () => {
    if (!room) return;
    const success = deleteChatRoom(room.id, currentUser.id);
    if (success) {
      setConfirmModal(null);
      onBack();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Private Conversation
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
          This thread is strictly private. You must be explicitly included in this conversation's participants to view or send messages.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300"
        >
          Return to Conversations
        </button>
      </div>
    );
  }

  const displayInfo = getRoomDisplayInfo(room, currentUser.id);
  const participants = resolveParticipants(room.participantIds);
  const isMuted = Boolean(room?.mutedUserIds && room.mutedUserIds.includes(currentUser.id));

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
        className="hidden"
        id="chat-file-input"
      />

      {/* Thread Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-white/40 dark:bg-black/20 backdrop-blur-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            id="btn-chat-back"
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Back to conversation list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-amber-400/50 bg-slate-200 dark:bg-slate-900 flex items-center justify-center shrink-0">
            {room.isGroup ? (
              <div className="w-full h-full bg-gradient-to-tr from-amber-500/30 to-yellow-300/30 flex items-center justify-center text-amber-700 dark:text-amber-200">
                <Users className="w-4 h-4" />
              </div>
            ) : displayInfo.avatarUrl ? (
              <img
                src={displayInfo.avatarUrl}
                alt={displayInfo.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500" />
            )}
            {!room.isGroup && (
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-white dark:border-slate-950" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {displayInfo.title}
              </h3>
              {isMuted && (
                <span title="Quiet Orbit 🤫 (Muted)" className="text-slate-400 dark:text-slate-500 shrink-0">
                  <BellOff className="w-3.5 h-3.5" />
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                <Lock className="w-2 h-2" />
                <span>Private</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {room.isGroup
                ? `${participants.length} cosmic members: ${participants.map((p) => p.displayName || p.username).join(', ')}`
                : displayInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          {/* Quick Quiet Orbit button */}
          <button
            type="button"
            id="btn-header-quiet-orbit"
            onClick={() => {
              if (room) {
                toggleRoomQuietOrbit(room.id, currentUser.id);
                loadData();
              }
            }}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isMuted
                ? 'text-amber-600 dark:text-amber-300 bg-amber-500/15'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title={isMuted ? 'Restore Orbit 🔔 (Unmute notifications)' : 'Quiet Orbit 🤫 (Mute notifications)'}
          >
            {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>

          {/* Info button toggle */}
          <button
            type="button"
            id="btn-chat-info"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              showInfo ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : ''
            }`}
            title="Conversation participants and details"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* More options menu button */}
          <button
            type="button"
            id="btn-chat-options-menu"
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              showMenu ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : ''
            }`}
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-amber-300/20 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                id="menu-item-view-info"
                onClick={() => {
                  setShowInfo(!showInfo);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{showInfo ? 'Hide Members' : 'View Members'}</span>
              </button>

              {/* Quiet Orbit / Restore Orbit */}
              <button
                type="button"
                id="menu-item-toggle-quiet-orbit"
                onClick={() => {
                  if (room) {
                    toggleRoomQuietOrbit(room.id, currentUser.id);
                    loadData();
                  }
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                {isMuted ? (
                  <>
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    <span>Restore Orbit 🔔</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Quiet Orbit 🤫</span>
                  </>
                )}
              </button>

              {/* Leave Group (Group chats only) */}
              {room.isGroup && (
                <button
                  type="button"
                  id="menu-item-leave-group"
                  onClick={() => {
                    setShowMenu(false);
                    setConfirmModal('leave_group');
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Cluster</span>
                </button>
              )}

              {/* Delete Entire Conversation */}
              <button
                type="button"
                id="menu-item-delete-thread"
                onClick={() => {
                  setShowMenu(false);
                  setConfirmModal('delete_room');
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left border-t border-slate-100 dark:border-white/5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {TERMS.CONVERSATION}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Participants Drawer (Collapsible) */}
      {showInfo && (
        <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 animate-in slide-in-from-top duration-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Participants ({participants.length})
            </span>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {participants.map((p) => (
              <div
                key={p.id}
                onClick={() => onOpenUserProfile && onOpenUserProfile(p)}
                className={`flex items-center justify-between p-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 ${
                  onOpenUserProfile ? 'cursor-pointer hover:border-amber-400/50' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-300/40 bg-slate-900 flex items-center justify-center shrink-0">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-300" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {p.displayName || p.username}
                  </span>
                </div>
                {p.id === currentUser.id ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                    You
                  </span>
                ) : (
                  <ExternalLink className="w-3 h-3 text-slate-400 hover:text-amber-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {/* Top welcome bubble */}
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-300 mb-1.5">
            <Lock className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            End-to-End Private Channel
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs">
            Only designated participants have access to this conversation.
          </p>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === 'system';
          const formattedTime = formatChatTimestamp(msg.timestamp);

          if (isSystem) {
            return (
              <div key={msg.id || idx} className="flex justify-center my-2">
                <div className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-white/10 text-[10px] text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-white/10 flex items-center gap-1.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          // Find sender avatar
          const senderUser = participants.find((p) => p.id === msg.senderId);
          const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;

          return (
            <div
              key={msg.id || idx}
              className={`group/msg flex items-end gap-2 relative ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Other's avatar */}
              {!isMe && (
                <div
                  onClick={() => senderUser && onOpenUserProfile && onOpenUserProfile(senderUser)}
                  className={`w-7 h-7 rounded-full overflow-hidden border border-amber-400/40 bg-slate-900 flex items-center justify-center shrink-0 mb-0.5 ${
                    senderUser && onOpenUserProfile ? 'cursor-pointer' : ''
                  }`}
                  title={msg.senderName}
                >
                  {senderUser?.avatarUrl ? (
                    <img
                      src={senderUser.avatarUrl}
                      alt={msg.senderName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
              )}

              {/* Action menu for own message: Delete Message button on hover */}
              {isMe && (
                <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center self-center shrink-0">
                  <button
                    type="button"
                    id={`btn-delete-msg-${msg.id}`}
                    onClick={() => {
                      setTargetMessageIdToDelete(msg.id);
                      setConfirmModal('delete_message');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs shadow-xs relative break-words leading-relaxed space-y-2 ${
                  isMe
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 rounded-br-xs font-medium'
                    : 'bg-white/90 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/10 rounded-bl-xs'
                }`}
              >
                {!isMe && room.isGroup && (
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mb-0.5 truncate">
                    {msg.senderName}
                  </p>
                )}

                {/* Render Attachments (if any) */}
                {hasAttachments && (
                  <div className="space-y-1.5">
                    {msg.attachments!.map((att, attIdx) => {
                      if (att.type === 'image') {
                        return (
                          <div
                            key={attIdx}
                            className="relative group/att overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/5 cursor-pointer max-w-sm"
                            onClick={() => setLightboxImage({ url: att.url, name: att.name })}
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full max-h-60 object-cover rounded-xl transition-transform duration-200 group-hover/att:scale-[1.02]"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5">
                              <Maximize2 className="w-4 h-4 drop-shadow" />
                              <span className="text-[10px] font-medium drop-shadow">Expand</span>
                            </div>
                          </div>
                        );
                      }

                      // Non-image file attachment card
                      return (
                        <div
                          key={attIdx}
                          className={`flex items-center justify-between gap-3 p-2 rounded-xl border transition-all ${
                            isMe
                              ? 'bg-amber-500/20 border-amber-600/30 text-slate-950'
                              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isMe ? 'bg-amber-600/20' : 'bg-slate-200 dark:bg-white/10'}`}>
                              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold truncate max-w-[160px] sm:max-w-[200px]" title={att.name}>
                                {att.name}
                              </p>
                              {att.size && (
                                <p className="text-[9px] opacity-70">
                                  {formatFileSize(att.size)}
                                </p>
                              )}
                            </div>
                          </div>

                          <a
                            href={att.url}
                            download={att.name}
                            className={`p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer ${
                              isMe
                                ? 'hover:bg-amber-600/30 text-slate-950'
                                : 'hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300'
                            }`}
                            title="Download file"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text body */}
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                <span
                  className={`text-[9px] block text-right mt-1 opacity-70 font-sans ${
                    isMe ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {formattedTime}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Pending Attachments Preview Bar */}
      {pendingAttachments.length > 0 && (
        <div className="px-3 pt-2 pb-1 bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
            {pendingAttachments.map((att, idx) => (
              <div
                key={idx}
                className="relative group shrink-0 rounded-xl overflow-hidden border border-amber-400/40 bg-white dark:bg-black/40 p-1 flex items-center gap-1.5 pr-2 max-w-[160px] shadow-sm"
              >
                {att.type === 'image' ? (
                  <img src={att.url} alt={att.name} className="w-9 h-9 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {att.name}
                  </p>
                  <p className="text-[8px] text-slate-400 uppercase">
                    {att.type === 'image' ? 'Image' : 'Document'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePendingAttachment(idx)}
                  className="w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-xs"
                  title="Remove attachment"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar (Instagram-style with + button on the left) */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur-sm shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Plus / Attachment Button */}
          <button
            id="btn-chat-attach-file"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-amber-500/15 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-xs"
            title="Attach images or documents"
          >
            <Plus className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            id="input-chat-message"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingAttachments.length > 0 ? 'Add a caption...' : `Message ${displayInfo.title}...`}
            className="flex-1 bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs px-3.5 py-2.5 rounded-2xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 placeholder-slate-400"
          />

          <button
            id="btn-send-chat-message"
            type="submit"
            disabled={(!inputText.trim() && pendingAttachments.length === 0) || isSending}
            className={`p-2.5 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0 cursor-pointer ${
              (inputText.trim() || pendingAttachments.length > 0) && !isSending
                ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 hover:brightness-105 shadow-amber-500/20'
                : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Lightbox / Expanded View Modal for Images */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={lightboxImage.url}
              download={lightboxImage.name}
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            className="max-w-4xl max-h-[85vh] p-2 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <p className="text-xs text-white/80 mt-2 font-medium truncate max-w-md text-center">
              {lightboxImage.name}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-amber-300/30 rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {confirmModal === 'delete_message' && 'Delete this message?'}
                {confirmModal === 'leave_group' && 'Leave this group?'}
                {confirmModal === 'delete_room' && 'Delete conversation?'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {confirmModal === 'delete_message' && 'This message will be permanently removed for all participants in this thread.'}
                {confirmModal === 'leave_group' && `You will leave "${displayInfo.title}". You will no longer receive new messages from this group.`}
                {confirmModal === 'delete_room' && 'Are you sure you want to delete this conversation? All messages in this thread will be permanently deleted for you.'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setTargetMessageIdToDelete(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-modal-confirm-action"
                onClick={() => {
                  if (confirmModal === 'delete_message' && targetMessageIdToDelete) {
                    handleConfirmDeleteMessage(targetMessageIdToDelete);
                  } else if (confirmModal === 'leave_group') {
                    handleConfirmLeaveGroup();
                  } else if (confirmModal === 'delete_room') {
                    handleConfirmDeleteRoom();
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-md shadow-rose-600/20"
              >
                {confirmModal === 'delete_message' && 'Delete'}
                {confirmModal === 'leave_group' && 'Leave'}
                {confirmModal === 'delete_room' && 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
