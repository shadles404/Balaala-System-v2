import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatMonthName } from '../lib/formatters';
import { api } from '../services/api';
import {
  Calendar,
  Shield,
  User as UserIcon,
  LogOut,
  PlusCircle,
  TrendingUp,
  ChevronDown,
  Building2,
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin }) => {
  const { user, isAdmin, activeMonth, setActiveMonth, availableMonths, refreshMonths, logout } = useAuth();
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState('');
  const [isStartingMonth, setIsStartingMonth] = useState(false);

  const handleStartNewMonth = async () => {
    if (!newMonthInput) return;
    setIsStartingMonth(true);
    try {
      await api.startNewMonth(newMonthInput);
      await refreshMonths();
      setActiveMonth(newMonthInput);
      setShowMonthModal(false);
      setNewMonthInput('');
    } catch (e: any) {
      alert(e.message || 'Failed to initialize month');
    } finally {
      setIsStartingMonth(false);
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-inner">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Marketing Operations</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-400/30">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Budgets, Influencers, Billboards & Payments</p>
            </div>
          </div>

          {/* Month Selector & Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-1 text-sm">
              <Calendar className="w-4 h-4 text-blue-400 ml-2 mr-1.5" />
              <span className="text-xs text-slate-400 mr-2 hidden sm:inline">Operating Period:</span>
              <select
                id="month-selector-header"
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                className="bg-transparent text-white font-semibold text-sm focus:outline-none cursor-pointer pr-2"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-slate-800 text-white">
                    {formatMonthName(m)} ({m})
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <button
                id="btn-start-new-month-nav"
                onClick={() => setShowMonthModal(true)}
                title="Start a new monthly operational period"
                className="hidden md:flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>New Month Period</span>
              </button>
            )}

            {/* User Profile / Auth State */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-white leading-tight">{user.fullName}</div>
                  <div className="flex items-center justify-end space-x-1">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center text-[10px] text-amber-300 font-medium px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800/60">
                        <Shield className="w-2.5 h-2.5 mr-0.5 text-amber-400" /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-medium px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                        Sub-User
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-sm border border-indigo-400/30">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>

                <button
                  id="btn-logout"
                  onClick={logout}
                  title="Sign out of system"
                  className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-login-header"
                onClick={onOpenLogin}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Start New Month Period Modal */}
      {showMonthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span>Initialize Clean Monthly Operational Period</span>
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              In accordance with enterprise accounting standards, this will begin a clean monthly operational period for target tracking, expenses, and payments. All permanent master data (influencer profiles, contracts, billboards, and past monthly history) will remain preserved in the archive.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Month (YYYY-MM)</label>
              <input
                id="input-new-month-period"
                type="month"
                value={newMonthInput}
                onChange={(e) => setNewMonthInput(e.target.value)}
                placeholder="2026-10"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowMonthModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartNewMonth}
                disabled={!newMonthInput || isStartingMonth}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition"
              >
                {isStartingMonth ? 'Initializing...' : 'Confirm & Open Month'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
