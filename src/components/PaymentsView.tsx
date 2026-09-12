import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UnifiedPayment } from '../types';
import { formatCurrency, formatMonthName } from '../lib/formatters';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Users,
  Tv,
  MonitorPlay,
  Calendar,
  DollarSign,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { activeMonth, availableMonths, setActiveMonth, isAdmin, canAccess } = useAuth();
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Paid'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Influencer' | 'Billboard' | 'LCD Screen'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canApprove = isAdmin || canAccess('approvePayments');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.getPayments({
        month: activeMonth,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
      });
      setPayments(res.payments);
      setSummary(res.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [activeMonth, statusFilter, typeFilter]);

  const handleUpdateStatus = async (p: UnifiedPayment, newStatus: 'Approved' | 'Paid') => {
    setActionLoading(p.id);
    try {
      await api.updatePaymentStatus(p.sourceType, p.id, { status: newStatus });
      await loadPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPayments = payments.filter((p) => {
    return (
      p.recipient.toLowerCase().includes(search.toLowerCase()) ||
      p.notes.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Unified Disbursements & Governance</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Enterprise Payments Central
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Consolidated payment ledger for Influencer salaries, Billboard leases, and LCD screen agreements for{' '}
              <span className="text-slate-200 font-medium">{formatMonthName(activeMonth)}</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 p-1.5 rounded-xl self-start md:self-auto">
            <Calendar className="w-4 h-4 text-amber-400 ml-2" />
            <span className="text-xs text-slate-400 hidden sm:inline">Operating Month:</span>
            <select
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

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-xs text-slate-400 mb-1">Total Payment Obligations</div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(summary.totalAmount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{summary.totalCount} active items</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40">
            <div className="text-xs text-amber-300 font-medium mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending Approvals / Unpaid</span>
            </div>
            <div className="text-2xl font-bold text-amber-400 tracking-tight">
              {formatCurrency(summary.pendingAmount)}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-1">Awaiting admin signoff</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
            <div className="text-xs text-emerald-300 font-medium mb-1 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Settled / Paid Obligations</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {formatCurrency(summary.paidAmount)}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">Completed disbursements</div>
          </div>
        </div>
      </div>

      {/* Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              placeholder="Search recipient vendor, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            {(['all', 'Pending', 'Approved', 'Paid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Source Type Filter */}
          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="Influencer">Influencers</option>
            <option value="Billboard">Billboards</option>
            <option value="LCD Screen">LCD Screens</option>
          </select>
        </div>
      </div>

      {/* Unified Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Channel / Source</th>
                <th className="py-3 px-4">Recipient / Vendor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount (USD)</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-normal">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No payment obligations found for {formatMonthName(activeMonth)} with active filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={`${p.sourceType}-${p.id}`} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      {p.sourceType === 'Influencer' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-semibold">
                          <Users className="w-3 h-3" />
                          <span>Influencer</span>
                        </span>
                      )}
                      {p.sourceType === 'Billboard' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                          <Tv className="w-3 h-3" />
                          <span>Billboard</span>
                        </span>
                      )}
                      {p.sourceType === 'LCD Screen' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-semibold">
                          <MonitorPlay className="w-3 h-3" />
                          <span>LCD Screen</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {p.recipient}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {p.category}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.date}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === 'Paid' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Paid
                        </span>
                      )}
                      {p.status === 'Approved' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                          Approved
                        </span>
                      )}
                      {p.status === 'Pending' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                      {p.notes || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canApprove ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          {p.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(p, 'Approved')}
                              disabled={actionLoading === p.id}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition"
                            >
                              Approve
                            </button>
                          )}
                          {p.status !== 'Paid' && (
                            <button
                              onClick={() => handleUpdateStatus(p, 'Paid')}
                              disabled={actionLoading === p.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition"
                            >
                              Mark as Paid
                            </button>
                          )}
                          {p.status === 'Paid' && (
                            <span className="text-[11px] text-emerald-400 font-medium">Settled</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Approval Permission Required</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
