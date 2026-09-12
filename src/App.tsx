import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { InfluencersView } from './components/InfluencersView';
import { BillboardsView } from './components/BillboardsView';
import { LCDScreensView } from './components/LCDScreensView';
import { BudgetView } from './components/BudgetView';
import { PaymentsView } from './components/PaymentsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import {
  LayoutDashboard,
  Users,
  Tv,
  MonitorPlay,
  Wallet,
  CreditCard,
  FileSpreadsheet,
  ShieldCheck,
  Lock,
  Building2,
  ShieldAlert,
  KeyRound,
  LogIn,
  Mail,
  User as UserIcon,
  AlertCircle,
} from 'lucide-react';
import { UserPermissions } from './types';

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

function MainLayout() {
  const { user, loading, isAdmin, canAccess, login, loginWithGoogle, authError, clearAuthError } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const handlePortalGoogleSignIn = async () => {
    setSignInError(null);
    clearAuthError();
    setSignInLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setSignInError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setSignInLoading(false);
    }
  };

  const handlePortalEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    clearAuthError();
    setSignInLoading(true);
    try {
      await login(signInIdentifier, signInPassword);
    } catch (err: any) {
      setSignInError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSignInLoading(false);
    }
  };

  // Navigation Items with RBAC
  const navItems = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, adminOnly: true },
    { id: 'influencers', label: 'Influencers & Targets', icon: Users, permission: 'viewInfluencers' },
    { id: 'billboards', label: 'Billboards', icon: Tv, permission: 'manageBillboards' },
    { id: 'lcd', label: 'LCD Screens', icon: MonitorPlay, permission: 'manageLCDScreens' },
    { id: 'budget', label: 'Campaigns & Budget', icon: Wallet, permission: 'manageCampaigns' },
    { id: 'payments', label: 'Payments Central', icon: CreditCard, permission: 'viewPayments' },
    { id: 'reports', label: 'Reports & Statements', icon: FileSpreadsheet, permission: 'viewReports' },
    { id: 'settings', label: 'Settings & Users', icon: ShieldCheck, adminOnly: true },
  ];

  // Determine allowed navigation items for current user
  const visibleNavItems = navItems.filter((item) => {
    if (!user) return false;
    if (item.adminOnly) return isAdmin;
    if (item.permission) return canAccess(item.permission as keyof UserPermissions);
    return true;
  });

  // Automatically adjust active tab when user changes
  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      if (!navItems.some((n) => n.id === activeTab)) {
        setActiveTab('dashboard');
      }
    } else {
      // Sub-user: if currently on a tab they cannot access (like dashboard), switch to their first permitted tab
      const isCurrentAllowed = visibleNavItems.some((n) => n.id === activeTab);
      if (!isCurrentAllowed && visibleNavItems.length > 0) {
        setActiveTab(visibleNavItems[0].id);
      }
    }
  }, [user, isAdmin, visibleNavItems.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide">Connecting to Firebase IAM & Firestore Database...</p>
      </div>
    );
  }

  // If not authenticated, present the enterprise sign-in portal
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between antialiased">
        {/* Top Minimal Header */}
        <header className="bg-slate-900 border-b border-slate-800 py-4 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center shadow-inner">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white">Marketing Operations Enterprise</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30">
                  Zero-Trust Firebase
                </span>
              </div>
            </div>
            <button
              onClick={handlePortalGoogleSignIn}
              disabled={signInLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-sm disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Sign In with Google</span>
            </button>
          </div>
        </header>

        {/* Authentication Portal Body */}
        <main className="max-w-md w-full mx-auto px-4 py-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Sign In</h1>
              <p className="text-xs text-slate-400">
                Sign in with your Google Account or Email & Password
              </p>
            </div>

            {(signInError || authError) && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="leading-relaxed">{signInError || authError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Option 1: Google Sign In */}
              <button
                type="button"
                id="btn-portal-google-signin"
                onClick={handlePortalGoogleSignIn}
                disabled={signInLoading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center space-x-2.5 border border-slate-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <GoogleIcon />
                <span>{signInLoading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
              </button>

              {/* Visual Divider */}
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-800"></div>
                <span className="shrink mx-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Or continue with credentials
                </span>
                <div className="grow border-t border-slate-800"></div>
              </div>

              {/* Option 2: Email or Username + Password */}
              <form onSubmit={handlePortalEmailSignIn} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address or Username
                  </label>
                  <div className="relative">
                    <input
                      id="portal-username"
                      type="text"
                      required
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder="e.g. sarah.jenkins@gmail.com or username"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none pl-9"
                    />
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <input
                      id="portal-password"
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none pl-9"
                    />
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-portal-signin"
                  disabled={signInLoading}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-md flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{signInLoading ? 'Authenticating...' : 'Sign In with Password'}</span>
                </button>
              </form>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/70 text-left text-xs space-y-1">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Dual Enterprise Authentication</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Administrator and sub-users can log in using either their registered <strong>Google Account</strong> or their assigned <strong>Email/Username and Password</strong>.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          Marketing Operations Enterprise • Protected by Firebase Security Rules & IAM
        </footer>

        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </div>
    );
  }

  // Authenticated State Layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-600 selection:text-white">
      {/* Top Header */}
      <Navbar onOpenLogin={() => setShowLoginModal(true)} />

      {/* Primary Navigation Bar */}
      <div className="bg-slate-900/95 border-b border-slate-800 sticky top-16 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Views with strictly enforced guards */}
        {activeTab === 'dashboard' && (
          isAdmin ? (
            <DashboardView onNavigateTab={(t) => setActiveTab(t)} />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only authenticated administrators can view executive marketing metrics and system dashboards.
              </p>
            </div>
          )
        )}

        {activeTab === 'influencers' && (
          canAccess('viewInfluencers') ? (
            <InfluencersView />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-slate-400">You do not have permission to view Influencers.</p>
            </div>
          )
        )}

        {activeTab === 'billboards' && (
          canAccess('manageBillboards') ? (
            <BillboardsView />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-slate-400">You do not have permission to manage Billboards.</p>
            </div>
          )
        )}

        {activeTab === 'lcd' && (
          canAccess('manageLCDScreens') ? (
            <LCDScreensView />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-slate-400">You do not have permission to manage LCD Screens.</p>
            </div>
          )
        )}

        {activeTab === 'budget' && (
          (canAccess('manageCampaigns') || canAccess('viewExpenses')) ? (
            <BudgetView />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-slate-400">You do not have permission to view Campaigns & Budgets.</p>
            </div>
          )
        )}

        {activeTab === 'payments' && (
          canAccess('viewPayments') ? (
            <PaymentsView />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-slate-400">You do not have permission to view Payments Central.</p>
            </div>
          )
        )}

        {activeTab === 'reports' && (
          canAccess('viewReports') ? (
            <ReportsView />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-slate-400">You do not have permission to view Executive Reports.</p>
            </div>
          )
        )}

        {activeTab === 'settings' && (
          isAdmin ? (
            <SettingsView />
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
              <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-slate-400">Only administrators can manage users and system settings.</p>
            </div>
          )
        )}
      </main>

      {/* Enterprise Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            <span className="text-slate-400 font-medium">Marketing Operations Enterprise System</span>
            <span>•</span>
            <span>Accrual Ledger & Creator Deliverables Engine</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Firebase Security Rules • Attribute-Based Access Control (ABAC) • Live Firestore Persistence
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
