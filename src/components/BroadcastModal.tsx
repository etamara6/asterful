import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Radio,
  Users,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Globe,
  Lock,
  Flame,
  Heart,
  Share2,
  Maximize2,
  StopCircle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { LiveBroadcast, BroadcastComment } from '../types/broadcast';
import { User } from '../types';
import { TERMS } from '../constants/terminology';
import {
  getBroadcastById,
  createBroadcast,
  endBroadcast,
  addBroadcastComment,
  adjustViewerCount,
  COSMIC_BROADCAST_UPDATED_EVENT
} from '../utils/broadcastStorage';
import { AuthMode } from './AuthModal';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  initialBroadcastId?: string | null;
  isStartingBroadcast?: boolean;
  onOpenAuthModal?: (mode: AuthMode, bannerMessage?: string) => void;
  onOpenUserProfile?: (user: User) => void;
}

const PRESET_TITLES = [
  'Deep Space Stargazing & Live Telescope Feed 🔭✨',
  'Interstellar Ambient Live Synthesis & Chords 🎹🌌',
  'Astrophotography breakdown & Nebula Mapping 📸🌟',
  'Cosmic Q&A with Constellation Mates 🪐💫',
];


export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialBroadcastId = null,
  isStartingBroadcast = false,
  onOpenAuthModal,
  onOpenUserProfile,
}) => {
  const [activeBroadcast, setActiveBroadcast] = useState<LiveBroadcast | null>(null);
  const [isGoLiveMode, setIsGoLiveMode] = useState<boolean>(isStartingBroadcast);
  
  // Go Live form state
  const [streamTitle, setStreamTitle] = useState('');
  const [streamPrivacy, setStreamPrivacy] = useState<'PUBLIC' | 'FRIENDS_ONLY'>('PUBLIC');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Chat & interaction state
  const [commentInput, setCommentInput] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; icon: string; x: number }[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync active broadcast
  useEffect(() => {
    if (initialBroadcastId) {
      const b = getBroadcastById(initialBroadcastId);
      setActiveBroadcast(b);
      setIsGoLiveMode(false);
    } else if (isStartingBroadcast) {
      setIsGoLiveMode(true);
      setActiveBroadcast(null);
    }
  }, [initialBroadcastId, isStartingBroadcast, isOpen]);

  // Listen to broadcast storage updates
  useEffect(() => {
    const handleUpdate = () => {
      if (activeBroadcast?.id) {
        const updated = getBroadcastById(activeBroadcast.id);
        if (updated) {
          setActiveBroadcast(updated);
        }
      }
    };
    window.addEventListener(COSMIC_BROADCAST_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COSMIC_BROADCAST_UPDATED_EVENT, handleUpdate);
  }, [activeBroadcast?.id]);

  // Auto-scroll comments to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeBroadcast?.comments]);

  // Handle stream viewer fluctuations if broadcast active
  useEffect(() => {
    if (!isOpen || !activeBroadcast || !activeBroadcast.isLive) return;

    const viewerInterval = setInterval(() => {
      const delta = Math.floor(Math.random() * 3) - 1;
      adjustViewerCount(activeBroadcast.id, delta);
    }, 20000);

    return () => {
      clearInterval(viewerInterval);
    };
  }, [isOpen, activeBroadcast?.id, activeBroadcast?.isLive]);


  // Cosmic live audio/visualizer animation on canvas
  useEffect(() => {
    const canvas = videoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number = 0;
    let time = 0;
    let isRunning = true;
    let isIntersecting = true;

    // 60 FPS Frame Rate Capping (1000ms / 60 = 16.66ms)
    const FRAME_MIN_TIME = 1000 / 60;
    let lastRenderTime = performance.now();

    let width = 600;
    let height = 400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateDimensions = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.parentElement.clientWidth || 600;
      height = canvas.parentElement.clientHeight || 400;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (typeof ctx.resetTransform === 'function') {
        ctx.resetTransform();
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.scale(dpr, dpr);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions, { passive: true });

    const render = (now: number) => {
      if (!isRunning || document.hidden || !isIntersecting) {
        animationFrameId = 0;
        return;
      }

      const elapsed = now - lastRenderTime;
      if (elapsed < FRAME_MIN_TIME) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = now - (elapsed % FRAME_MIN_TIME);

      time += 0.03;

      // Deep space backdrop
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#060814');
      grad.addColorStop(0.5, '#0e122b');
      grad.addColorStop(1, '#050711');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Center nebula orb
      const centerX = width / 2;
      const centerY = height / 2;
      const pulse = Math.sin(time * 2) * 15;

      const radialGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        160 + pulse
      );
      radialGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
      radialGrad.addColorStop(0.35, 'rgba(168, 85, 247, 0.3)');
      radialGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.15)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 180 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Cosmic frequency audio wave lines
      ctx.lineWidth = 2.5;
      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        ctx.strokeStyle =
          wave === 0
            ? 'rgba(251, 191, 36, 0.65)'
            : wave === 1
            ? 'rgba(192, 132, 252, 0.55)'
            : 'rgba(56, 189, 248, 0.45)';

        for (let x = 0; x < width; x += 6) {
          const y =
            centerY +
            Math.sin(x * 0.015 + time + wave) * (30 + wave * 10) +
            Math.cos(x * 0.03 - time) * 15;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Floating starlight particles
      for (let i = 0; i < 40; i++) {
        const px = (Math.sin(i * 99 + time * 0.5) * 0.5 + 0.5) * width;
        const py = (Math.cos(i * 33 + time * 0.4) * 0.5 + 0.5) * height;
        const radius = (Math.sin(time + i) * 0.5 + 0.5) * 2.5 + 1;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 235, 160, 0.8)' : 'rgba(200, 220, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isRunning && !document.hidden && isIntersecting) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // IntersectionObserver to pause rendering when canvas is scrolled out of viewport
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && canvas) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isIntersecting = entry ? entry.isIntersecting : true;
          if (isIntersecting && !document.hidden && isRunning && !animationFrameId) {
            lastRenderTime = performance.now();
            animationFrameId = requestAnimationFrame(render);
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(canvas);
    }

    // Tab Visibility Handler to pause animation when tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }
      } else {
        if (isRunning && isIntersecting && !animationFrameId) {
          lastRenderTime = performance.now();
          animationFrameId = requestAnimationFrame(render);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!document.hidden && isIntersecting) {
      lastRenderTime = performance.now();
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      window.removeEventListener('resize', updateDimensions);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer) {
        observer.disconnect();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };
  }, [isOpen, isGoLiveMode, activeBroadcast]);

  if (!isOpen) return null;

  const isHost =
    Boolean(
      currentUser &&
      activeBroadcast &&
      (activeBroadcast.hostId === currentUser.id ||
        (activeBroadcast.hostName &&
          currentUser.displayName &&
          activeBroadcast.hostName.toLowerCase().includes(currentUser.displayName.toLowerCase())))
    );

  const handleStartBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', `Please sign in to start a ${TERMS.BROADCAST}.`);
      }
      return;
    }

    const titleToUse = streamTitle.trim() || 'Live Star Stream 📡✨';
    const created = createBroadcast({
      hostId: currentUser.id,
      hostName: currentUser.displayName || 'Explorer 🧭',
      hostAvatar:
        currentUser.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      title: titleToUse,
      privacy: streamPrivacy,
    });

    setActiveBroadcast(created);
    setIsGoLiveMode(false);
    setStreamTitle('');
  };

  const handleEndStream = () => {
    if (activeBroadcast) {
      endBroadcast(activeBroadcast.id);
      setActiveBroadcast((prev) => (prev ? { ...prev, isLive: false } : null));
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeBroadcast) return;

    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to send signals in the live chat.');
      }
      return;
    }

    addBroadcastComment(activeBroadcast.id, {
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar:
        currentUser.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      text: commentInput.trim(),
    });

    setCommentInput('');
  };

  const triggerReaction = (icon: string) => {
    const id = `react-${Date.now()}-${Math.random()}`;
    const x = Math.random() * 60 + 20; // 20% to 80% width
    setFloatingReactions((prev) => [...prev, { id, icon, x }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div
        id="cosmic-broadcast-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      >
        <motion.div
          id="cosmic-broadcast-modal-container"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-950/95 border border-amber-400/30 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-bold shadow-xs">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    {TERMS.BROADCAST}
                  </h2>
                  {activeBroadcast?.isLive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]">
                      ● LIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {TERMS.LIVE_STREAM} • Real-time interstellar transmission
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isGoLiveMode && currentUser && !currentUser.isGuest && (
                <button
                  type="button"
                  id="btn-switch-to-go-live"
                  onClick={() => {
                    setIsGoLiveMode(true);
                    setActiveBroadcast(null);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 hover:brightness-110 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>{TERMS.GO_LIVE}</span>
                </button>
              )}

              <button
                type="button"
                id="btn-close-broadcast-modal"
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          {isGoLiveMode ? (
            /* ================= GO LIVE SETUP MODE ================= */
            <div className="p-5 sm:p-7 overflow-y-auto max-h-[75vh] space-y-6">
              <div className="text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 mx-auto mb-3 shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                    <Radio className="w-8 h-8 text-amber-300 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-white tracking-wide">
                  Prepare Your {TERMS.BROADCAST} 📡✨
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Transmit live video signals, star observations, or ambient audio to all {TERMS.FOLLOWERS} across the universe.
                </p>
              </div>

              {/* Stream Preview Canvas */}
              <div className="relative aspect-video w-full max-w-xl mx-auto rounded-2xl overflow-hidden border border-white/15 bg-black shadow-lg">
                <canvas ref={videoCanvasRef} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-amber-300 border border-amber-400/30">
                    Preview Mode 🔭
                  </span>
                  <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-black/60 backdrop-blur-md text-slate-300 flex items-center gap-1">
                    {streamPrivacy === 'PUBLIC' ? <Globe className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                    <span>{streamPrivacy === 'PUBLIC' ? 'Open Sky' : 'Constellation Mates Only'}</span>
                  </span>
                </div>

                {/* Video / Mic Toggle buttons */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      isCameraOn ? 'bg-white/15 text-white' : 'bg-red-500/80 text-white'
                    }`}
                    title={isCameraOn ? 'Camera Enabled' : 'Camera Disabled'}
                  >
                    {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      isMicOn ? 'bg-white/15 text-white' : 'bg-red-500/80 text-white'
                    }`}
                    title={isMicOn ? 'Microphone Enabled' : 'Microphone Disabled'}
                  >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Form Settings */}
              <form onSubmit={handleStartBroadcast} className="max-w-xl mx-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Transmission Title 📡
                  </label>
                  <input
                    type="text"
                    id="input-broadcast-title"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="e.g., Deep Space Stargazing & Live Telescope Feed 🔭✨"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 focus:border-amber-400 focus:outline-hidden text-sm text-white placeholder-slate-500 transition-colors"
                  />
                  
                  {/* Preset quick title chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESET_TITLES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setStreamTitle(preset)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-amber-400/20 text-slate-300 hover:text-amber-200 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer text-left truncate max-w-full"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cosmic Reach 🌌
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="btn-privacy-public"
                      onClick={() => setStreamPrivacy('PUBLIC')}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                        streamPrivacy === 'PUBLIC'
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold">PUBLIC</div>
                        <div className="text-[10px] text-slate-400 font-normal">All Explorers in Universe</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="btn-privacy-friends"
                      onClick={() => setStreamPrivacy('FRIENDS_ONLY')}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                        streamPrivacy === 'FRIENDS_ONLY'
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">FRIENDS_ONLY</div>
                        <div className="text-[10px] text-slate-400 font-normal">{TERMS.FRIEND}s & Orbits Only</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Start Broadcast Button */}
                <button
                  type="submit"
                  id="btn-submit-go-live"
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_35px_rgba(245,158,11,0.7)] transition-all cursor-pointer active:scale-98"
                >
                  <Radio className="w-4 h-4 text-slate-950" />
                  <span>Transmit Live to the Cosmos 🌌📡</span>
                </button>
              </form>
            </div>
          ) : (
            /* ================= LIVE VIEWER & STREAM ROOM ================= */
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[480px]">
              {/* Left Column: Live Screen & Visualizer */}
              <div className="relative flex-1 bg-black flex flex-col justify-between overflow-hidden min-h-[280px]">
                <canvas ref={videoCanvasRef} className="absolute inset-0 w-full h-full object-cover" />

                {/* Top Overlay Controls */}
                <div className="relative z-10 p-4 flex items-start justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
                  {/* Host Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={
                          activeBroadcast?.hostAvatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                        }
                        alt={activeBroadcast?.hostName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md">
                          {activeBroadcast?.hostName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-slate-200 backdrop-blur-xs font-mono">
                          {activeBroadcast?.privacy}
                        </span>
                      </div>
                      <h3 className="text-xs text-amber-200 font-medium line-clamp-1 max-w-xs drop-shadow-sm">
                        {activeBroadcast?.title}
                      </h3>
                    </div>
                  </div>

                  {/* Viewer Count Badge */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 text-white font-bold text-xs shadow-md animate-pulse">
                      <span>● LIVE</span>
                      <Users className="w-3.5 h-3.5 ml-1" />
                      <span>{activeBroadcast?.viewerCount || 1}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
                      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  </div>
                </div>

                {/* Floating Reaction Emojis Animation */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  {floatingReactions.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 1, y: '80%', x: `${r.x}%`, scale: 0.8 }}
                      animate={{ opacity: 0, y: '10%', scale: 1.5 }}
                      transition={{ duration: 1.8, ease: 'easeOut' }}
                      className="absolute text-2xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"
                    >
                      {r.icon}
                    </motion.div>
                  ))}
                </div>

                {/* Bottom Overlay Reactions & Host Actions */}
                <div className="relative z-10 p-4 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  {/* Reaction Buttons */}
                  <div className="flex items-center gap-1.5">
                    {['✨', '🌟', '💫', '🔥', '🪐', '❤️'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => triggerReaction(emoji)}
                        className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-amber-400/30 text-lg hover:scale-125 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
                        title={`Send ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Host End Stream button if host */}
                  {isHost && activeBroadcast?.isLive && (
                    <button
                      type="button"
                      id="btn-end-broadcast"
                      onClick={handleEndStream}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>End {TERMS.BROADCAST}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Live Chat & Comments Feed */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/90 flex flex-col h-[280px] md:h-auto">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold text-slate-200">
                      Live {TERMS.CHAT}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {activeBroadcast?.comments.length || 0} signals
                  </span>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                  {(!activeBroadcast?.comments || activeBroadcast.comments.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                      <Radio className="w-6 h-6 text-slate-600 mb-1" />
                      <p>Signal feed open. Be the first to transmit an Echo!</p>
                    </div>
                  ) : (
                    activeBroadcast.comments.map((com) => (
                      <div
                        key={com.id}
                        className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-colors"
                      >
                        <img
                          src={com.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt={com.senderName}
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-white/20"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-amber-300 truncate text-[11px]">
                              {com.senderName}
                            </span>
                            <span className="text-[9px] text-slate-500 shrink-0">
                              {new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-200 text-xs mt-0.5 leading-snug break-words">
                            {com.text}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Chat Input Box */}
                <form
                  onSubmit={handleSendComment}
                  className="p-2.5 border-t border-white/10 bg-slate-950 flex items-center gap-2"
                >
                  <input
                    type="text"
                    id="input-broadcast-comment"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={`${TERMS.SEND_MESSAGE}... 📡`}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 focus:border-amber-400 focus:outline-hidden text-xs text-white placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    id="btn-send-broadcast-comment"
                    disabled={!commentInput.trim()}
                    className="p-2 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
                    title={TERMS.SEND_MESSAGE}
                  >
                    <Send className="w-3.5 h-3.5 text-slate-950" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
