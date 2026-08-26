import { StarNode, User, Glowback } from '../types';
import { createOrGetDirectRoom, sendMessage, CHAT_UPDATE_EVENT } from './chatStorage';
import { getUserForAuthor, generateCleanHandle } from './userRegistry';

/**
 * Triggers a Cosmic Signal notification when a user leaves a Glowback on a star.
 * Sends a message notification to the star author and dispatches global chat/signals updates.
 */
export function sendGlowbackCosmicSignal(
  star: StarNode,
  glowback: Glowback,
  senderUser: User
): { signalSent: boolean; message: string } {
  if (!star || !glowback || !senderUser) {
    return { signalSent: false, message: '' };
  }

  // Resolve author
  const authorUser = getUserForAuthor(star.author, star.authorId || star.userId);
  const senderName = senderUser.displayName || senderUser.username || senderUser.handle || 'A Stargazer';
  const commentPreview = glowback.text.length > 60 
    ? `${glowback.text.substring(0, 57)}...` 
    : glowback.text;

  const signalText = `💫 ${senderName} left a Glowback on your star "${star.title}": "${commentPreview}"`;

  // If author is another user (or author exists), deliver message to their cosmic signals room
  if (authorUser && authorUser.id !== senderUser.id) {
    try {
      const room = createOrGetDirectRoom(senderUser, authorUser);
      if (room) {
        sendMessage(
          room.id,
          {
            id: senderUser.id,
            displayName: senderName,
            username: senderUser.username || senderUser.handle,
          },
          signalText
        );
      }
    } catch {
      // ignore message delivery fallback
    }
  }

  // Dispatch custom signal event for any active listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cosmic_signal_received', {
        detail: {
          starId: star.id,
          starTitle: star.title,
          sender: senderUser,
          glowback,
          text: signalText,
        },
      })
    );
  }

  return {
    signalSent: true,
    message: `📡 Cosmic Signal sent: ${senderName} left a Glowback on "${star.title}"`,
  };
}
