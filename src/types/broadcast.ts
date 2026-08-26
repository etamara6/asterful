export interface BroadcastComment {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
}

export interface LiveBroadcast {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  title: string;
  privacy: 'PUBLIC' | 'FRIENDS_ONLY';
  viewerCount: number;
  isLive: boolean;
  startedAt: string;
  comments: BroadcastComment[];
}
