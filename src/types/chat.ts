export interface StarLinkData {
  starId: string;
  title: string;
  cluster: string;
  authorName: string;
  authorHandle?: string;
  authorAvatar?: string;
  snippet: string;
  imageUrl?: string;
  tags?: string[];
  glowColor?: string;
}

export interface ChatAttachment {
  url: string;
  name: string;
  type: 'image' | 'file' | 'star_link';
  size?: number;
  starLink?: StarLinkData;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  starLink?: StarLinkData;
}

export interface ChatRoom {
  id: string;
  name?: string;
  isGroup: boolean;
  participantIds: string[];
  lastMessage?: string;
  updatedAt: string;
  createdBy?: string;
  description?: string;
  mutedUserIds?: string[];
}

