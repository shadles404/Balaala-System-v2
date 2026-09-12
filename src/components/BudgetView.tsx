import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MonthlyBudget, Expense } from '../types';
import { formatCurrency, formatMonthName } from '../lib/formatters';
import {
  Wallet,
  Plus,
  Search,
  DollarSign,
  CreditCard,
  Lock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingDown,
  Trash2,
  X,
  ShieldAlert,
} from 'lucide-react';

export const BudgetView: React.FC = () => {
  const { activeMonth, availableMonths, setActiveMonth, isAdmin, user, canAccess } = useAuth();
  const [subTab, setSubTab] = useState<'budget' | 'expenses'>('budget');

  // Budget State
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    localBudget: 25000,
    internationalBudget: 15000,
    notes: '',
  });
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetSaveSuccess, setBudgetSaveSuccess] = useState(false);

  // Expenses State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [filterPool, setFilterPool] = useState<'all' | 'Local' | 'International'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchDesc, setSearchDesc] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    budgetPool: 'Local' as 'Local' | 'International' | '',
    category: 'Influencers' as 'Influencers' | 'Billboards' | 'LCD Screens' | 'Other',
    description: '',
    amount: 500,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const canEditBudget = isAdmin || canAccess('manageCampaigns');
  const canAddExpense = isAdmin || canAccess('addExpenses');
  const canDeleteExpense = isAdmin || canAccess('deleteExpenses');

  const loadBudget = async () => {
    try {
      const res = await api.getBudget(activeMonth);
      setBudget(res);
      setBudgetForm({
        localBudget: res.localBudget,
        internationalBudget: res.internationalBudget,
        notes: res.notes || '',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadExpenses = async () => {
    try {
      const res = await api.getExpenses(activeMonth);
      setExpenses(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBudget();
    loadExpenses();
  }, [activeMonth]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditBudget) {
      alert('Permission Denied: Only Administrators or users with budget edit authority can modify the budget.');
      return;
    }

    setIsSavingBudget(true);
    setBudgetSaveSuccess(false);
    try {
      const totalBudget = Number(budgetForm.localBudget) + Number(budgetForm.internationalBudget);
      const res = await api.saveBudget({
        month: activeMonth,
        totalBudget,
        localBudget: Number(budgetForm.localBudget),
        internationalBudget: Number(budgetForm.internationalBudget),
        notes: budgetForm.notes,
      });
      setBudget(res);
      setBudgetSaveSuccess(true);
      setTimeout(() => setBudgetSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save monthly budget');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.budgetPool) {
      alert('Validation Error: You MUST select a budget pool (Local or International).');
      return;
    }
    if (!expenseForm.amount || expenseForm.amount <= 0) {
      alert('Validation Error: Expense amount must be greater than zero.');
      return;
    }

    try {
      await api.createExpense({
        ...expenseForm,
        month: activeMonth,
      });
      setShowAddExpenseModal(false);
      setExpenseForm({
        budgetPool: 'Local',
        category: 'Influencers',
        description: '',
        amount: 500,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      await loadExpenses();
      await loadBudget();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.deleteExpense(id);
      await loadExpenses();
      await loadBudget();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  // Calculations
  const localExpenses = expenses
    .filter((e) => e.budgetPool === 'Local')
    .reduce((sum, e) => sum + e.amount, 0);

  const internationalExpenses = expenses
    .filter((e) => e.budgetPool === 'International')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBudget = (budget?.localBudget || 0) + (budget?.internationalBudget || 0);
  const totalSpent = localExpenses + internationalExpenses;
  const totalRemaining = totalBudget - totalSpent;

  const localRemaining = (budget?.localBudget || 0) - localExpenses;
  const intlRemaining = (budget?.internationalBudget || 0) - internationalExpenses;

  const filteredExpenses = expenses.filter((e) => {
    const matchesPool = filterPool === 'all' || e.budgetPool === filterPool;
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    const matchesSearch =
      e.description.toLowerCase().includes(searchDesc.toLowerCase()) ||
      e.notes.toLowerCase().includes(searchDesc.toLowerCase());
    return matchesPool && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
              <Wallet className="w-3.5 h-3.5" />
              <span>Capital & Operational Expenditure</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Marketing Budget & Expense Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Allocate capital to Local and International pools, track expenditure deductions, and safeguard financial health for{' '}
              <span className="text-slate-200 font-medium">{formatMonthName(activeMonth)}</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 p-1.5 rounded-xl self-start md:self-auto">
            <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
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
            id="tab-budget-allocation"
            onClick={() => setSubTab('budget')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              subTab === 'budget'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Monthly Budget Pools ({formatCurrency(totalBudget)})</span>
          </button>

          <button
            id="tab-expense-ledger"
            onClick={() => setSubTab('expenses')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
              subTab === 'expenses'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Expense Ledger ({expenses.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. BUDGET MANAGEMENT */}
      {/* ========================================================================= */}
      {subTab === 'budget' && (
        <div className="space-y-6">
          {/* Permission Notice */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
              canEditBudget
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-200'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-white">Budget Governance Policy: </span>
              Total Marketing Budget, Local Budget, and International Budget allocations can only be modified by Administrators or users with explicit budget permissions.
              {!canEditBudget && (
                <span className="block mt-1 text-amber-300 font-semibold">
                  You are viewing in read-only mode. Contact an Administrator to adjust allocations.
                </span>
              )}
            </div>
          </div>

          {/* Real-time Pool Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Budget */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">Total Marketing Budget</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-bold">
                  Combined
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(totalBudget)}
              </div>
              <div className="mt-3 text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="text-rose-400 font-medium">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(totalRemaining)}</span>
                </div>
              </div>
            </div>

            {/* Local Budget Pool */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">Local Marketing Pool</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[11px] font-bold">
                  Domestic
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(budget?.localBudget || 0)}
              </div>
              <div className="mt-3 text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Local Expenses:</span>
                  <span className="text-rose-400 font-medium">{formatCurrency(localExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Local:</span>
                  <span className="text-blue-400 font-bold">{formatCurrency(localRemaining)}</span>
                </div>
              </div>
            </div>

            {/* International Budget Pool */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">International Marketing Pool</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[11px] font-bold">
                  Global
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(budget?.internationalBudget || 0)}
              </div>
              <div className="mt-3 text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Intl Expenses:</span>
                  <span className="text-rose-400 font-medium">{formatCurrency(internationalExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Intl:</span>
                  <span className="text-indigo-400 font-bold">{formatCurrency(intlRemaining)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Budget Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Configure Monthly Budget Allocations</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Setting new allocations automatically updates the operational headroom for {formatMonthName(activeMonth)}.
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Local Marketing Budget (USD)
                  </label>
                  <input
                    id="input-local-budget"
                    type="number"
                    min="0"
                    step="100"
                    disabled={!canEditBudget}
                    value={budgetForm.localBudget}
                    onChange={(e) => setBudgetForm({ ...budgetForm, localBudget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-semibold disabled:opacity-50 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    International Marketing Budget (USD)
                  </label>
                  <input
                    id="input-intl-budget"
                    type="number"
                    min="0"
                    step="100"
                    disabled={!canEditBudget}
                    value={budgetForm.internationalBudget}
                    onChange={(e) => setBudgetForm({ ...budgetForm, internationalBudget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-semibold disabled:opacity-50 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Calculated Combined Total Budget:</span>
                <span className="text-white font-bold text-base">
                  {formatCurrency(Number(budgetForm.localBudget) + Number(budgetForm.internationalBudget))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Budget Allocation Notes</label>
                <textarea
                  rows={2}
                  disabled={!canEditBudget}
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  placeholder="Strategic notes, board approvals, quarterly campaign targets..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs disabled:opacity-50 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {canEditBudget && (
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    id="btn-save-budget"
                    disabled={isSavingBudget}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingBudget ? 'Saving Allocations...' : 'Save & Publish Budget'}</span>
                  </button>
                  {budgetSaveSuccess && (
                    <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Budget successfully updated!</span>
                    </span>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXPENSE LEDGER */}
      {/* ========================================================================= */}
      {subTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  placeholder="Search expense description or notes..."
                  value={searchDesc}
                  onChange={(e) => setSearchDesc(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <select
                value={filterPool}
                onChange={(e: any) => setFilterPool(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Pools</option>
                <option value="Local">Local Pool Only</option>
                <option value="International">International Pool Only</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e: any) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Influencers">Influencers</option>
                <option value="Billboards">Billboards</option>
                <option value="LCD Screens">LCD Screens</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {canAddExpense && (
              <button
                id="btn-add-expense"
                onClick={() => {
                  setExpenseForm({
                    budgetPool: 'Local',
                    category: 'Influencers',
                    description: '',
                    amount: 500,
                    date: new Date().toISOString().split('T')[0],
                    notes: '',
                  });
                  setShowAddExpenseModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Record Expense</span>
              </button>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Budget Pool</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount (USD)</th>
                    <th className="py-3 px-4">Logged By</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No expenses logged matching criteria for {formatMonthName(activeMonth)}.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {exp.date}
                        </td>
                        <td className="py-3.5 px-4">
                          {exp.budgetPool === 'Local' ? (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                              Local
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold">
                              International
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {exp.description}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-400 text-sm">
                          -{formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          {exp.createdBy}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                          {exp.notes || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {canDeleteExpense && (
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                              title="Delete Expense"
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

      {/* MODAL: ADD EXPENSE */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Record Operational Expense</span>
              </h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Budget Pool <span className="text-rose-400">* (Required)</span>
                </label>
                <select
                  required
                  value={expenseForm.budgetPool}
                  onChange={(e: any) => setExpenseForm({ ...expenseForm, budgetPool: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Select Budget Pool --</option>
                  <option value="Local">Local Budget Pool</option>
                  <option value="International">International Budget Pool</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Expense Category <span className="text-rose-400">* (Required)</span>
                </label>
                <select
                  required
                  value={expenseForm.category}
                  onChange={(e: any) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Influencers">Influencers</option>
                  <option value="Billboards">Billboards</option>
                  <option value="LCD Screens">LCD Screens</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TikTok Paid Video Creator Deliverable"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Amount (USD) *</label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Receipt / Invoice Notes</label>
                <textarea
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Receipt ID, vendor invoice reference..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  Post Expense to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
