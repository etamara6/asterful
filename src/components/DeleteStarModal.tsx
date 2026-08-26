import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X, Sparkles } from 'lucide-react';

interface DeleteStarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  starTitle: string;
  clusterName?: string;
  isDeleting?: boolean;
}

export const DeleteStarModal: React.FC<DeleteStarModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  starTitle,
  clusterName,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-md bg-white dark:bg-[#0c1833] border border-slate-200 dark:border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden p-6 z-10"
        >
          {/* Subtle cosmic background glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Header */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Extinguish Star</span>
                <span className="text-sm">🌑</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cosmic dust return confirmation
              </p>
            </div>
          </div>

          {/* Star Target Preview Box */}
          <div className="p-3.5 mb-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 mb-1">
              {clusterName && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  {clusterName}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
              "{starTitle}"
            </p>
          </div>

          {/* Confirmation Description */}
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            Are you sure you want to return this star to the cosmic dust? This will permanently remove its light from the cosmos along with its resonances and glowbacks.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              id="btn-cancel-delete-star"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-confirm-delete-star"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md border border-rose-400/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Extinguishing...' : 'Extinguish Star 🗑️'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
