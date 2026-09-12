import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Billboard, BillboardPayment } from '../types';
import { formatCurrency, formatMonthName } from '../lib/formatters';
import {
  Tv,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';

export const BillboardsView: React.FC = () => {
  const { activeMonth, availableMonths, setActiveMonth, isAdmin } = useAuth();
  const [subTab, setSubTab] = useState<'inventory' | 'payments'>('inventory');

  // Inventory State
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<Billboard | null>(null);

  const [form, setForm] = useState({
    vendorName: '',
    billboardSize: '14x48 ft',
    location: '',
    productBrand: '',
    rentalPrice: 3500,
    agreementStartDate: new Date().toISOString().split('T')[0],
    agreementEndDate: '',
    status: 'Active' as 'Active' | 'Inactive',
    notes: '',
  });

  // Payments State
  const [payments, setPayments] = useState<BillboardPayment[]>([]);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    billboardId: '',
    vendorName: '',
    amount: 3500,
    date: new Date().toISOString().split('T')[0],
    paymentStatus: 'Pending' as 'Pending' | 'Approved' | 'Paid',
    notes: '',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBillboards = async () => {
    try {
      const res = await api.getBillboards();
      setBillboards(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await api.getBillboardPayments(activeMonth);
      setPayments(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBillboards();
    loadPayments();
  }, [activeMonth]);

  const handleSaveBillboard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBillboard) {
        await api.updateBillboard(editingBillboard.id, form);
      } else {
        await api.createBillboard(form);
      }
      setShowAddModal(false);
      setEditingBillboard(null);
      setForm({
        vendorName: '',
        billboardSize: '14x48 ft',
        location: '',
        productBrand: '',
        rentalPrice: 3500,
        agreementStartDate: new Date().toISOString().split('T')[0],
        agreementEndDate: '',
        status: 'Active',
        notes: '',
      });
      await loadBillboards();
    } catch (err: any) {
      alert(err.message || 'Failed to save billboard');
    }
  };

  const handleDeleteBillboard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billboard?')) return;
    try {
      await api.deleteBillboard(id);
      await loadBillboards();
    } catch (err: any) {
      alert(err.message || 'Failed to delete billboard');
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBillboardPayment({
        ...paymentForm,
        month: activeMonth,
      });
      setShowAddPaymentModal(false);
      setPaymentForm({
        billboardId: '',
        vendorName: '',
        amount: 3500,
        date: new Date().toISOString().split('T')[0],
        paymentStatus: 'Pending',
        notes: '',
      });
      await loadPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to record billboard payment');
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: 'Approved' | 'Paid') => {
    setActionLoading(paymentId);
    try {
      await api.updateBillboardPaymentStatus(paymentId, { status });
      await loadPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBillboards = billboards.filter((b) => {
    const matchesSearch =
      b.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()) ||
      b.productBrand.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">
              <Tv className="w-3.5 h-3.5" />
              <span>Outdoor Media Advertising</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Billboard Management & Rental Payments
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track vendor leases, highway placements, brand assets, and lease settlements for{' '}
              <span className="text-slate-200 font-medium">{formatMonthName(activeMonth)}</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 p-1.5 rounded-xl self-start md:self-auto">
            <Calendar className="w-4 h-4 text-purple-400 ml-2" />
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

        {/* Sub tabs */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-800">
          <button
            id="tab-billboard-inventory"
            onClick={() => setSubTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              subTab === 'inventory'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Billboards Directory ({billboards.length})</span>
          </button>

          <button
            id="tab-billboard-payments"
            onClick={() => setSubTab('payments')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              subTab === 'payments'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Rental Payments ({payments.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. INVENTORY */}
      {/* ========================================================================= */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search by vendor, location, or brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>

            <button
              id="btn-add-billboard"
              onClick={() => {
                setEditingBillboard(null);
                setForm({
                  vendorName: '',
                  billboardSize: '14x48 ft',
                  location: '',
                  productBrand: '',
                  rentalPrice: 3500,
                  agreementStartDate: new Date().toISOString().split('T')[0],
                  agreementEndDate: '',
                  status: 'Active',
                  notes: '',
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register Billboard</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Vendor & Brand</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Billboard Size</th>
                    <th className="py-3 px-4 text-right">Monthly Rental Price</th>
                    <th className="py-3 px-4">Agreement Term</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal">
                  {filteredBillboards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No billboards registered matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBillboards.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{b.vendorName}</div>
                          <div className="text-[11px] text-purple-300 mt-0.5">Campaign: {b.productBrand}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 flex items-center space-x-1.5 pt-4">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{b.location}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {b.billboardSize}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm">
                          {formatCurrency(b.rentalPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          <div>Start: {b.agreementStartDate}</div>
                          <div>End: {b.agreementEndDate || 'Open ended'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {b.status === 'Active' ? (
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
                          <button
                            onClick={() => {
                              setEditingBillboard(b);
                              setForm({
                                vendorName: b.vendorName,
                                billboardSize: b.billboardSize,
                                location: b.location,
                                productBrand: b.productBrand,
                                rentalPrice: b.rentalPrice,
                                agreementStartDate: b.agreementStartDate,
                                agreementEndDate: b.agreementEndDate,
                                status: b.status,
                                notes: b.notes,
                              });
                              setShowAddModal(true);
                            }}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteBillboard(b.id)}
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
      {/* 2. BILLBOARD PAYMENTS */}
      {/* ========================================================================= */}
      {subTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white">Billboard Lease Settlements: </span>
              Sub-users can log payment requests for vendors; Administrators can review, approve, and record payments as paid.
            </div>

            <button
              id="btn-add-billboard-payment"
              onClick={() => {
                if (billboards.length === 0) {
                  alert('Please register at least one billboard first.');
                  return;
                }
                const first = billboards[0];
                setPaymentForm({
                  billboardId: first.id,
                  vendorName: first.vendorName,
                  amount: first.rentalPrice,
                  date: new Date().toISOString().split('T')[0],
                  paymentStatus: 'Pending',
                  notes: '',
                });
                setShowAddPaymentModal(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Record Rental Payment</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Vendor Name</th>
                    <th className="py-3 px-4 text-right">Payment Amount</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No billboard rental payments recorded for {formatMonthName(activeMonth)}.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {p.vendorName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {p.date}
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
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                          {p.notes || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdmin ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              {p.paymentStatus === 'Pending' && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(p.id, 'Approved')}
                                  disabled={actionLoading === p.id}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition"
                                >
                                  Approve
                                </button>
                              )}
                              {p.paymentStatus !== 'Paid' && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(p.id, 'Paid')}
                                  disabled={actionLoading === p.id}
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

      {/* MODAL: ADD / EDIT BILLBOARD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-100 my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Tv className="w-5 h-5 text-purple-400" />
                <span>{editingBillboard ? 'Edit Billboard' : 'Register Billboard'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillboard} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Clear Channel / Outfront"
                    value={form.vendorName}
                    onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Product / Brand Campaign *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Echo Earbuds Pro"
                    value={form.productBrand}
                    onChange={(e) => setForm({ ...form, productBrand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Location / Highway / Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Interstate 95 North Exit 42"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Billboard Size</label>
                  <input
                    type="text"
                    placeholder="14x48 ft / Bulletin"
                    value={form.billboardSize}
                    onChange={(e) => setForm({ ...form, billboardSize: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Rental Price (USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={form.rentalPrice}
                    onChange={(e) => setForm({ ...form, rentalPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agreement Start Date</label>
                  <input
                    type="date"
                    value={form.agreementStartDate}
                    onChange={(e) => setForm({ ...form, agreementStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agreement End Date</label>
                  <input
                    type="date"
                    value={form.agreementEndDate}
                    onChange={(e) => setForm({ ...form, agreementEndDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e: any) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes & Specifications</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Illumination details, print specs, contract ID..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  {editingBillboard ? 'Update Billboard' : 'Save Billboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BILLBOARD PAYMENT */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <span>Record Billboard Payment</span>
              </h3>
              <button onClick={() => setShowAddPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Billboard</label>
                <select
                  value={paymentForm.billboardId}
                  onChange={(e) => {
                    const sel = billboards.find((b) => b.id === e.target.value);
                    setPaymentForm({
                      ...paymentForm,
                      billboardId: e.target.value,
                      vendorName: sel ? sel.vendorName : '',
                      amount: sel ? sel.rentalPrice : paymentForm.amount,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                >
                  {billboards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.vendorName} — {b.location} ({formatCurrency(b.rentalPrice)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  value={paymentForm.vendorName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, vendorName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Amount (USD) *</label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Status</label>
                <select
                  value={paymentForm.paymentStatus}
                  onChange={(e: any) => setPaymentForm({ ...paymentForm, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                >
                  <option value="Pending">Pending Approval</option>
                  {isAdmin && <option value="Approved">Approved</option>}
                  {isAdmin && <option value="Paid">Paid</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Invoice / Notes</label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Invoice number, payment method reference..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  Save Payment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
