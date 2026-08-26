import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Radio, 
  Plus, 
  Lock, 
  Sparkles, 
  LogIn, 
  UserPlus,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { User, ChatRoom } from '../../types';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { CreateChatModal } from './CreateChatModal';
import { createOrGetDirectRoom, ensureUserWelcomeChats, getUnreadMessagesCount, CHAT_UPDATE_EVENT } from '../../utils/chatStorage';
import { TERMS } from '../../constants/terminology';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  initialRoomId?: string | null;
  initialTargetUser?: User | null;
  onOpenAuthModal?: (mode: 'signin' | 'signup', bannerMessage?: string) => void;
  onOpenUserProfile?: (user: User) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialRoomId,
  initialTargetUser,
  onOpenAuthModal,
  onOpenUserProfile,
}) => {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId || null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTargetUser, setCreateModalTargetUser] = useState<User | null>(null);
  const [totalUnread, setTotalUnread] = useState<number>(0);

  // Initialize welcome chats if user signs in
  useEffect(() => {
    if (currentUser && !currentUser.isGuest) {
      ensureUserWelcomeChats(currentUser);
      setTotalUnread(getUnreadMessagesCount(currentUser.id));
    }
  }, [currentUser]);

  // Listen to chat updates for total unread badge
  useEffect(() => {
    if (!currentUser || currentUser.isGuest) return;

    const handleUpdate = () => {
      setTotalUnread(getUnreadMessagesCount(currentUser.id));
    };

    window.addEventListener(CHAT_UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handleUpdate);
    };
  }, [currentUser]);

  // Handle external triggers for specific room or specific target user
  useEffect(() => {
    if (initialRoomId) {
      setActiveRoomId(initialRoomId);
    }
  }, [initialRoomId]);

  useEffect(() => {
    if (isOpen && initialTargetUser && currentUser && !currentUser.isGuest) {
      if (initialTargetUser.id !== currentUser.id) {
        const directRoom = createOrGetDirectRoom(currentUser, initialTargetUser);
        setActiveRoomId(directRoom.id);
      }
    }
  }, [isOpen, initialTargetUser, currentUser]);

  const handleRoomCreated = (room: ChatRoom) => {
    setActiveRoomId(room.id);
  };

  const handleOpenNewChat = (target?: User) => {
    setCreateModalTargetUser(target || null);
    setIsCreateModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="chat-drawer-overlay" 
        className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      >
        <motion.div
          id="chat-drawer-panel"
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-md h-full bg-white/95 dark:bg-[#040a1c]/95 border-l border-slate-200 dark:border-amber-300/30 text-slate-900 dark:text-slate-100 flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Cosmic Gradient Bar */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shrink-0" />

          {/* Top Panel Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-white/50 dark:bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-300/30 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{TERMS.INBOX}</span>
                  {totalUnread > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold shadow-xs animate-bounce">
                      {totalUnread} new
                    </span>
                  )}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {TERMS.CONVERSATION} & {TERMS.GROUP_CHAT} Telemetry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {currentUser && !currentUser.isGuest && !activeRoomId && (
                <button
                  id="btn-header-new-chat"
                  type="button"
                  onClick={() => handleOpenNewChat()}
                  className="p-1.5 rounded-xl text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title={`Transmit new ${TERMS.MESSAGE}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                id="btn-close-chat-drawer"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Close chat drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Drawer Body */}
          <div className="flex-1 overflow-hidden relative">
            {!currentUser || currentUser.isGuest ? (
              /* Signed out / Guest prompt */
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 mb-4 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Private Signals Protected
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
                  {TERMS.LOGIN} or {TERMS.SIGNUP} to exchange direct signals, share {TERMS.POST} links, and collaborate in {TERMS.GROUP_CHAT} with {TERMS.USER}s.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                  <button
                    id="btn-chat-prompt-signin"
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuthModal?.('signin', 'Sign in to access your cosmic signals.');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 hover:brightness-105 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{TERMS.LOGIN}</span>
                  </button>

                  <button
                    id="btn-chat-prompt-signup"
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuthModal?.('signup');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 active:scale-95 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{TERMS.SIGNUP}</span>
                  </button>
                </div>
              </div>
            ) : activeRoomId ? (
              /* Active Chat Thread Window */
              <ChatWindow
                roomId={activeRoomId}
                currentUser={currentUser}
                onBack={() => setActiveRoomId(null)}
                onOpenUserProfile={onOpenUserProfile}
              />
            ) : (
              /* Conversation List */
              <ChatList
                currentUser={currentUser}
                onSelectRoom={(roomId) => setActiveRoomId(roomId)}
                onOpenCreateChat={() => handleOpenNewChat()}
                activeRoomId={activeRoomId}
              />
            )}
          </div>
        </motion.div>

        {/* Create Chat Modal */}
        {currentUser && !currentUser.isGuest && (
          <CreateChatModal
            isOpen={isCreateModalOpen}
            onClose={() => {
              setIsCreateModalOpen(false);
              setCreateModalTargetUser(null);
            }}
            currentUser={currentUser}
            onRoomCreated={handleRoomCreated}
            initialTargetUser={createModalTargetUser}
          />
        )}
      </div>
    </AnimatePresence>
  );
};

