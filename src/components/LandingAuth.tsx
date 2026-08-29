import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Eye, EyeOff, Camera, Trash2, AlertCircle, Calendar, ShieldCheck, Mail, ArrowLeft, Sparkles, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { User } from '../types';
import { DEFAULT_COSMIC_AVATAR } from '../utils/colorPalette';
import { getAllRegisteredUsers, isDisplayNameTaken, isEmailTaken, isUsernameTaken, generateCleanHandle, registerUser, validateUserCredentials, validateUserCredentialsAsync, findUserByEmail, findUserByIdentifier, updateUserPassword } from '../utils/userRegistry';
import bgImage from '../assets/images/constellation.jpg';
import logoImage from '../assets/images/logo.jpg';

interface LandingAuthProps {
  onAuthSuccess: (user: User) => void;
}

export type LandingMode = 'signin' | 'signup' | 'forgot_password';

export const LandingAuth: React.FC<LandingAuthProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<LandingMode>('signin');
  const [emailOrUsername, setEmailOrUsername] = useState('');
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

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setPasswordError('');
    setDisplayNameError('');
    setHasAuthError(false);

    const identifier = emailOrUsername.trim();
    if (!identifier) {
      setErrorMsg('Please enter your Email or Username.');
      setHasAuthError(true);
      return;
    }
    if (!password.trim()) {
      setPasswordError('Please enter your password.');
      setHasAuthError(true);
      return;
    }

    setIsLoading(true);
    const validation = await validateUserCredentialsAsync(identifier, password);
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
    onAuthSuccess(validUser);
  };

  const handleRegister = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setPasswordError('');
    setDisplayNameError('');
    setHasAuthError(false);

    const identifier = emailOrUsername.trim();
    if (!identifier) {
      setErrorMsg('Please enter an Email or Username.');
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
      return;
    }

    const existingUsers = getAllRegisteredUsers();

    // 1. Strict Unique Email Check
    const emailToTest = identifier.includes('@') ? identifier.toLowerCase() : `${generateCleanHandle(identifier)}@asterful.space`;
    const emailExists = existingUsers.some(
      (u) => (u.email && (u.email.trim().toLowerCase() === identifier.toLowerCase() || u.email.trim().toLowerCase() === emailToTest))
    );
    if (emailExists) {
      const errorText = 'You already have an account linked to this email. Please sign in.';
      setErrorMsg(errorText);
      setHasAuthError(true);
      return;
    }

    // 2. Strict Unique Display Name Check
    const displayNameExists = existingUsers.some(
      (u) => u.displayName && u.displayName.trim().toLowerCase() === trimmedDisplayName.toLowerCase()
    );
    if (displayNameExists) {
      const errorText = 'This Display Name is already taken. Please choose another.';
      setDisplayNameError(errorText);
      setErrorMsg(errorText);
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

    // 3. Custom / Optional Username Validation
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
      if (isUsernameTaken(cleanHandle)) {
        const err = `Username @${cleanHandle} is already taken.`;
        setHandleError(err);
        setErrorMsg(err);
        return;
      }
    } else {
      cleanHandle = generateCleanHandle(identifier);
    }

    setIsLoading(true);
    setTimeout(() => {
      const user: User = {
        id: `user-${Date.now()}`,
        email: identifier.includes('@') ? identifier : `${cleanHandle}@constellation.space`,
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

      // Persist newly registered user to registry
      registerUser(user);

      // Persist session immediately to local storage
      try {
        localStorage.setItem('asterful_auth_user_v2', JSON.stringify(user));
        localStorage.setItem('constellation_auth_user_v1', JSON.stringify(user));
      } catch {
        // ignore
      }

      setIsLoading(false);
      onAuthSuccess(user);
    }, 400);
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

    // Basic email format check
    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      setResetErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsResetting(true);

    setTimeout(() => {
      setIsResetting(false);
      // Verify email existence in registry
      const existingUser = findUserByEmail(targetEmail) || findUserByIdentifier(targetEmail);
      if (!existingUser) {
        setResetErrorMsg('No account found with this email');
        return;
      }

      // Account identified - proceed to Step 2
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

      // Success feedback badge
      setResetSuccessMsg('Password updated successfully! You can now sign in with your new password.');
      setEmailOrUsername(resetEmail.trim());

      // Automatically take the user back to the main Sign In view with email pre-filled
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        switchMode('signin');
      }, 2500);
    }, 350);
  };

  const switchMode = (newMode: LandingMode) => {
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
      // Pre-fill reset email if user entered email in sign-in
      if (emailOrUsername.trim() && (emailOrUsername.includes('@') || !resetEmail)) {
        setResetEmail(emailOrUsername.trim());
      }
    } else if (newMode === 'signin' && resetEmail.trim()) {
      setEmailOrUsername(resetEmail.trim());
    }
    setMode(newMode);
  };

  const handleGuestSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      const guestUser: User = {
        id: `guest-${Date.now()}`,
        email: 'guest@constellation.space',
        displayName: 'Cosmic Guest',
        handle: 'guest_explorer',
        avatarUrl: DEFAULT_COSMIC_AVATAR,
        joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        glowColor: '#FFE57F',
        isGuest: true,
        isOver18: false,
      };
      setIsLoading(false);
      onAuthSuccess(guestUser);
    }, 300);
  };

  return (
    <div
      id="landing-auth-container"
      className="dark relative min-h-screen w-full flex flex-col items-center justify-center p-6 py-10 overflow-y-auto bg-[#0A0E1A]"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Ambient Deep Space Darkening Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020713]/85 via-[#020713]/60 to-[#020713]/90 pointer-events-none" />

      {/* Centered Glassmorphism Card with Soft Blue-Purple Glow Border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="dark relative z-10 w-full max-w-md h-auto max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0A0E1A]/95 p-6 border border-amber-500/30 shadow-2xl backdrop-blur-xl text-white text-center custom-scrollbar flex flex-col items-center"
      >
        {/* Header Section with Asterful Logo & Serif Typography */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mx-auto mb-3">
            <img
              src={logoImage}
              alt="Asterful Logo"
              className="w-16 h-16 rounded-full object-cover border border-purple-500/30 overflow-hidden"
            />
          </div>

          {/* Heading */}
          <h1
            id="landing-header-title"
            className="font-heading text-2xl sm:text-[28px] font-bold tracking-wide text-amber-300 leading-snug mb-1.5"
          >
            {mode === 'forgot_password' ? 'Reset Your Password' : mode === 'signup' ? 'Join the Universe 🌌' : 'Enter Universe 🌌'}
          </h1>

          {/* Subtitle / Tagline */}
          {mode === 'forgot_password' ? (
            <p
              id="landing-header-subtitle"
              className="text-xs sm:text-[13px] text-slate-300 font-light max-w-xs mx-auto leading-relaxed mt-1"
            >
              {resetStep === 1
                ? 'Enter your registered email address to identify your account.'
                : 'Enter and confirm your new password below.'}
            </p>
          ) : (
            <p
              id="landing-header-subtitle"
              className="font-fraunces italic text-lg sm:text-xl text-slate-200/90 tracking-wide mt-2 text-center"
            >
              You are made of stars.
            </p>
          )}
        </div>

        {/* Inner Form Card Section */}
        <div className="w-full rounded-2xl p-5 sm:p-6 text-left bg-[#07132c]/75 border border-slate-700/60 shadow-inner flex flex-col">
          {/* Inner Form Header Row */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-700/70 pb-2.5">
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-amber-200/90 font-heading">
              {mode === 'signin'
                ? 'Sign In / Register'
                : mode === 'signup'
                ? 'Create New Account'
                : 'Password Recovery'}
            </span>
            {mode === 'forgot_password' ? (
              <button
                type="button"
                id="btn-back-to-signin-top"
                onClick={() => switchMode('signin')}
                className="text-[11px] text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 underline underline-offset-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-toggle-mode"
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-[11px] text-slate-300 hover:text-amber-200 underline underline-offset-2 transition-colors cursor-pointer"
              >
                {mode === 'signin' ? 'Switch to Register' : 'Switch to Sign In'}
              </button>
            )}
          </div>

          {/* Mode: Forgot Password View */}
          {mode === 'forgot_password' ? (
            <div className="space-y-4">
              {/* Reset Success Message */}
              <AnimatePresence>
                {resetSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    id="landing-reset-success-banner"
                    className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-400/50 text-emerald-200 text-xs shadow-[0_0_20px_rgba(52,211,153,0.25)] space-y-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1">
                        <p className="font-semibold text-emerald-100 text-xs leading-snug">{resetSuccessMsg}</p>
                        <p className="text-[11px] text-emerald-300/80 mt-1">
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
                    id="landing-reset-error-banner"
                    className="p-3 rounded-xl bg-rose-950/75 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="leading-snug">{resetErrorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {resetStep === 1 ? (
                /* Step 1: Identify Account */
                <form onSubmit={handlePasswordResetStep1} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="landing-reset-email" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-300" />
                        <span>Registered Email Address</span>
                      </label>
                      <span className="text-[10px] text-amber-400/80 font-mono">Step 1 of 2</span>
                    </div>
                    <input
                      id="landing-reset-email"
                      type="email"
                      required
                      placeholder="e.g. navigator@cosmos.space"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (resetErrorMsg) setResetErrorMsg('');
                      }}
                      className="w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-400 border border-slate-700/80 focus:border-amber-400 focus:outline-none text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl transition-all shadow-inner"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Enter your account email to proceed with setting a new password.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2.5">
                    <button
                      type="submit"
                      id="btn-verify-reset-account"
                      disabled={isResetting || Boolean(resetSuccessMsg)}
                      className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {isResetting ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>CONTINUE</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="btn-back-to-signin-step1"
                      onClick={() => switchMode('signin')}
                      className="w-full bg-[#1B243B] hover:bg-[#24304e] text-amber-200 hover:text-amber-100 border border-slate-700 hover:border-slate-600 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-2"
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
                      <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                      <div className="truncate text-left">
                        <span className="text-[10px] text-amber-300/80 block uppercase font-semibold">Account Verified</span>
                        <span className="font-mono text-slate-200 text-xs truncate block">{resetEmail}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep(1);
                        setResetErrorMsg('');
                      }}
                      className="text-[11px] text-amber-300 hover:text-amber-100 underline shrink-0 cursor-pointer ml-2"
                    >
                      Change
                    </button>
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="landing-new-password" className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                      <span>New Password</span>
                    </label>
                    <div className="relative">
                      <input
                        id="landing-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (resetErrorMsg) setResetErrorMsg('');
                        }}
                        className="w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-400 border border-slate-700/80 focus:border-amber-400 focus:outline-none text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl transition-all shadow-inner pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 cursor-pointer p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="landing-confirm-password" className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                      <span>Confirm New Password</span>
                    </label>
                    <div className="relative">
                      <input
                        id="landing-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm your new password"
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          if (resetErrorMsg) setResetErrorMsg('');
                        }}
                        className="w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-400 border border-slate-700/80 focus:border-amber-400 focus:outline-none text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl transition-all shadow-inner pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 cursor-pointer p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2.5">
                    <button
                      type="submit"
                      id="btn-submit-new-password"
                      disabled={isResetting || Boolean(resetSuccessMsg)}
                      className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {isResetting ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>UPDATE PASSWORD</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="btn-back-to-signin-step2"
                      onClick={() => switchMode('signin')}
                      className="w-full bg-[#1B243B] hover:bg-[#24304e] text-amber-200 hover:text-amber-100 border border-slate-700 hover:border-slate-600 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>BACK TO SIGN IN</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Form Fields for Sign In & Register */
            <form
              onSubmit={(e) => {
                if (mode === 'signin') {
                  handleSignIn(e);
                } else {
                  handleRegister(e);
                }
              }}
              className="space-y-3.5"
            >
              {/* General Top Error Message */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-xl bg-rose-950/75 border border-rose-500/40 text-rose-200 text-xs flex flex-col gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span className="leading-snug">{errorMsg}</span>
                    </div>
                    {errorMsg.includes('No account found on this domain') && (
                      <button
                        type="button"
                        id="btn-landing-switch-to-signup"
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
                        id="btn-landing-switch-to-signin"
                        onClick={() => switchMode('signin')}
                        className="ml-3.5 text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer w-fit transition-colors"
                      >
                        <span>Click here to Sign In</span>
                        <span>&rarr;</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* In Signup mode, show extra fields */}
              {mode === 'signup' && (
                <div className="space-y-3 pt-1 border-b border-slate-700/60 pb-3">
                  {/* Optional Avatar Upload */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-amber-300/60 bg-[#040a1c] shrink-0 shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                      <img
                        src={avatarDataUrl || DEFAULT_COSMIC_AVATAR}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        id="landing-avatar-upload"
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        id="btn-landing-upload-avatar"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-300/30 text-amber-200 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Camera className="w-3 h-3 text-amber-300" />
                        <span>{avatarDataUrl ? 'Change Photo' : 'Add Photo'}</span>
                      </button>
                      {avatarDataUrl && (
                        <button
                          type="button"
                          id="btn-landing-reset-avatar"
                          onClick={() => {
                            setAvatarDataUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                          title="Reset to default shooting star"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="landing-display-name" className="block text-[11px] font-medium text-slate-300">
                        Display Name
                      </label>
                      <span className="text-[10px] text-slate-400">Unique cosmic identity</span>
                    </div>
                    <input
                      id="landing-display-name"
                      type="text"
                      placeholder="e.g. Orion Seeker"
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
                      className={`w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition-all ${
                        displayNameError
                          ? 'border border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] bg-rose-950/30 text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                          : 'border border-slate-700/80 focus:border-amber-400'
                      }`}
                    />
                    {displayNameError && (
                      <p id="landing-display-name-error" className="mt-1.5 text-[11px] text-rose-300 flex items-center gap-1.5 font-medium animate-in fade-in duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>{displayNameError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="landing-input-handle" className="block text-[11px] font-medium text-slate-300">
                        Cosmic Handle / Username <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[10px] text-amber-300/80">Unique @handle</span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs text-amber-300/70 font-mono select-none">@</span>
                      <input
                        id="landing-input-handle"
                        type="text"
                        placeholder="e.g. stargazer_nova"
                        value={handle}
                        onChange={(e) => {
                          setHandle(e.target.value);
                          if (handleError) setHandleError('');
                          if (errorMsg.includes('already taken') || errorMsg.includes('valid cosmic username')) {
                            setErrorMsg('');
                          }
                        }}
                        className={`w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-400 text-xs pl-8 pr-3.5 py-2.5 rounded-xl focus:outline-none transition-all ${
                          handleError
                            ? 'border border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] bg-rose-950/30 text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                            : 'border border-slate-700/80 focus:border-amber-400'
                        }`}
                      />
                    </div>
                    {handleError ? (
                      <p id="landing-handle-error" className="mt-1.5 text-[11px] text-rose-300 flex items-center gap-1.5 font-medium animate-in fade-in duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>{handleError}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                        Leave blank to auto-generate from your email/identifier.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="landing-age" className="block text-[11px] font-medium text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Age Verification</span>
                      </label>
                      <span className="text-[10px] text-amber-300/80 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5 text-amber-300" />
                        <span>Kept Private</span>
                      </span>
                    </div>
                    <input
                      id="landing-age"
                      type="number"
                      min="1"
                      max="125"
                      placeholder="Your Age (e.g. 21)"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-[#131B2E] border border-slate-700/80 focus:border-amber-400 text-slate-100 placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition-all"
                    />
                    <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                      Used strictly to filter 18+ sensitive content. Never shown on your profile.
                    </p>
                  </div>
                </div>
              )}

              {/* Email / Username Input */}
              <div>
                <label htmlFor="landing-email-username" className="sr-only">
                  Email/Username
                </label>
                <div className="relative flex items-center">
                  <input
                    id="landing-email-username"
                    type="text"
                    placeholder="Email/Username"
                    value={emailOrUsername}
                    onChange={(e) => {
                      setEmailOrUsername(e.target.value);
                      if (errorMsg) setErrorMsg('');
                      if (hasAuthError) setHasAuthError(false);
                    }}
                    className={`w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-xl focus:outline-none transition-all shadow-inner ${
                      hasAuthError && !passwordError
                        ? 'border border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] bg-rose-950/30 text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                        : 'border border-slate-700/80 focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              {/* Password Input with Gold Eye Icon & Inline Incorrect Password Prompt */}
              <div>
                <label htmlFor="landing-password" className="sr-only">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="landing-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                      if (errorMsg) setErrorMsg('');
                      if (hasAuthError) setHasAuthError(false);
                    }}
                    className={`w-full bg-[#131B2E] text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm px-4 py-2.5 sm:py-3 pr-10 rounded-xl focus:outline-none transition-all shadow-inner ${
                      passwordError
                        ? 'border border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] bg-rose-950/30 text-rose-100 focus:border-rose-400 focus:ring-rose-500'
                        : 'border border-slate-700/80 focus:border-amber-400'
                    }`}
                  />
                  <button
                    type="button"
                    id="btn-toggle-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-amber-300/80 hover:text-amber-200 transition-colors p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-amber-300" /> : <Eye className="w-4 h-4 text-amber-300" />}
                  </button>
                </div>

                {/* Inline Incorrect Password Error & Clickable Forgot Password Link */}
                {passwordError ? (
                  <div
                    id="landing-password-error-row"
                    className="mt-2 px-1 flex items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-1"
                  >
                    <span className="text-rose-300 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{passwordError}</span>
                    </span>
                    <button
                      type="button"
                      id="btn-landing-forgot-password-inline"
                      onClick={() => switchMode('forgot_password')}
                      className="text-amber-300 hover:text-amber-200 underline underline-offset-2 font-medium transition-colors cursor-pointer text-xs shrink-0"
                    >
                      Forgot Password?
                    </button>
                  </div>
                ) : (
                  mode === 'signin' && (
                    <div className="mt-1.5 px-1 flex justify-end">
                      <button
                        type="button"
                        id="btn-landing-forgot-password-link"
                        onClick={() => switchMode('forgot_password')}
                        className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {mode === 'signin' ? (
                  <>
                    <button
                      type="submit"
                      id="btn-landing-signin"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-purple-600 hover:from-amber-300 hover:via-amber-400 hover:to-purple-500 text-slate-950 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>ENTER UNIVERSE 🌌</span>
                      )}
                    </button>

                    <button
                      type="button"
                      id="btn-landing-create-account"
                      onClick={() => switchMode('signup')}
                      disabled={isLoading}
                      className="w-full bg-[#1B243B] hover:bg-[#24304e] text-amber-200 hover:text-amber-100 border border-slate-700 hover:border-slate-600 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                    >
                      <span>JOIN THE UNIVERSE 🌌</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="submit"
                      id="btn-landing-create-account"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-purple-600 hover:from-amber-300 hover:via-amber-400 hover:to-purple-500 text-slate-950 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>JOIN THE UNIVERSE 🌌</span>
                      )}
                    </button>

                    <button
                      type="button"
                      id="btn-landing-signin"
                      onClick={() => switchMode('signin')}
                      disabled={isLoading}
                      className="w-full bg-[#1B243B] hover:bg-[#24304e] text-amber-200 hover:text-amber-100 border border-slate-700 hover:border-slate-600 font-semibold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl uppercase tracking-widest cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                    >
                      <span>ENTER UNIVERSE 🌌 (SIGN IN)</span>
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Explore as Guest Button */}
        <button
          type="button"
          id="btn-demo-guest"
          onClick={handleGuestSignIn}
          disabled={isLoading}
          className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[#131B2E] hover:bg-[#1B243B] text-slate-300 hover:text-white border border-slate-700/80 text-sm font-medium text-center transition-all cursor-pointer shadow-md"
        >
          <span>Explore as Guest →</span>
        </button>
      </motion.div>
    </div>
  );
};
