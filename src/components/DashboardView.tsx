import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { formatCurrency, formatMonthName } from '../lib/formatters';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  CheckCircle,
  Clock,
  Users,
  Target,
  Tv,
  MonitorPlay,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { activeMonth, availableMonths, setActiveMonth, isAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard(activeMonth);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeMonth]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading marketing operations data for {formatMonthName(activeMonth)}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span className="text-sm">{error || 'Unable to display dashboard data'}</span>
        </div>
        <button
          onClick={fetchDashboard}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const budgetSpentPct = data.totalMarketingBudget > 0
    ? Math.min(100, Math.round((data.totalBudgetSpent / data.totalMarketingBudget) * 100))
    : 0;

  const targetAchievedPct = data.activeInfluencers > 0
    ? Math.min(100, Math.round((data.influencersWhoReachedTarget / data.activeInfluencers) * 100))
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executive Operations Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Marketing Performance Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracking enterprise budgets, active campaigns, influencer deliverables, and payments for{' '}
            <span className="text-slate-200 font-medium">{formatMonthName(data.month)}</span>.
          </p>
        </div>

        {/* Month Selector Switcher */}
        <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 p-1.5 rounded-xl self-start md:self-auto">
          <Calendar className="w-4 h-4 text-blue-400 ml-2" />
          <span className="text-xs text-slate-400 hidden sm:inline">Selected Month:</span>
          <select
            id="dashboard-month-filter"
            value={activeMonth}
            onChange={(e) => setActiveMonth(e.target.value)}
            className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer pr-2"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m} className="bg-slate-800 text-white">
                {formatMonthName(m)} ({m})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 10 Core Required Operational Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Marketing Budget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Marketing Budget</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatCurrency(data.totalMarketingBudget)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1">
            <span>Pools: Local & International</span>
          </div>
        </div>

        {/* 2. Total Budget Spent */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Budget Spent</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatCurrency(data.totalBudgetSpent)}
          </div>
          <div className="text-[11px] text-rose-400 mt-1.5 flex items-center space-x-1">
            <span>{budgetSpentPct}% utilized this period</span>
          </div>
        </div>

        {/* 3. Remaining Budget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Remaining Budget</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(data.remainingBudget)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            <span>{100 - budgetSpentPct}% remaining headroom</span>
          </div>
        </div>

        {/* 4. Total Pending Payments */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Pending Payments</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-300 tracking-tight">
            {formatCurrency(data.totalPendingPayments)}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1.5 flex items-center space-x-1">
            <span>Awaiting Admin Approval/Settlement</span>
          </div>
        </div>

        {/* 5. Total Paid Payments */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Paid Payments</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatCurrency(data.totalPaidPayments)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1.5">
            <span>Completed settlements</span>
          </div>
        </div>

        {/* 6. Active Influencers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Influencers</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {data.activeInfluencers}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            <span>Contracted creators</span>
          </div>
        </div>

        {/* 7. Influencers Who Reached Target */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Target Achieved</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-teal-300 tracking-tight">
            {data.influencersWhoReachedTarget} <span className="text-xs text-slate-500 font-normal">/ {data.activeInfluencers}</span>
          </div>
          <div className="text-[11px] text-teal-400 mt-1.5">
            <span>{targetAchievedPct}% achieved video goals</span>
          </div>
        </div>

        {/* 8. Active Billboards */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Billboards</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {data.activeBillboards}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            <span>Outdoor placements</span>
          </div>
        </div>

        {/* 9. Active LCD Screens */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active LCD Screens</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <MonitorPlay className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {data.activeLCDScreens}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            <span>Digital display venues</span>
          </div>
        </div>

        {/* 10. Monthly Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Monthly Expenses</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatCurrency(data.monthlyExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            <span>Total posted to ledger</span>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown & Budget Pools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Allocation by Pool */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Budget Pool Health</h3>
              <p className="text-xs text-slate-400">Local vs. International allocation & spend</p>
            </div>
            <button
              onClick={() => onNavigateTab('budget')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Local Pool */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-200">Local Marketing Pool</span>
                <span className="text-slate-300">
                  {formatCurrency(data.localExpenses)} / {formatCurrency(data.localBudget)}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mb-1.5">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${data.localBudget > 0 ? Math.min(100, Math.round((data.localExpenses / data.localBudget) * 100)) : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Remaining: {formatCurrency(Math.max(0, data.localBudget - data.localExpenses))}
                </span>
                <span>
                  {data.localBudget > 0 ? Math.round((data.localExpenses / data.localBudget) * 100) : 0}% spent
                </span>
              </div>
            </div>

            {/* International Pool */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-slate-200">International Marketing Pool</span>
                <span className="text-slate-300">
                  {formatCurrency(data.internationalExpenses)} / {formatCurrency(data.internationalBudget)}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mb-1.5">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${data.internationalBudget > 0 ? Math.min(100, Math.round((data.internationalExpenses / data.internationalBudget) * 100)) : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Remaining: {formatCurrency(Math.max(0, data.internationalBudget - data.internationalExpenses))}
                </span>
                <span>
                  {data.internationalBudget > 0 ? Math.round((data.internationalExpenses / data.internationalBudget) * 100) : 0}% spent
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses by Category Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Expenses by Category</h3>
              <p className="text-xs text-slate-400">Operational distribution this month</p>
            </div>
            <button
              onClick={() => onNavigateTab('budget')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
            >
              <span>Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Influencers', amount: data.categoryExpenses.Influencers, color: 'bg-indigo-500' },
              { label: 'Billboards', amount: data.categoryExpenses.Billboards, color: 'bg-purple-500' },
              { label: 'LCD Screens', amount: data.categoryExpenses['LCD Screens'], color: 'bg-cyan-500' },
              { label: 'Other Marketing', amount: data.categoryExpenses.Other, color: 'bg-slate-400' },
            ].map((cat) => {
              const pct = data.monthlyExpenses > 0 ? Math.round((cat.amount / data.monthlyExpenses) * 100) : 0;
              return (
                <div key={cat.label} className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat.label}</span>
                    <span className="text-white font-semibold">{formatCurrency(cat.amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${cat.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Fast Navigation & Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight mb-1">Operations Hub</h3>
            <p className="text-xs text-slate-400 mb-4">Direct shortcuts to active workflow modules</p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigateTab('influencers')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition flex flex-col justify-between"
              >
                <Users className="w-4 h-4 text-indigo-400 mb-2" />
                <div>
                  <div className="text-xs font-semibold text-white">Influencers</div>
                  <div className="text-[10px] text-slate-400">Targets & Deliveries</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('billboards')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition flex flex-col justify-between"
              >
                <Tv className="w-4 h-4 text-purple-400 mb-2" />
                <div>
                  <div className="text-xs font-semibold text-white">Billboards</div>
                  <div className="text-[10px] text-slate-400">Locations & Rent</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('lcd')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition flex flex-col justify-between"
              >
                <MonitorPlay className="w-4 h-4 text-cyan-400 mb-2" />
                <div>
                  <div className="text-xs font-semibold text-white">LCD Screens</div>
                  <div className="text-[10px] text-slate-400">Digital Venues</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('payments')}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition flex flex-col justify-between"
              >
                <CreditCard className="w-4 h-4 text-emerald-400 mb-2" />
                <div>
                  <div className="text-xs font-semibold text-white">Central Payments</div>
                  <div className="text-[10px] text-amber-400/90">{data.totalPendingPayments > 0 ? 'Pending Approvals' : 'All Clear'}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Database Connected</span>
            </span>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              View Reports →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
