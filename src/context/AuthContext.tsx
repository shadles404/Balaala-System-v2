import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { User, UserPermissions } from '../types';
import {
  getFirestoreUser,
  ensureAdminProfile,
  syncGoogleUserProfile,
  syncAuthenticatedUserProfile,
  findUserEmailByUsername,
  getAllPermissionsTrue,
  getFirestoreMonths,
  startFirestoreNewMonth,
} from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  activeMonth: string;
  availableMonths: string[];
  authError: string | null;
  setActiveMonth: (m: string) => void;
  refreshMonths: () => Promise<void>;
  startNewMonth: (m?: string) => Promise<void>;
  canAccess: (permission: keyof UserPermissions | string) => boolean;
  loginWithGoogle: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  setupAdminAccount: (password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const refreshMonths = async () => {
    try {
      const res = await getFirestoreMonths();
      setAvailableMonths(res.availableMonths);
      if (res.activeMonth && !activeMonth) {
        setActiveMonth(res.activeMonth);
      }
    } catch (e) {
      console.warn('[Firestore] Could not load operational months:', e);
    }
  };

  const startNewMonth = async (m?: string) => {
    const res = await startFirestoreNewMonth(m);
    await refreshMonths();
    if (res.month) {
      setActiveMonth(res.month);
    }
  };

  const refreshUser = async () => {
    const currentFbUser = auth.currentUser;
    if (!currentFbUser) {
      setUser(null);
      setFirebaseUser(null);
      setLoading(false);
      return;
    }

    try {
      const synced = await syncGoogleUserProfile(currentFbUser);
      if (!synced || synced.status === 'inactive') {
        await signOut(auth);
        setUser(null);
        setFirebaseUser(null);
      } else {
        setUser(synced);
      }
    } catch (err) {
      console.warn('[Firebase Auth] Error refreshing user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await syncGoogleUserProfile(fbUser);
        if (!profile) {
          console.warn('[Firebase Auth] Authenticated Google Account is not authorized');
          await signOut(auth);
          setUser(null);
          setAuthError(`The Google Account (${fbUser.email || 'unknown'}) is not authorized. Please ask the Administrator to grant access.`);
        } else if (profile.status === 'inactive') {
          console.warn('[Firebase Auth] Inactive account tried to connect');
          await signOut(auth);
          setUser(null);
          setAuthError('Your account has been deactivated by the Administrator.');
        } else {
          setUser(profile);
          setAuthError(null);
        }
      } catch (err: any) {
        console.error('[Firebase Auth] Error loading user profile:', err);
        setAuthError(err.message || 'Error loading user credentials');
      } finally {
        setLoading(false);
      }
    });

    refreshMonths();

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await syncGoogleUserProfile(cred.user);
      if (!profile) {
        await signOut(auth);
        setUser(null);
        throw new Error(
          `Access restricted: The Google Account "${cred.user.email}" has not been authorized. Please contact the administrator (balaalabc@gmail.com) to grant you access.`
        );
      }
      if (profile.status === 'inactive') {
        await signOut(auth);
        setUser(null);
        throw new Error('This Google account has been deactivated by the Administrator.');
      }
      setUser(profile);
      await refreshMonths();
    } catch (err: any) {
      console.error('[Firebase Auth] Google Sign-In error:', err);
      let msg = err.message || 'Google authentication failed';
      if (err.code === 'auth/unauthorized-domain') {
        msg = `Google Sign-In is not allowed for this domain (${window.location.hostname}) in Firebase. Please log in using your Email/Username & Password, or add this domain in Firebase Console (Authentication > Settings > Authorized domains).`;
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in popup was closed before completing. Please try again.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        msg = 'Sign-in cancelled. Please try again.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by browser. Please allow popups for this site.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    setAuthError(null);
    const identifier = emailOrUsername.trim();
    if (!identifier || !password) {
      throw new Error('Please enter both username/email and password.');
    }

    let emailToUse = identifier;
    if (!identifier.includes('@')) {
      if (identifier.toLowerCase() === 'admin') {
        emailToUse = 'balaalabc@gmail.com';
      } else {
        const foundEmail = await findUserEmailByUsername(identifier);
        if (!foundEmail) {
          throw new Error(`No account found with username "${identifier}".`);
        }
        emailToUse = foundEmail;
      }
    }

    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, emailToUse, password);
      } catch (signInErr: any) {
        if (
          emailToUse === 'balaalabc@gmail.com' &&
          (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential')
        ) {
          try {
            cred = await createUserWithEmailAndPassword(auth, emailToUse, password);
          } catch {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      const profile = await syncAuthenticatedUserProfile(cred.user);
      if (!profile) {
        await signOut(auth);
        setUser(null);
        throw new Error('Access denied: No user account found for these credentials in Firestore. Please contact the Administrator.');
      }
      if (profile.status === 'inactive') {
        await signOut(auth);
        setUser(null);
        throw new Error('This account has been deactivated by the Administrator.');
      }

      setUser(profile);
      await refreshMonths();
    } catch (err: any) {
      console.error('[Firebase Auth] Login error:', err);
      let msg = err.message || 'Authentication failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid credentials. Please verify your email/username and password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Sub-users must be provisioned by the Administrator.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please wait a moment and try again.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const setupAdminAccount = async (password: string, fullName?: string) => {
    setAuthError(null);
    if (!password || password.length < 6) {
      throw new Error('Administrator password must be at least 6 characters.');
    }
    const adminEmail = 'balaalabc@gmail.com';
    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, adminEmail, password);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          cred = await createUserWithEmailAndPassword(auth, adminEmail, password);
        } else {
          throw signInErr;
        }
      }

      const adminProfile = await ensureAdminProfile(
        cred.user.uid,
        adminEmail,
        fullName || 'Primary Administrator'
      );
      setUser(adminProfile);
      await refreshMonths();
    } catch (err: any) {
      console.error('[Firebase Auth] Admin setup error:', err);
      let msg = err.message || 'Failed to initialize administrator account';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Admin email is already registered. Please sign in using your existing password.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'balaalabc@gmail.com';

  const canAccess = (permission: keyof UserPermissions | string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.email === 'balaalabc@gmail.com') return true;
    if (user.status !== 'active') return false;

    // Granular permission check
    if (user.permissions && (user.permissions as any)[permission] === true) {
      return true;
    }

    // Section alias mapping
    const map: Record<string, keyof UserPermissions> = {
      influencers: 'viewInfluencers',
      targets: 'viewInfluencers',
      deliveries: 'viewProducts',
      products: 'viewProducts',
      billboards: 'manageBillboards',
      lcd_screens: 'manageLCDScreens',
      budgets: 'manageCampaigns',
      campaigns: 'manageCampaigns',
      expenses: 'viewExpenses',
      payments: 'viewPayments',
      reports: 'viewReports',
      settings: 'manageUsers',
    };

    if (map[permission] && user.permissions) {
      return Boolean(user.permissions[map[permission]]);
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isAdmin,
        activeMonth,
        availableMonths,
        authError,
        setActiveMonth,
        refreshMonths,
        startNewMonth,
        canAccess,
        loginWithGoogle,
        login,
        setupAdminAccount,
        logout,
        refreshUser,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
