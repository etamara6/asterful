import React from 'react';
import { StarDetailDrawer } from './StarDetailDrawer';
import { StarNode, ConstellationEdge, User } from '../types';
import { AuthMode } from './AuthModal';

export interface StarDetailsModalProps {
  star: StarNode | null;
  allStars: StarNode[];
  edges?: ConstellationEdge[];
  currentUser?: User | null;
  isOpen?: boolean;
  onClose: () => void;
  onRemix?: (parentStar: StarNode) => void;
  onSelectStar?: (star: StarNode) => void;
  onTagClick?: (tag: string) => void;
  onLikeStar?: (starId: string) => void;
  onToggleReignite?: (starId: string) => void;
  onTogglePin?: (starId: string) => void;
  onToggleSave?: (starId: string) => void;
  onReformStar?: (star: StarNode) => void;
  onDeleteStar?: (starId: string) => void;
  onFocusInCanvas?: (star: StarNode) => void;
  onOpenAuthorProfile?: (authorUser: User) => void;
  onOpenAuthModal?: (mode: AuthMode, bannerMessage?: string) => void;
  onToggleFollow?: (authorUser: User) => void;
  onStartChat?: (authorUser: User) => void;
  onAddGlowback?: (starId: string, text: string) => void;
  onToggleGlowbackGlow?: (starId: string, glowbackId: string) => void;
}

export const StarDetailsModal: React.FC<StarDetailsModalProps> = ({
  star,
  allStars,
  edges = [],
  currentUser,
  isOpen = true,
  onClose,
  onRemix = () => {},
  onSelectStar = () => {},
  onTagClick = () => {},
  onLikeStar = () => {},
  onToggleReignite,
  onTogglePin,
  onToggleSave,
  onReformStar,
  onDeleteStar,
  onFocusInCanvas = () => {},
  onOpenAuthorProfile,
  onOpenAuthModal,
  onToggleFollow,
  onStartChat,
  onAddGlowback,
  onToggleGlowbackGlow,
}) => {
  if (!isOpen || !star) return null;

  return (
    <StarDetailDrawer
      star={star}
      allStars={allStars}
      edges={edges}
      currentUser={currentUser}
      onClose={onClose}
      onRemix={onRemix}
      onSelectStar={onSelectStar}
      onTagClick={onTagClick}
      onLikeStar={onLikeStar}
      onToggleReignite={onToggleReignite}
      onTogglePin={onTogglePin}
      onToggleSave={onToggleSave}
      onReformStar={onReformStar}
      onDeleteStar={onDeleteStar}
      onFocusInCanvas={onFocusInCanvas}
      onOpenAuthorProfile={onOpenAuthorProfile}
      onOpenAuthModal={onOpenAuthModal}
      onToggleFollow={onToggleFollow}
      onStartChat={onStartChat}
      onAddGlowback={onAddGlowback}
      onToggleGlowbackGlow={onToggleGlowbackGlow}
    />
  );
};
