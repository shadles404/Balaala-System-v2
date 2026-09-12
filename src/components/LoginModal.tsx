import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertCircle, Lock, LogIn, User as UserIcon, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
);

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithGoogle, authError, clearAuthError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearAuthError();
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    setLoading(true);
    try {
      await login(identifier, password);
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-1 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Enterprise Authentication</h2>
            <p className="text-xs text-slate-400">Sign in with Google or your credentials</p>
          </div>
        </div>

        {displayedError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-relaxed">{displayedError}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Option 1: Google Sign In */}
          <button
            type="button"
            id="btn-modal-google-signin"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center space-x-2.5 border border-slate-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <GoogleIcon />
            <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex py-0.5 items-center">
            <div className="grow border-t border-slate-800"></div>
            <span className="shrink mx-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Or email & password
            </span>
            <div className="grow border-t border-slate-800"></div>
          </div>

          {/* Option 2: Email & Password */}
          <form onSubmit={handleEmailSignIn} className="space-y-3 text-left">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Email Address or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. sarah.jenkins@gmail.com or username"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none pl-8"
                />
                <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none pl-8"
                />
                <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-md flex items-center justify-center space-x-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

