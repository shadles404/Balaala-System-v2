import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Influencer,
  MonthlyTargetEnriched,
  DeliveryRecord,
  InfluencerPayment,
} from '../types';
import { formatCurrency, formatMonthName } from '../lib/formatters';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Package,
  CreditCard,
  Video,
  Phone,
  Calendar,
  DollarSign,
  ChevronRight,
  TrendingUp,
  X,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const InfluencersView: React.FC = () => {
  const { activeMonth, availableMonths, setActiveMonth, isAdmin, canAccess, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'registration' | 'targets' | 'deliveries' | 'payments'>('registration');

  // ===================== 1. REGISTRATION STATE =====================
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [searchInf, setSearchInf] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [showAddInfModal, setShowAddInfModal] = useState(false);
  const [editingInf, setEditingInf] = useState<Influencer | null>(null);

  const [infForm, setInfForm] = useState({
    fullName: '',
    tiktokUsername: '',
    phoneNumber: '',
    category: 'Lifestyle',
    targetVideosPerMonth: 4,
    salary: 1500,
    agreementStartDate: new Date().toISOString().split('T')[0],
    agreementEndDate: '',
    status: 'Active' as 'Active' | 'Inactive',
    notes: '',
  });

  // ===================== 2. TARGETS STATE =====================
  const [targets, setTargets] = useState<MonthlyTargetEnriched[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [showEditTargetModal, setShowEditTargetModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MonthlyTargetEnriched | null>(null);
  const [targetCompletedInput, setTargetCompletedInput] = useState<number>(0);
  const [targetNotesInput, setTargetNotesInput] = useState<string>('');

  // ===================== 3. DELIVERIES STATE =====================
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [deliverySummary, setDeliverySummary] = useState({
    totalDeliveryValue: 0,
    totalPaidDeliveriesCount: 0,
    totalPaidDeliveriesValue: 0,
    totalUnpaidDeliveriesCount: 0,
    totalUnpaidDeliveriesValue: 0,
  });
  const [showAddDeliveryModal, setShowAddDeliveryModal] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'Paid' | 'Pending'>('all');
  const [deliveryForm, setDeliveryForm] = useState({
    influencerId: '',
    productName: '',
    quantity: 1,
    deliveryPrice: 50,
    deliveryDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Pending' as 'Paid' | 'Pending',
    notes: '',
  });

  // ===================== 4. PAYMENTS STATE =====================
  const [influencerPayments, setInfluencerPayments] = useState<InfluencerPayment[]>([]);
  const [showRequestPaymentModal, setShowRequestPaymentModal] = useState(false);
  const [paymentRequestInfId, setPaymentRequestInfId] = useState('');
  const [paymentRequestNotes, setPaymentRequestNotes] = useState('');
  const [paymentActionLoading, setPaymentActionLoading] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Loaders
  const loadInfluencers = async () => {
    try {
      const res = await api.getInfluencers();
      setInfluencers(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTargets = async () => {
    try {
      const res = await api.getTargets(activeMonth);
      setTargets(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDeliveries = async () => {
    try {
      const res = await api.getDeliveries(activeMonth);
      setDeliveries(res.deliveries);
      setDeliverySummary(res.summary);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await api.getInfluencerPayments(activeMonth);
      setInfluencerPayments(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInfluencers();
    loadTargets();
    loadDeliveries();
    loadPayments();
  }, [activeMonth]);

  // Handlers for Registration
  const handleSaveInfluencer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingInf) {
        await api.updateInfluencer(editingInf.id, infForm);
      } else {
        await api.createInfluencer(infForm);
      }
      setShowAddInfModal(false);
      setEditingInf(null);
      setInfForm({
        fullName: '',
        tiktokUsername: '',
        phoneNumber: '',
        category: 'Lifestyle',
        targetVideosPerMonth: 4,
        salary: 1500,
        agreementStartDate: new Date().toISOString().split('T')[0],
        agreementEndDate: '',
        status: 'Active',
        notes: '',
      });
      await loadInfluencers();
      await loadTargets();
    } catch (err: any) {
      alert(err.message || 'Failed to save influencer');
    }
  };

  const handleDeleteInfluencer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this influencer? Permanent record.')) return;
    try {
      await api.deleteInfluencer(id);
      await loadInfluencers();
      await loadTargets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete influencer');
    }
  };

  // Handlers for Target Tracking
  const handleOpenEditTarget = (t: MonthlyTargetEnriched) => {
    setSelectedTarget(t);
    setTargetCompletedInput(t.completedVideos);
    setTargetNotesInput(t.notes || '');
    setShowEditTargetModal(true);
  };

  const handleQuickIncrementTarget = async (t: MonthlyTargetEnriched) => {
    try {
      await api.updateTarget(t.id, {
        completedVideos: t.completedVideos + 1,
      });
      await loadTargets();
      await loadPayments(); // Re-sync in case target reached
    } catch (err: any) {
      alert(err.message || 'Failed to increment target');
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;
    try {
      await api.updateTarget(selectedTarget.id, {
        completedVideos: targetCompletedInput,
        notes: targetNotesInput,
      });
      setShowEditTargetModal(false);
      await loadTargets();
      await loadPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to update target');
    }
  };

  // Handlers for Deliveries
  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryForm.influencerId || !deliveryForm.productName) {
      alert('Influencer and product name are required');
      return;
    }
    try {
      await api.createDelivery({
        ...deliveryForm,
        month: activeMonth,
      });
      setShowAddDeliveryModal(false);
      setDeliveryForm({
        influencerId: '',
        productName: '',
        quantity: 1,
        deliveryPrice: 50,
        deliveryDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'Pending',
        notes: '',
      });
      await loadDeliveries();
    } catch (err: any) {
      alert(err.message || 'Failed to record product delivery');
    }
  };

  const handleToggleDeliveryPayment = async (d: DeliveryRecord) => {
    const nextStatus = d.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    try {
      await api.updateDelivery(d.id, { paymentStatus: nextStatus });
      await loadDeliveries();
    } catch (err: any) {
      alert(err.message || 'Failed to update delivery payment status');
    }
  };

  // Handlers for Payments
  const handleSubmitPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRequestInfId) return;
    try {
      await api.requestInfluencerPayment({
        influencerId: paymentRequestInfId,
        month: activeMonth,
        notes: paymentRequestNotes,
      });
      setShowRequestPaymentModal(false);
      setPaymentRequestInfId('');
      setPaymentRequestNotes('');
      await loadPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to submit payment request');
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: 'Approved' | 'Paid') => {
    setPaymentActionLoading(paymentId);
    try {
      await api.updateInfluencerPaymentStatus(paymentId, { status });
      await loadPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    } finally {
      setPaymentActionLoading(null);
    }
  };

  // Filtered lists
  const filteredInfluencers = influencers.filter((i) => {
    const matchesSearch =
      i.fullName.toLowerCase().includes(searchInf.toLowerCase()) ||
      i.tiktokUsername.toLowerCase().includes(searchInf.toLowerCase()) ||
      i.category.toLowerCase().includes(searchInf.toLowerCase());
    const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredTargets = targets.filter((t) => {
    return (
      t.influencerName.toLowerCase().includes(targetSearch.toLowerCase()) ||
      t.tiktokUsername.toLowerCase().includes(targetSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(targetSearch.toLowerCase())
    );
  });

  const filteredDeliveries = deliveries.filter((d) => {
    if (deliveryFilter === 'all') return true;
    return d.paymentStatus === deliveryFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Sub-Tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Influencer Management & Deliverables</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Influencers & Creator Operations
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage contracted creators, monthly video target completion, product deliveries, and qualified payment approvals.
            </p>
          </div>

          {/* Month Selector for Influencer Operations */}
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 p-1.5 rounded-xl self-start md:self-auto">
            <Calendar className="w-4 h-4 text-indigo-400 ml-2" />
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

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            id="tab-inf-registration"
            onClick={() => setActiveSubTab('registration')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              activeSubTab === 'registration'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Influencers — Registration ({influencers.length})</span>
          </button>

          <button
            id="tab-inf-targets"
            onClick={() => setActiveSubTab('targets')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              activeSubTab === 'targets'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Target Tracking ({formatMonthName(activeMonth)})</span>
          </button>

          {(isAdmin || canAccess('viewProducts')) && (
            <button
              id="tab-inf-deliveries"
              onClick={() => setActiveSubTab('deliveries')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
                activeSubTab === 'deliveries'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Delivery Records ({deliveries.length})</span>
            </button>
          )}

          {(isAdmin || canAccess('viewPayments')) && (
            <button
              id="tab-inf-payments"
              onClick={() => setActiveSubTab('payments')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
                activeSubTab === 'payments'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Influencer Payments ({influencerPayments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ALL INFLUENCERS - REGISTRATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'registration' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search by name, TikTok @username, or niche..."
                  value={searchInf}
                  onChange={(e) => setSearchInf(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <select
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>

            {(isAdmin || canAccess('addInfluencers')) && (
              <button
                id="btn-add-influencer"
                onClick={() => {
                  setEditingInf(null);
                  setInfForm({
                    fullName: '',
                    tiktokUsername: '',
                    phoneNumber: '',
                    category: 'Fashion & Beauty',
                    targetVideosPerMonth: 4,
                    salary: 1200,
                    agreementStartDate: new Date().toISOString().split('T')[0],
                    agreementEndDate: '',
                    status: 'Active',
                    notes: '',
                  });
                  setShowAddInfModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Register Influencer</span>
              </button>
            )}
          </div>

          {/* Influencers Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Influencer Details</th>
                    <th className="py-3 px-4">Category / Niche</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4 text-center">Target Videos/Mo</th>
                    <th className="py-3 px-4 text-right">Monthly Salary</th>
                    <th className="py-3 px-4">Agreement Term</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal">
                  {filteredInfluencers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No influencers found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInfluencers.map((inf) => (
                      <tr key={inf.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{inf.fullName}</div>
                          <div className="text-[11px] text-indigo-400 flex items-center space-x-1 mt-0.5">
                            <span>@{inf.tiktokUsername}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                            {inf.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {inf.phoneNumber || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-white">
                          {inf.targetVideosPerMonth} videos
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                          {formatCurrency(inf.salary)}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          <div>Start: {inf.agreementStartDate}</div>
                          <div>End: {inf.agreementEndDate || 'Open ended'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {inf.status === 'Active' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          {(isAdmin || canAccess('updateInfluencers')) && (
                            <button
                              onClick={() => {
                                setEditingInf(inf);
                                setInfForm({
                                  fullName: inf.fullName,
                                  tiktokUsername: inf.tiktokUsername,
                                  phoneNumber: inf.phoneNumber,
                                  category: inf.category,
                                  targetVideosPerMonth: inf.targetVideosPerMonth,
                                  salary: inf.salary,
                                  agreementStartDate: inf.agreementStartDate,
                                  agreementEndDate: inf.agreementEndDate,
                                  status: inf.status,
                                  notes: inf.notes,
                                });
                                setShowAddInfModal(true);
                              }}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                              title="Edit Influencer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(isAdmin || canAccess('deleteInfluencers')) && (
                            <button
                              onClick={() => handleDeleteInfluencer(inf.id)}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                              title="Delete Influencer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ========================================================================= */}
      {/* 2. TARGET TRACKING */}
      {/* ========================================================================= */}
      {activeSubTab === 'targets' && (
        <div className="space-y-4">
          {/* Target Rules Callout */}
          <div className="p-4 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-xs text-indigo-200 flex items-start space-x-3">
            <Video className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-white">Monthly Video Target Rule: </span>
              Each month starts with new targets and completed videos while preserving historical performance. When an influencer reaches or exceeds their assigned target videos for {formatMonthName(activeMonth)}, the system automatically queues them in the monthly payment list awaiting approval.
            </div>
          </div>

          {/* Search & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search target by creator name..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center space-x-4 text-xs">
              <div className="text-slate-400">
                Period: <span className="font-semibold text-white">{formatMonthName(activeMonth)}</span>
              </div>
              <div className="text-slate-400">
                Total Targets: <span className="font-semibold text-white">{targets.length}</span>
              </div>
              <div className="text-emerald-400 font-semibold">
                Achieved: {targets.filter((t) => t.targetStatus === 'Reached').length}
              </div>
            </div>
          </div>

          {/* Target Tracking Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Influencer</th>
                    <th className="py-3 px-4 text-center">Target Videos</th>
                    <th className="py-3 px-4 text-center">Completed Videos</th>
                    <th className="py-3 px-4 text-center">Remaining Videos</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4 text-center">Target Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal">
                  {filteredTargets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No target tracking records found for {formatMonthName(activeMonth)}.
                      </td>
                    </tr>
                  ) : (
                    filteredTargets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{t.influencerName}</div>
                          <div className="text-[11px] text-slate-400">@{t.tiktokUsername} • {t.category}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-white text-sm">
                          {t.targetVideos}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center space-x-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                            <span className="font-bold text-sm text-indigo-300">{t.completedVideos}</span>
                            <button
                              onClick={() => handleQuickIncrementTarget(t)}
                              title="Quick +1 completed video"
                              className="w-5 h-5 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-300">
                          {t.remainingVideos}
                        </td>
                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-medium text-slate-300">{t.progressPercentage}%</span>
                            <span className="text-slate-500">{t.completedVideos}/{t.targetVideos}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                t.targetStatus === 'Reached'
                                  ? 'bg-emerald-500'
                                  : t.progressPercentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(100, t.progressPercentage)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {t.targetStatus === 'Reached' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                              <Check className="w-3 h-3 mr-0.5" /> Reached
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                              Not Reached
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenEditTarget(t)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                          >
                            Update Count
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELIVERY RECORDS */}
      {/* ========================================================================= */}
      {activeSubTab === 'deliveries' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Total Delivery Value</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {formatCurrency(deliverySummary.totalDeliveryValue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Across all product deliveries</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Total Paid Deliveries</div>
              <div className="text-xl font-bold text-emerald-400 tracking-tight">
                {formatCurrency(deliverySummary.totalPaidDeliveriesValue)}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1">
                {deliverySummary.totalPaidDeliveriesCount} shipments settled
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Total Unpaid Deliveries</div>
              <div className="text-xl font-bold text-amber-400 tracking-tight">
                {formatCurrency(deliverySummary.totalUnpaidDeliveriesValue)}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">
                {deliverySummary.totalUnpaidDeliveriesCount} pending payments
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-medium text-slate-400">Payment Status:</span>
              <select
                value={deliveryFilter}
                onChange={(e: any) => setDeliveryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Deliveries</option>
                <option value="Paid">Paid Only</option>
                <option value="Pending">Pending Only</option>
              </select>
            </div>

            {(isAdmin || canAccess('addProducts')) && (
              <button
                id="btn-add-delivery"
                onClick={() => {
                  if (influencers.length === 0) {
                    alert('Please register at least one influencer first.');
                    return;
                  }
                  setDeliveryForm({
                    influencerId: influencers[0].id,
                    productName: '',
                    quantity: 1,
                    deliveryPrice: 65,
                    deliveryDate: new Date().toISOString().split('T')[0],
                    paymentStatus: 'Pending',
                    notes: '',
                  });
                  setShowAddDeliveryModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Record Product Delivery</span>
              </button>
            )}
          </div>

          {/* Delivery Records Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Influencer</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Quantity</th>
                    <th className="py-3 px-4 text-right">Unit / Total Price</th>
                    <th className="py-3 px-4">Delivery Date</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal">
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No product delivery records recorded for {formatMonthName(activeMonth)}.
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {del.influencerName}
                        </td>
                        <td className="py-3.5 px-4 text-indigo-300 font-medium">
                          {del.productName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-white">
                          {del.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-semibold text-emerald-400">
                            {formatCurrency(del.deliveryPrice * del.quantity)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatCurrency(del.deliveryPrice)} each
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {del.deliveryDate}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            disabled={!isAdmin && !canAccess('updateProducts')}
                            onClick={() => handleToggleDeliveryPayment(del)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                              !isAdmin && !canAccess('updateProducts')
                                ? 'opacity-60 cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${
                              del.paymentStatus === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                            }`}
                            title={
                              !isAdmin && !canAccess('updateProducts')
                                ? 'Permission required to update delivery status'
                                : 'Click to toggle Paid / Pending'
                            }
                          >
                            {del.paymentStatus}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                          {del.notes || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {(isAdmin || canAccess('deleteProducts')) && (
                            <button
                              onClick={async () => {
                                if (confirm('Delete this delivery entry?')) {
                                  await api.deleteDelivery(del.id);
                                  await loadDeliveries();
                                }
                              }}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ========================================================================= */}
      {/* 4. INFLUENCER PAYMENTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'payments' && (
        <div className="space-y-4">
          {/* Rules Banner */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white">Payment Protocol: </span>
              Influencers are automatically added to this monthly payment list only when they complete their assigned monthly video target before month end. Sub-users may submit payment requests manually. Only Administrators can approve payments and mark them as paid.
            </div>

            <button
              id="btn-request-inf-payment"
              onClick={() => {
                if (influencers.length === 0) {
                  alert('No influencers available.');
                  return;
                }
                setPaymentRequestInfId(influencers[0].id);
                setPaymentRequestNotes('');
                setShowRequestPaymentModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Payment Request</span>
            </button>
          </div>

          {/* Payments Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Influencer Name</th>
                    <th className="py-3 px-4 text-right">Monthly Salary</th>
                    <th className="py-3 px-4 text-center">Completed / Target</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4">Authorized By</th>
                    <th className="py-3 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal">
                  {influencerPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No influencer payments queued for {formatMonthName(activeMonth)}.
                      </td>
                    </tr>
                  ) : (
                    influencerPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {p.influencerName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm">
                          {formatCurrency(p.monthlySalary)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-white">
                          {p.completedVideos} / {p.targetVideos}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {p.paymentStatus === 'Paid' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 mr-0.5" /> Paid
                            </span>
                          )}
                          {p.paymentStatus === 'Approved' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                              Approved
                            </span>
                          )}
                          {p.paymentStatus === 'Pending' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                              Pending Approval
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {p.paymentDate}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                          {p.notes || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          {p.approvedBy ? `Admin: ${p.approvedBy}` : p.submittedBy ? `Req: ${p.submittedBy}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdmin ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              {p.paymentStatus === 'Pending' && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(p.id, 'Approved')}
                                  disabled={paymentActionLoading === p.id}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition"
                                >
                                  Approve
                                </button>
                              )}
                              {p.paymentStatus !== 'Paid' && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(p.id, 'Paid')}
                                  disabled={paymentActionLoading === p.id}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition"
                                >
                                  Mark as Paid
                                </button>
                              )}
                              {p.paymentStatus === 'Paid' && (
                                <span className="text-[11px] text-emerald-400 font-medium">Settled</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Admin Approval Required</span>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER / EDIT INFLUENCER */}
      {/* ========================================================================= */}
      {showAddInfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-100 my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>{editingInf ? 'Edit Influencer Profile' : 'Register New Influencer'}</span>
              </h3>
              <button
                onClick={() => setShowAddInfModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInfluencer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jessica Miller"
                  value={infForm.fullName}
                  onChange={(e) => setInfForm({ ...infForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">TikTok Username *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 text-xs">@</span>
                    <input
                      type="text"
                      required
                      placeholder="jessicavibes"
                      value={infForm.tiktokUsername}
                      onChange={(e) => setInfForm({ ...infForm, tiktokUsername: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    value={infForm.phoneNumber}
                    onChange={(e) => setInfForm({ ...infForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category / Niche</label>
                  <input
                    type="text"
                    placeholder="e.g. Lifestyle, Tech, Beauty"
                    value={infForm.category}
                    onChange={(e) => setInfForm({ ...infForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={infForm.status}
                    onChange={(e: any) => setInfForm({ ...infForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Videos Per Month *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={infForm.targetVideosPerMonth}
                    onChange={(e) => setInfForm({ ...infForm, targetVideosPerMonth: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Salary (USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={infForm.salary}
                    onChange={(e) => setInfForm({ ...infForm, salary: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agreement Start Date</label>
                  <input
                    type="date"
                    value={infForm.agreementStartDate}
                    onChange={(e) => setInfForm({ ...infForm, agreementStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agreement End Date</label>
                  <input
                    type="date"
                    value={infForm.agreementEndDate}
                    onChange={(e) => setInfForm({ ...infForm, agreementEndDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes & Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Contract terms, deliverables specifications..."
                  value={infForm.notes}
                  onChange={(e) => setInfForm({ ...infForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddInfModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-influencer-submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  {editingInf ? 'Update Profile' : 'Save Influencer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPDATE COMPLETED VIDEOS */}
      {/* ========================================================================= */}
      {showEditTargetModal && selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Video className="w-5 h-5 text-indigo-400" />
                <span>Update Target for {selectedTarget.influencerName}</span>
              </h3>
              <button
                onClick={() => setShowEditTargetModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-800 text-xs space-y-1">
                <div className="text-slate-400">Target for {formatMonthName(selectedTarget.month)}:</div>
                <div className="text-white font-bold text-sm">{selectedTarget.targetVideos} Videos Contracted</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Completed Videos Delivered
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={targetCompletedInput}
                  onChange={(e) => setTargetCompletedInput(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tracking Notes & Video Links
                </label>
                <textarea
                  rows={3}
                  value={targetNotesInput}
                  onChange={(e) => setTargetNotesInput(e.target.value)}
                  placeholder="Paste TikTok video URLs or verification notes..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditTargetModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD PRODUCT DELIVERY */}
      {/* ========================================================================= */}
      {showAddDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <span>Record Product Delivery</span>
              </h3>
              <button
                onClick={() => setShowAddDeliveryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Influencer Recipient *</label>
                <select
                  required
                  value={deliveryForm.influencerId}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, influencerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {influencers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.fullName} (@{i.tiktokUsername})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Pro Earbuds Edition"
                  value={deliveryForm.productName}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, productName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={deliveryForm.quantity}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Delivery Price (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={deliveryForm.deliveryPrice}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryForm.deliveryDate}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Payment Status</label>
                  <select
                    value={deliveryForm.paymentStatus}
                    onChange={(e: any) => setDeliveryForm({ ...deliveryForm, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Delivery / Tracking Notes</label>
                <textarea
                  rows={2}
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                  placeholder="Tracking code, courier details..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeliveryModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  Save Delivery Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT PAYMENT REQUEST */}
      {/* ========================================================================= */}
      {showRequestPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span>Submit Monthly Payment Request</span>
              </h3>
              <button
                onClick={() => setShowRequestPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPaymentRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Influencer</label>
                <select
                  required
                  value={paymentRequestInfId}
                  onChange={(e) => setPaymentRequestInfId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {influencers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.fullName} — Salary: {formatCurrency(i.salary)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Operating Month</label>
                <input
                  type="text"
                  disabled
                  value={formatMonthName(activeMonth)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Justification / Notes</label>
                <textarea
                  rows={3}
                  value={paymentRequestNotes}
                  onChange={(e) => setPaymentRequestNotes(e.target.value)}
                  placeholder="Verification details, invoice references..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRequestPaymentModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
