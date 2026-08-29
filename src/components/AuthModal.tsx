import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  AtSign,
  Sparkles,
  Eye,
  EyeOff,
  ArrowRight,
  Orbit,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  Calendar,
  ShieldCheck,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { User } from '../types';
import { DEFAULT_COSMIC_AVATAR } from '../utils/colorPalette';
import { getAllRegisteredUsers, isDisplayNameTaken, isEmailTaken, isUsernameTaken, generateCleanHandle, registerUser, registerUserAsync, checkUserUniquenessInCloud, validateUserCredentials, validateUserCredentialsAsync, findUserByEmail, findUserByIdentifier, updateUserPassword } from '../utils/userRegistry';
import { TERMS } from '../constants/terminology';
import logoImage from '../assets/images/logo.jpg';

export type AuthMode = 'signin' | 'signup' | 'forgot_password';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess: (user: User) => void;
  bannerMessage?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess,
  bannerMessage,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [age, setAge] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [handleError, setHandleError] = useState('');
  const [hasAuthError, setHasAuthError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password Reset state (2-Step Flow)
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setPasswordError('');
      setDisplayNameError('');
      setHandleError('');
      setHasAuthError(false);
      setIsLoading(false);
      setAvatarDataUrl(null);
      setAge('');
      setResetSuccessMsg('');
      setResetErrorMsg('');
      if (email.trim()) {
        setResetEmail(email.trim());
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Profile photo must be smaller than 5MB.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarDataUrl(result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try another.');
    };
    reader.readAsDataURL(file);
  };

  const switchMode = (newMode: AuthMode) => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setErrorMsg('');
    setPasswordError('');
    setDisplayNameError('');
    setHandleError('');
    setHasAuthError(false);
    setResetErrorMsg('');
    setResetSuccessMsg('');
    if (newMode === 'forgot_password') {
      setResetStep(1);
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      if (email.trim()) {
        setResetEmail(email.trim());
      }
    } else if (newMode === 'signin' && resetEmail.trim()) {
      setEmail(resetEmail.trim());
    }
    setMode(newMode);
  };

  // Quick helper to generate avatar or colors
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setPasswordError('');
    setDisplayNameError('');
    setHasAuthError(false);

    if (!email.trim()) {
      setErrorMsg('Please enter your email or username.');
      setHasAuthError(true);
      return;
    }

    if (!password.trim()) {
      setPasswordError('Please enter your password.');
      setHasAuthError(true);
      return;
    }

    setIsLoading(true);
    const validation = await validateUserCredentialsAsync(email, password);
    if (!validation.success || !validation.user) {
      const errorType = validation.error || 'NO_ACCOUNT';
      setIsLoading(false);
      setHasAuthError(true);
      if (errorType === 'WRONG_PASSWORD') {
        setPasswordError('Incorrect password.');
      } else {
        setErrorMsg('No account found on this domain. Would you like to create one?');
      }
      return;
    }

    const validUser = validation.user;
    setIsLoading(false);
    setHasAuthError(false);
    setErrorMsg('');
    setPasswordError('');
    try {
      localStorage.setItem('asterful_auth_user_v2', JSON.stringify(validUser));
      localStorage.setItem('constellation_auth_user_v1', JSON.stringify(validUser));
    } catch {
      // ignore
    }
    onSuccess(validUser);
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setPasswordError('');
    setDisplayNameError('');
    setHandleError('');
    setHasAuthError(false);

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      setHasAuthError(true);
      return;
    }

    if (!password.trim()) {
      setPasswordError('Please choose a password.');
      setHasAuthError(true);
      return;
    }

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setErrorMsg('Please enter your Display Name.');
      setDisplayNameError('Please enter your Display Name.');
      return;
    }

    const rawAge = age.trim();
    if (!rawAge) {
      setErrorMsg('Please enter your age.');
      return;
    }
    const parsedAge = parseInt(rawAge, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 125) {
      setErrorMsg('Please enter a valid age (1 - 120).');
      return;
    }
    const isOver18 = parsedAge >= 18;

    // Custom / Optional Username Validation
    let cleanHandle = '';
    const rawHandle = handle.trim();
    if (rawHandle) {
      cleanHandle = rawHandle.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      if (!cleanHandle) {
        const err = 'Please enter a valid cosmic username (alphanumeric).';
        setHandleError(err);
        setErrorMsg(err);
        return;
      }
    } else {
      cleanHandle = generateCleanHandle(email.trim());
    }

    setIsLoading(true);

    // 1. Perform database query check to verify unique email, username/handle, and display name
    const uniquenessCheck = await checkUserUniquenessInCloud({
      email: email.trim(),
      displayName: trimmedDisplayName,
      handle: cleanHandle,
      username: cleanHandle,
    });

    if (!uniquenessCheck.isUnique) {
      setIsLoading(false);
      setHasAuthError(true);
      const errMsg = uniquenessCheck.error || 'An account with this email or username already exists.';
      if (uniquenessCheck.field === 'email') {
        setErrorMsg(errMsg);
      } else if (uniquenessCheck.field === 'displayName') {
        setDisplayNameError(errMsg);
        setErrorMsg(errMsg);
      } else if (uniquenessCheck.field === 'handle' || uniquenessCheck.field === 'username') {
        setHandleError(errMsg);
        setErrorMsg(errMsg);
      } else {
        setErrorMsg(errMsg);
      }
      return;
    }

    const authenticatedUser: User = {
      id: `user-${cleanHandle}-${Date.now()}`,
      email: email.trim(),
      displayName: trimmedDisplayName,
      username: cleanHandle,
      handle: cleanHandle,
      password: password.trim(),
      avatarUrl: avatarDataUrl || DEFAULT_COSMIC_AVATAR,
      joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      glowColor: '#FFD700',
      age: parsedAge,
      isOver18,
    };

    // 2. Persist newly registered user to registry and Firestore
    const registerRes = await registerUserAsync(authenticatedUser);
    if (!registerRes.success || !registerRes.user) {
      setIsLoading(false);
      setHasAuthError(true);
      const errMsg = registerRes.error || 'An account with these credentials already exists in the database.';
      setErrorMsg(errMsg);
      return;
    }

    // Persist active session immediately
    try {
      localStorage.setItem('asterful_auth_user_v2', JSON.stringify(registerRes.user));
      localStorage.setItem('constellation_auth_user_v1', JSON.stringify(registerRes.user));
    } catch {
      // ignore
    }

    setIsLoading(false);
    onSuccess(registerRes.user);
    onClose();
  };

  const handlePasswordResetStep1 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');

    const targetEmail = resetEmail.trim();
    if (!targetEmail) {
      setResetErrorMsg('Please enter your email address.');
      return;
    }

    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      setResetErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsResetting(true);

    setTimeout(() => {
      setIsResetting(false);
      const existingUser = findUserByEmail(targetEmail) || findUserByIdentifier(targetEmail);
      if (!existingUser) {
        setResetErrorMsg('No account found with this email');
        return;
      }

      setResetStep(2);
      setResetErrorMsg('');
    }, 300);
  };

  const handlePasswordResetStep2 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');

    const trimmedNewPass = newPassword.trim();
    const trimmedConfirmPass = confirmNewPassword.trim();

    if (!trimmedNewPass) {
      setResetErrorMsg('Please enter your new password.');
      return;
    }

    if (trimmedNewPass.length < 4) {
      setResetErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (trimmedNewPass !== trimmedConfirmPass) {
      setResetErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setIsResetting(true);

    setTimeout(() => {
      setIsResetting(false);
      const result = updateUserPassword(resetEmail, trimmedNewPass);
      if (!result.success) {
        setResetErrorMsg(result.error || 'Failed to update password. Please try again.');
        return;
      }

      setResetSuccessMsg('Password updated successfully! You can now sign in with your new password.');
      setEmail(resetEmail.trim());

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        switchMode('signin');
      }, 2500);
    }, 350);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    if (mode === 'signin') {
      handleSignIn(e);
    } else if (mode === 'signup') {
      handleRegister(e);
    } else if (resetStep === 1) {
      handlePasswordResetStep1(e);
    } else {
      handlePasswordResetStep2(e);
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      const googleUser: User = {
        id: `google-${Date.now()}`,
        email: 'explorer@constellation.space',
        displayName: 'Cosmic Explorer',
        handle: 'cosmic_explorer',
        avatarUrl: DEFAULT_COSMIC_AVATAR,
        joinedAt: 'August 2026',
        glowColor: '#FFE57F',
        age: 24,
        isOver18: true,
      };
      try {
        localStorage.setItem('asterful_auth_user_v2', JSON.stringify(googleUser));
        localStorage.setItem('constellation_auth_user_v1', JSON.stringify(googleUser));
      } catch {
        // ignore
      }
      onSuccess(googleUser);
      onClose();
    }, 400);
  };

  const handleQuickDemoUser = (name: string, userHandle: string, emailAddr: string, color: string) => {
    const demoUser: User = {
      id: `demo-${userHandle}`,
      email: emailAddr,
      displayName: name,
      handle: userHandle,
      avatarUrl: DEFAULT_COSMIC_AVATAR,
      joinedAt: 'August 2026',
      glowColor: color,
      age: 26,
      isOver18: true,
    };
    try {
      localStorage.setItem('asterful_auth_user_v2', JSON.stringify(demoUser));
      localStorage.setItem('constellation_auth_user_v1', JSON.stringify(demoUser));
    } catch {
      // ignore
    }
    onSuccess(demoUser);
    onClose();
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar bg-white/95 dark:bg-[#040a1c]/95 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-amber-300/25 shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(255,215,0,0.15)] my-auto text-slate-900 dark:text-slate-100"
      >
        {/* Subtle background cosmic glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-indigo-600/10 dark:bg-indigo-600/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/10 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <img
              src={logoImage}
              alt="Asterful Logo"
              className="w-16 h-16 rounded-full object-cover border border-purple-500/30 overflow-hidden"
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {mode === 'signin'
              ? TERMS.LOGIN
              : mode === 'signup'
              ? TERMS.SIGNUP
              : TERMS.RESET_PASSWORD}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {mode === 'signin'
              ? 'Sign in to publish new stars, remix ideas, and connect thoughts.'
              : mode === 'signup'
              ? 'Create an account to explore, map, and anchor cosmic connections.'
              : 'Enter your registered email address to receive a cosmic reset link.'}
          </p>
        </div>

        {/* Action Interception Banner */}
        {bannerMessage && mode !== 'forgot_password' && (
          <div
            id="auth-interception-banner"
            className="mb-5 p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2"
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 animate-pulse" />
            <span className="font-medium">{bannerMessage}</span>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        {mode !== 'forgot_password' ? (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-amber-300/15 mb-5">
            <button
              type="button"
              id="tab-auth-signin"
              onClick={() => switchMode('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-amber-400/20 text-amber-900 dark:text-amber-200 shadow-xs border border-amber-400/40 dark:border-amber-300/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {TERMS.LOGIN}
            </button>
            <button
              type="button"
              id="tab-auth-signup"
              onClick={() => switchMode('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-amber-400/20 text-amber-900 dark:text-amber-200 shadow-xs border border-amber-400/40 dark:border-amber-300/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {TERMS.SIGNUP}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 mb-4 bg-amber-500/10 rounded-xl border border-amber-400/20">
            <span className="text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
              <span>{TERMS.RESET_PASSWORD}</span>
            </span>
            <button
              type="button"
              id="btn-auth-back-to-signin-tab"
              onClick={() => switchMode('signin')}
              className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2 flex items-center gap-1 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to {TERMS.LOGIN}</span>
            </button>
          </div>
        )}

        {mode === 'forgot_password' ? (
          /* 2-Step Forgot Password View */
          <div className="space-y-4">
            {/* Reset Success Message */}
            <AnimatePresence>
              {resetSuccessMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  id="modal-reset-success-banner"
                  className="p-3.5 rounded-xl bg-emerald-50 dark:bg-gradient-to-r dark:from-emerald-950/90 dark:via-teal-950/80 dark:to-emerald-950/90 border border-emerald-300 dark:border-emerald-400/50 text-emerald-800 dark:text-emerald-200 text-xs shadow-xs space-y-2"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-xs leading-snug">{resetSuccessMsg}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-1">
                        Taking you back to Sign In...
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reset Error Message */}
            <AnimatePresence>
              {resetErrorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  id="modal-reset-error-banner"
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/75 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="leading-snug">{resetErrorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {resetStep === 1 ? (
              /* Step 1: Identify Account */
              <form onSubmit={handlePasswordResetStep1} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="modal-reset-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                      <span>Registered Email Address</span>
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-semibold">Step 1 of 2</span>
                  </div>
                  <input
                    id="modal-reset-email"
                    type="email"
                    required
                    placeholder="e.g. navigator@cosmos.space"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      if (resetErrorMsg) setResetErrorMsg('');
                    }}
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder-slate-400 transition-all shadow-inner"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    Enter your account email to proceed with setting a new password.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    id="btn-modal-verify-account"
                    disabled={isResetting || Boolean(resetSuccessMsg)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-200 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    {isResetting ? (
                      <Orbit className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>CONTINUE</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="btn-modal-back-to-signin-step1"
                    onClick={() => switchMode('signin')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-700 dark:text-amber-200 hover:text-slate-900 dark:hover:text-amber-100 bg-slate-100 dark:bg-[#07132c]/90 hover:bg-slate-200 dark:hover:bg-[#0c1e45] border border-slate-300 dark:border-amber-300/30 active:scale-[0.99] transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>BACK TO SIGN IN</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Set New Password */
              <form onSubmit={handlePasswordResetStep2} className="space-y-3.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/20 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
                    <div className="truncate text-left">
                      <span className="text-[10px] text-amber-700 dark:text-amber-300/90 block uppercase font-semibold">Account Verified</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 text-xs truncate block">{resetEmail}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(1);
                      setResetErrorMsg('');
                    }}
                    className="text-[11px] text-amber-600 dark:text-amber-300 hover:underline shrink-0 cursor-pointer ml-2 font-medium"
                  >
                    Change
                  </button>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="modal-new-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                    <span>New Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="modal-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (resetErrorMsg) setResetErrorMsg('');
                      }}
                      className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder-slate-400 transition-all shadow-inner pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 cursor-pointer p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="modal-confirm-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                    <span>Confirm New Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="modal-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        if (resetErrorMsg) setResetErrorMsg('');
                      }}
                      className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder-slate-400 transition-all shadow-inner pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    id="btn-modal-update-new-password"
                    disabled={isResetting || Boolean(resetSuccessMsg)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-200 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    {isResetting ? (
                      <Orbit className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>UPDATE PASSWORD</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="btn-modal-back-to-signin-step2"
                    onClick={() => switchMode('signin')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-700 dark:text-amber-200 hover:text-slate-900 dark:hover:text-amber-100 bg-slate-100 dark:bg-[#07132c]/90 hover:bg-slate-200 dark:hover:bg-[#0c1e45] border border-slate-300 dark:border-amber-300/30 active:scale-[0.99] transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>BACK TO SIGN IN</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Google Sign In Button */}
            <button
              type="button"
              id="btn-google-auth"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-100 text-sm font-medium border border-slate-200 dark:border-white/15 transition-all shadow-xs active:scale-[0.99] cursor-pointer mb-4 group"
            >
              {/* Google Color G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="group-hover:text-slate-900 dark:group-hover:text-white">
                {mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
              </span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-white/10 w-full" />
              <span className="bg-white dark:bg-[#060e22] px-3 text-[11px] text-slate-400 uppercase tracking-widest shrink-0">
                or continue with email
              </span>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="flex flex-col gap-1.5 p-3 mb-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
                {errorMsg.includes('No account found on this domain') && (
                  <button
                    type="button"
                    id="btn-auth-switch-to-signup"
                    onClick={() => {
                      setErrorMsg('');
                      setPasswordError('');
                      setDisplayNameError('');
                      setHandleError('');
                      setHasAuthError(false);
                      setMode('signup');
                    }}
                    className="mt-1 w-full sm:w-auto self-start bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Switch to Sign Up 🚀</span>
                  </button>
                )}
                {errorMsg.includes('already have an account') && (
                  <button
                    type="button"
                    id="btn-auth-switch-to-signin"
                    onClick={() => switchMode('signin')}
                    className="ml-6 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer w-fit transition-colors"
                  >
                    <span>Click here to Sign In</span>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {mode === 'signup' && (
                <>
                  {/* Optional Profile Picture Upload */}
                  <div className="p-3 rounded-2xl bg-amber-500/[0.05] border border-amber-300/20 mb-3">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Cosmic Avatar (Optional)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Default: Shooting Star</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/60 bg-slate-100 dark:bg-[#040a1c] shrink-0 shadow-xs">
                        <img
                          src={avatarDataUrl || DEFAULT_COSMIC_AVATAR}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <input
                          id="auth-input-avatar"
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            id="btn-upload-avatar"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-900 dark:text-amber-200 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Upload className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                            <span>{avatarDataUrl ? 'Change Photo' : 'Upload Photo'}</span>
                          </button>
                          {avatarDataUrl && (
                            <button
                              type="button"
                              id="btn-reset-avatar"
                              onClick={() => {
                                setAvatarDataUrl(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                              title="Reset to default shooting star"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {avatarDataUrl ? 'Custom photo loaded via base64' : 'Using default celestial shooting star'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Display Name</label>
                      <span className="text-[10px] text-slate-400">Unique cosmic identity</span>
                    </div>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-input-display-name"
                        type="text"
                        required
                        placeholder="e.g. Nova Vance"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (displayNameError) {
                            setDisplayNameError('');
                            if (errorMsg === 'This Display Name is already taken. Please choose another.' || errorMsg === 'This display name is already taken. Please choose a unique cosmic identity.') {
                              setErrorMsg('');
                            }
                          }
                        }}
                        className={`w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none transition-all placeholder-slate-400 ${
                          displayNameError
                            ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                            : 'focus:ring-2 focus:ring-amber-400/40'
                        }`}
                      />
                    </div>
                    {displayNameError && (
                      <p id="auth-display-name-error" className="mt-1.5 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-1.5 font-medium animate-in fade-in duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{displayNameError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="auth-input-handle" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Cosmic Handle / Username <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300/80">Unique @handle</span>
                    </div>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-input-handle"
                        type="text"
                        placeholder="stargazer_nova"
                        value={handle}
                        onChange={(e) => {
                          setHandle(e.target.value);
                          if (handleError) setHandleError('');
                          if (errorMsg.includes('already taken') || errorMsg.includes('valid cosmic username')) {
                            setErrorMsg('');
                          }
                        }}
                        className={`w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none transition-all placeholder-slate-400 ${
                          handleError
                            ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                            : 'focus:ring-2 focus:ring-amber-400/40'
                        }`}
                      />
                    </div>
                    {handleError ? (
                      <p id="auth-handle-error" className="mt-1.5 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-1.5 font-medium animate-in fade-in duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{handleError}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        Leave blank to auto-generate from your email prefix.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Age Verification
                      </label>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300/80 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Private & Confidential</span>
                      </span>
                    </div>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-input-age"
                        type="number"
                        min="1"
                        max="125"
                        required
                        placeholder="Your Age (e.g. 21)"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder-slate-400"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Used solely for safety and 18+ content filtering. Your age is never shown on your public profile or shared with other stargazers.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-input-email"
                    type="text"
                    required
                    placeholder="navigator@cosmos.io"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                      if (hasAuthError) setHasAuthError(false);
                    }}
                    className={`w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none transition-all placeholder-slate-400 ${
                      hasAuthError && !passwordError
                        ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                        : 'focus:ring-2 focus:ring-amber-400/40'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-input-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                      if (errorMsg) setErrorMsg('');
                      if (hasAuthError) setHasAuthError(false);
                    }}
                    className={`w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white pl-9 pr-10 py-2 rounded-xl focus:outline-none transition-all placeholder-slate-400 ${
                      passwordError
                        ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                        : 'focus:ring-2 focus:ring-amber-400/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-amber-600 dark:text-amber-300" />}
                  </button>
                </div>

                {/* Inline Incorrect Password Error & Clickable Forgot Password Link */}
                {passwordError ? (
                  <div
                    id="auth-password-error-row"
                    className="mt-2 px-0.5 flex items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-1"
                  >
                    <span className="text-rose-600 dark:text-rose-300 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{passwordError}</span>
                    </span>
                    <button
                      type="button"
                      id="btn-auth-forgot-password-inline"
                      onClick={() => switchMode('forgot_password')}
                      className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 font-medium transition-colors cursor-pointer text-xs shrink-0"
                    >
                      Forgot Password?
                    </button>
                  </div>
                ) : (
                  mode === 'signin' && (
                    <div className="mt-1.5 px-0.5 flex justify-end">
                      <button
                        type="button"
                        id="btn-auth-forgot-password-link"
                        onClick={() => switchMode('forgot_password')}
                        className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-auth-submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md border border-amber-200 active:scale-[0.99] transition-all cursor-pointer uppercase tracking-wider"
              >
                {isLoading ? (
                  <Orbit className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>{mode === 'signin' ? TERMS.LOGIN : TERMS.SIGNUP}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Buttons for Testing */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-2">Or instant sign in with a demo explorer:</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  id="btn-quick-demo-nova"
                  onClick={() => handleQuickDemoUser('Nova Vance', 'novavance', 'nova@stargazer.space', '#FFD700')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/25 transition-colors cursor-pointer"
                >
                  ✨ Nova Vance
                </button>
                <button
                  type="button"
                  id="btn-quick-demo-lyra"
                  onClick={() => handleQuickDemoUser('Lyra Thorne', 'lyrathorne', 'lyra@deepspace.art', '#FFE57F')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-900 dark:text-yellow-200 border border-yellow-400/25 transition-colors cursor-pointer"
                >
                  🌌 Lyra Thorne
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
