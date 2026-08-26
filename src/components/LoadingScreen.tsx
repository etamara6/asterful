import React from 'react';
import { motion } from 'motion/react';
import logoImage from '../assets/images/logo.jpg';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Mapping the Universe... 🌌',
}) => {
  return (
    <div
      id="asterful-loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b19] text-white p-4 select-none"
    >
      {/* Ambient background glow */}
      <div className="absolute w-96 h-96 rounded-full bg-purple-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute w-80 h-80 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />

      {/* Centered Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative flex flex-col items-center gap-6 z-10"
      >
        <img
          src={logoImage}
          alt="Asterful Logo"
          className="w-20 h-20 rounded-full object-cover border border-purple-500/30 overflow-hidden"
        />

        {/* System Loading Message */}
        <div className="text-center space-y-2">
          <p className="text-sm sm:text-base font-medium tracking-wide text-purple-200/90 animate-pulse">
            {message}
          </p>
          <div className="flex justify-center items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" style={{ animationDuration: '1.4s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" style={{ animationDuration: '1.4s', animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" style={{ animationDuration: '1.4s', animationDelay: '0.4s' }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
