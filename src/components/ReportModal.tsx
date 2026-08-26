import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flag, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Send,
  Lock,
  Sparkles
} from 'lucide-react';
import { User, ReportReason } from '../types';
import { submitReport } from '../utils/safetyStorage';
import { TERMS } from '../constants/terminology';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  targetType: 'star' | 'glowback' | 'explorer';
  targetId: string;
  targetTitle?: string;
  targetSnippet?: string;
  authorId?: string;
  authorName?: string;
  authorHandle?: string;
  onReportSubmitted?: (message: string) => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup', bannerMessage?: string) => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; desc: string; icon: string }[] = [
  {
    value: 'Cosmic Noise 📡 (Spam)',
    label: 'Cosmic Noise 📡 (Spam & Commercial)',
    desc: 'Unsolicited advertisements, repetitive spam links, automated bots, or excessive noise.',
    icon: '📡',
  },
  {
    value: 'Harassment & Hostility',
    label: 'Harassment & Hostility',
    desc: 'Bullying, targeted insults, hate speech, threats, or disruptive toxic behavior.',
    icon: '⚔️',
  },
  {
    value: 'Inappropriate Celestial Content',
    label: 'Inappropriate Celestial Content',
    desc: 'Unmarked explicit/graphic visuals, illicit content, or violations of community guidelines.',
    icon: '⚠️',
  },
  {
    value: 'Cosmic Misinformation',
    label: 'Cosmic Misinformation',
    desc: 'Harmfully deceptive claims, impersonation, or falsified stellar data.',
    icon: '🔭',
  },
  {
    value: 'Other Cosmic Concern',
    label: 'Other Cosmic Concern',
    desc: 'Any other safety or moderation issue requiring inspection by Orbit Keepers 🛡️.',
    icon: '🪐',
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetType,
  targetId,
  targetTitle,
  targetSnippet,
  authorId,
  authorName,
  authorHandle,
  onReportSubmitted,
  onOpenAuthModal,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('Cosmic Noise 📡 (Spam)');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.isGuest) {
      if (onOpenAuthModal) {
        onOpenAuthModal('signin', 'Sign in to flag a star for Orbit Keeper moderation.');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      submitReport({
        targetType,
        targetId,
        targetTitle,
        targetSnippet,
        authorId,
        authorName,
        authorHandle,
        reporterId: currentUser.id,
        reporterName: currentUser.displayName || currentUser.username || 'Explorer',
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      setIsSubmitted(true);
      if (onReportSubmitted) {
        onReportSubmitted(
          `Flagged for moderation by Orbit Keepers 🛡️: Report recorded for "${targetTitle || 'Item'}"`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setDetails('');
    setSelectedReason('Cosmic Noise 📡 (Spam)');
    onClose();
  };

  const targetTypeName = 
    targetType === 'star' ? 'Star ⭐' : targetType === 'glowback' ? 'Glowback 💫' : 'Explorer 🪐';

  return (
    <div
      id="report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={handleResetAndClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        id="report-modal-container"
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Flag a {targetTypeName}</span>
                <span className="text-red-500 text-xs">🚩</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transmitted directly to Asterful Orbit Keepers 🛡️
              </p>
            </div>
          </div>

          <button
            id="btn-close-report-modal"
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {isSubmitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Cosmic Flag Registered
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Thank you for guarding the celestial harmony of Asterful. Orbit Keepers will inspect this transmission shortly.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer shadow-sm"
                >
                  Return to Orbit 🪐
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Preview Box */}
              {(targetTitle || targetSnippet || authorName) && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>Target Item</span>
                  </div>
                  {targetTitle && (
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      "{targetTitle}"
                    </div>
                  )}
                  {targetSnippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                      "{targetSnippet}"
                    </p>
                  )}
                  {authorName && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Author: <span className="font-semibold text-slate-700 dark:text-slate-200">{authorName}</span> {authorHandle && <span className="font-mono">{authorHandle}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Reason Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Select Reason for Flagging:
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((r) => {
                    const isSelected = selectedReason === r.value;
                    return (
                      <label
                        key={r.value}
                        className={`flex items-start gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-500/10 border-red-500/40 dark:border-red-400/40 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={r.value}
                          checked={isSelected}
                          onChange={() => setSelectedReason(r.value)}
                          className="mt-0.5 text-red-500 focus:ring-red-400"
                        />
                        <div className="text-left">
                          <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <span>{r.icon}</span>
                            <span>{r.label}</span>
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {r.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Cosmic Details & Context (Optional):
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any additional context to assist Orbit Keepers..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs sm:text-sm p-3 rounded-xl focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 placeholder-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Transmit Report 🚩</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
