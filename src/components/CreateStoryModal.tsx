import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Video,
  Upload,
  Sparkles,
  Globe,
  Users,
  Image as ImageIcon,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react';
import { User, StoryPrivacy } from '../types';
import { TERMS } from '../constants/terminology';
import { COSMIC_STORY_PRESETS, createStarStory } from '../utils/storyStorage';
import { StarStory } from '../types/story';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onStoryCreated: (newStory: StarStory) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStoryCreated,
}) => {
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState<string>(COSMIC_STORY_PRESETS[0].url);
  const [caption, setCaption] = useState<string>('');
  const [privacy, setPrivacy] = useState<StoryPrivacy>('PUBLIC');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInputValue, setCustomUrlInputValue] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');

    if (!isVid && !isImg) {
      setError('Please upload a valid image or video file.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Media file must be smaller than 20MB.');
      return;
    }

    setMediaType(isVid ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setMediaUrl(result);
      }
    };
    reader.onerror = () => {
      setError('Failed to read media file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof COSMIC_STORY_PRESETS[0]) => {
    setMediaUrl(preset.url);
    setMediaType(preset.type);
    if (!caption) {
      setCaption(preset.caption);
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) {
      setError('Please provide or select a media asset for your Star Story.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const created = createStarStory({
        authorId: currentUser.id,
        authorName: currentUser.displayName || currentUser.username || 'Explorer',
        authorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        mediaUrl: mediaUrl.trim(),
        mediaType,
        caption: caption.trim() || undefined,
        privacy,
      });

      onStoryCreated(created);
      onClose();
    } catch {
      setError('Failed to publish Star Story. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="create-story-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="create-story-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="max-h-[92vh] flex flex-col w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden relative text-slate-900 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Cosmic Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-85 z-30" />

          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Create {TERMS.BIO} ✨</span>
                  <span className="text-xs font-normal text-slate-400">24h Ephemeral Moment</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Share a snapshot or moving star across the cosmos
                </p>
              </div>
            </div>
            <button
              id="btn-close-create-story"
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form
            id="form-create-star-story"
            onSubmit={handleSubmit}
            className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* SECTION 1: Media Preview & Upload Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Left Column: Vertical Story Aspect Preview */}
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[240px] aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] group flex flex-col justify-between p-3.5">
                  {/* Media Content */}
                  {mediaUrl && (
                    mediaType === 'video' ? (
                      <video
                        src={mediaUrl}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Story Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )
                  )}

                  {/* Top Overlay in Preview */}
                  <div className="relative z-10 flex items-center justify-between w-full bg-black/40 backdrop-blur-xs p-1.5 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                        alt={currentUser.displayName}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-300"
                      />
                      <span className="text-[10px] font-bold text-white truncate max-w-[100px]">
                        {currentUser.displayName || currentUser.username}
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                      {privacy === 'PUBLIC' ? 'Open Sky 🌌' : 'Constellation Mates ✨'}
                    </span>
                  </div>

                  {/* Caption Preview at bottom */}
                  {caption && (
                    <div className="relative z-10 bg-black/65 backdrop-blur-md p-2 rounded-xl text-[11px] text-white/95 leading-snug border border-white/15">
                      {caption}
                    </div>
                  )}

                  {/* Hover Overlay Button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-amber-300 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Change Media</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fades from the cosmos in 24 hours 🌠</span>
                </div>
              </div>

              {/* Right Column: Media Selection, Type & Presets */}
              <div className="space-y-4">
                {/* Media Type Switcher */}
                <div>
                  <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider block mb-1.5">
                    Cosmic Media Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaType('image')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        mediaType === 'image'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <Camera className="w-4 h-4 text-amber-500" />
                      <span>{TERMS.PHOTO}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaType('video')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        mediaType === 'video'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span>{TERMS.VIDEO}</span>
                    </button>
                  </div>
                </div>

                {/* Upload & URL Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-upload-story-media"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                    <span>Upload File</span>
                  </button>

                  <button
                    type="button"
                    id="btn-toggle-story-url"
                    onClick={() => {
                      setShowUrlInput(!showUrlInput);
                      setCustomUrlInputValue(mediaUrl.startsWith('data:') ? '' : mediaUrl);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer active:scale-95"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{showUrlInput ? 'Hide URL' : 'Custom URL'}</span>
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-amber-300/30 animate-in fade-in duration-150">
                    <input
                      type="url"
                      value={customUrlInputValue}
                      onChange={(e) => setCustomUrlInputValue(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customUrlInputValue.trim()) {
                          setMediaUrl(customUrlInputValue.trim());
                          setShowUrlInput(false);
                        }
                      }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Celestial Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider block">
                    Cosmic Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {COSMIC_STORY_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`group relative h-14 rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                          mediaUrl === preset.url
                            ? 'ring-2 ring-amber-400 border-amber-400 scale-[1.02]'
                            : 'border-slate-300 dark:border-white/10 hover:border-amber-400/50'
                        }`}
                      >
                        <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-1.5">
                          <span className="text-[9px] font-bold text-white line-clamp-1">
                            {preset.title}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Caption / Cosmic Thought */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-story-caption"
                className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider block"
              >
                Story Caption ⭐ (Optional)
              </label>
              <textarea
                id="input-story-caption"
                rows={2}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Share a thought from your orbit across the cosmos..."
                maxLength={140}
                className="w-full bg-slate-50 dark:bg-[#07132c]/90 border border-slate-300 dark:border-amber-300/40 focus:border-amber-500 dark:focus:border-amber-300 focus:ring-1 focus:ring-amber-500/50 dark:focus:ring-amber-300/50 text-slate-900 dark:text-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition-all resize-none shadow-inner"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                <span>Add cosmic reflections, coordinates, or star thoughts</span>
                <span>{caption.length}/140</span>
              </div>
            </div>

            {/* SECTION 3: Privacy Selector (Open Sky 🌌 vs Constellation Mates ✨) */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-2.5">
              <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider block">
                Cosmic Story Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-privacy-public"
                  onClick={() => setPrivacy('PUBLIC')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    privacy === 'PUBLIC'
                      ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-sm'
                      : 'bg-white/70 dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-amber-400/40'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {TERMS.PUBLIC_ACCOUNT}
                      </span>
                      {privacy === 'PUBLIC' && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      All explorers in the cosmos can view this star story.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-privacy-friends"
                  onClick={() => setPrivacy('FRIENDS_ONLY')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    privacy === 'FRIENDS_ONLY'
                      ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-sm'
                      : 'bg-white/70 dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-amber-400/40'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-300 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {TERMS.FRIEND}
                      </span>
                      {privacy === 'FRIENDS_ONLY' && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      Only explorers in your orbit can view this star story.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* Footer Actions */}
          <div className="sticky bottom-0 z-10 bg-slate-900/90 backdrop-blur-md px-6 py-4 border-t border-white/10 flex justify-between items-center shrink-0">
            <button
              id="btn-cancel-create-story"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-300 hover:text-white text-xs font-medium cursor-pointer active:scale-95 transition-all"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Cancel</span>
            </button>

            <button
              id="btn-publish-star-story"
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !mediaUrl}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:to-yellow-300 text-slate-950 text-xs font-bold shadow-[0_0_20px_rgba(255,215,0,0.35)] border border-amber-200 cursor-pointer active:scale-95 disabled:opacity-60 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Illuminating Story...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Publish Star Story ✨</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
