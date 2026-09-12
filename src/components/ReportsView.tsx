import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatCurrency, formatMonthName, exportDataToExcel } from '../lib/formatters';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  BarChart3,
  Users,
  Tv,
  MonitorPlay,
  Wallet,
  CreditCard,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { activeMonth, availableMonths, setActiveMonth } = useAuth();
  const [reportType, setReportType] = useState<string>('operations');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportTypes = [
    { id: 'operations', label: '7. Monthly Marketing Operations Report', icon: Building2 },
    { id: 'influencer_performance', label: '1. Influencer Performance Report', icon: Users },
    { id: 'influencer_payments', label: '2. Influencer Payment Report', icon: CreditCard },
    { id: 'billboards', label: '3. Billboard Report', icon: Tv },
    { id: 'lcd_screens', label: '4. LCD Screen Report', icon: MonitorPlay },
    { id: 'budget_expenses', label: '5. Budget and Expense Report', icon: Wallet },
    { id: 'payments', label: '6. Payment Report', icon: FileSpreadsheet },
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.getReport({
        type: reportType,
        month: activeMonth,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReportData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, activeMonth]);

  const handleExportExcel = () => {
    if (!reportData) return;

    let exportRows: any[] = [];
    let filename = `marketing_${reportType}_${activeMonth}`;

    if (reportType === 'influencer_performance') {
      exportRows = (reportData.data || []).map((t: any) => ({
        'Influencer': t.influencerName,
        'TikTok': `@${t.tiktokUsername}`,
        'Category': t.category,
        'Target Videos': t.targetVideos,
        'Completed Videos': t.completedVideos,
        'Remaining Videos': t.remainingVideos,
        'Completion Rate %': `${t.progressPercentage}%`,
        'Target Status': t.targetStatus,
      }));
    } else if (reportType === 'influencer_payments') {
      exportRows = (reportData.data || []).map((p: any) => ({
        'Influencer': p.influencerName,
        'Monthly Salary ($)': p.monthlySalary,
        'Target Videos': p.targetVideos,
        'Completed Videos': p.completedVideos,
        'Payment Status': p.paymentStatus,
        'Payment Date': p.paymentDate,
        'Notes': p.notes,
      }));
    } else if (reportType === 'billboards') {
      exportRows = (reportData.data || []).map((b: any) => ({
        'Vendor': b.vendorName,
        'Location': b.location,
        'Size': b.billboardSize,
        'Brand Campaign': b.productBrand,
        'Monthly Rental ($)': b.rentalPrice,
        'Status': b.status,
        'Agreement Term': `${b.agreementStartDate} to ${b.agreementEndDate || 'Open'}`,
      }));
    } else if (reportType === 'lcd_screens') {
      exportRows = (reportData.data || []).map((s: any) => ({
        'Vendor': s.vendorName,
        'Location': s.location,
        'Screen Size': s.screenSize,
        'Resolution': s.resolution,
        'Brand Campaign': s.productBrand,
        'Monthly Rental ($)': s.rentalPrice,
        'Status': s.status,
      }));
    } else if (reportType === 'budget_expenses') {
      exportRows = (reportData.expenses || []).map((e: any) => ({
        'Date': e.date,
        'Budget Pool': e.budgetPool,
        'Category': e.category,
        'Description': e.description,
        'Amount ($)': e.amount,
        'Logged By': e.createdBy,
        'Notes': e.notes,
      }));
    } else if (reportType === 'payments') {
      exportRows = (reportData.data || []).map((p: any) => ({
        'Channel / Source': p.sourceType,
        'Recipient / Vendor': p.recipient,
        'Category': p.category,
        'Amount ($)': p.amount,
        'Date': p.date,
        'Status': p.status,
        'Notes': p.notes,
      }));
    } else if (reportType === 'operations') {
      exportRows = [
        { 'Metric': 'Operating Month', 'Value': reportData.month },
        { 'Metric': 'Total Marketing Budget', 'Value': reportData.totalMarketingBudget },
        { 'Metric': 'Total Budget Spent', 'Value': reportData.totalBudgetSpent },
        { 'Metric': 'Remaining Marketing Budget', 'Value': reportData.remainingBudget },
        { 'Metric': 'Total Pending Payments', 'Value': reportData.totalPendingPayments },
        { 'Metric': 'Total Paid Payments', 'Value': reportData.totalPaidPayments },
        { 'Metric': 'Active Influencers', 'Value': reportData.activeInfluencers },
        { 'Metric': 'Influencers Target Achieved', 'Value': reportData.influencersWhoReachedTarget },
        { 'Metric': 'Active Billboards', 'Value': reportData.activeBillboards },
        { 'Metric': 'Active LCD Screens', 'Value': reportData.activeLCDScreens },
        { 'Metric': 'Monthly Expenses Posted', 'Value': reportData.monthlyExpenses },
      ];
    }

    exportDataToExcel(filename, exportRows, reportType);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Compliance, Auditing & Exports</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Reports & Operational Statements
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Generate executive statements, filter by operational periods, and export to Excel or formatted printouts.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center space-x-2.5 self-start md:self-auto">
            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to Excel (.xlsx)</span>
            </button>

            <button
              id="btn-print-report"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Report Selector & Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
            >
              {reportTypes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Operational Month</label>
            <select
              value={activeMonth}
              onChange={(e) => setActiveMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthName(m)} ({m})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Custom Date Range (Optional)</label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Canvas / Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Report Header for Print & Display */}
        <div className="border-b border-slate-800 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
              Marketing Operations Management System
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
              {reportTypes.find((r) => r.id === reportType)?.label}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Period: <span className="text-slate-200 font-medium">{formatMonthName(activeMonth)}</span> • Generated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Confidential Enterprise Data</div>
            <div className="text-slate-500 text-[11px]">Audit Compliant</div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Generating report statement...</div>
        ) : !reportData ? (
          <div className="py-16 text-center text-slate-500">No report data generated.</div>
        ) : (
          <div>
            {/* 1. Monthly Operations Summary */}
            {reportType === 'operations' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400">Total Marketing Budget</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {formatCurrency(reportData.totalMarketingBudget)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400">Budget Spent</div>
                    <div className="text-lg font-bold text-rose-400 mt-1">
                      {formatCurrency(reportData.totalBudgetSpent)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400">Remaining Budget</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {formatCurrency(reportData.remainingBudget)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400">Total Pending Payments</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">
                      {formatCurrency(reportData.totalPendingPayments)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Metric Title</th>
                        <th className="py-3 px-4 text-right">Value / Metric Count</th>
                        <th className="py-3 px-4">Operational Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Active Contracted Influencers</td>
                        <td className="py-3 px-4 text-right font-bold text-white">{reportData.activeInfluencers}</td>
                        <td className="py-3 px-4 text-slate-400">Social Media & Creators</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Influencers Reaching Target</td>
                        <td className="py-3 px-4 text-right font-bold text-teal-300">{reportData.influencersWhoReachedTarget}</td>
                        <td className="py-3 px-4 text-slate-400">Target Attainment</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Active Billboards in Flight</td>
                        <td className="py-3 px-4 text-right font-bold text-white">{reportData.activeBillboards}</td>
                        <td className="py-3 px-4 text-slate-400">Outdoor Placements</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Active LCD Digital Screens</td>
                        <td className="py-3 px-4 text-right font-bold text-white">{reportData.activeLCDScreens}</td>
                        <td className="py-3 px-4 text-slate-400">Digital Networks</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-white">Monthly Expenses Posted to Ledger</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-400">{formatCurrency(reportData.monthlyExpenses)}</td>
                        <td className="py-3 px-4 text-slate-400">Operational Incurred</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. Influencer Performance */}
            {reportType === 'influencer_performance' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Influencer</th>
                      <th className="py-3 px-4">TikTok Handle</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Target Videos</th>
                      <th className="py-3 px-4 text-center">Completed</th>
                      <th className="py-3 px-4 text-center">Remaining</th>
                      <th className="py-3 px-4 text-center">Progress %</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(reportData.data || []).map((row: any) => (
                      <tr key={row.id}>
                        <td className="py-3 px-4 font-semibold text-white">{row.influencerName}</td>
                        <td className="py-3 px-4 text-indigo-400">@{row.tiktokUsername}</td>
                        <td className="py-3 px-4 text-slate-400">{row.category}</td>
                        <td className="py-3 px-4 text-center font-bold text-white">{row.targetVideos}</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-300">{row.completedVideos}</td>
                        <td className="py-3 px-4 text-center text-slate-400">{row.remainingVideos}</td>
                        <td className="py-3 px-4 text-center font-bold">{row.progressPercentage}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.targetStatus === 'Reached' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {row.targetStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Influencer Payments */}
            {reportType === 'influencer_payments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Influencer</th>
                      <th className="py-3 px-4 text-right">Monthly Salary</th>
                      <th className="py-3 px-4 text-center">Target Completion</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(reportData.data || []).map((row: any) => (
                      <tr key={row.id}>
                        <td className="py-3 px-4 font-semibold text-white">{row.influencerName}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(row.monthlySalary)}</td>
                        <td className="py-3 px-4 text-center">{row.completedVideos} / {row.targetVideos}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {row.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{row.paymentDate}</td>
                        <td className="py-3 px-4 text-slate-400">{row.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Billboards */}
            {reportType === 'billboards' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Brand</th>
                      <th className="py-3 px-4 text-right">Monthly Rental</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(reportData.data || []).map((row: any) => (
                      <tr key={row.id}>
                        <td className="py-3 px-4 font-semibold text-white">{row.vendorName}</td>
                        <td className="py-3 px-4 text-slate-300">{row.location}</td>
                        <td className="py-3 px-4 text-slate-400">{row.billboardSize}</td>
                        <td className="py-3 px-4 text-purple-300">{row.productBrand}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(row.rentalPrice)}</td>
                        <td className="py-3 px-4 text-center">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. LCD Screens */}
            {reportType === 'lcd_screens' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Size & Res</th>
                      <th className="py-3 px-4">Brand</th>
                      <th className="py-3 px-4 text-right">Monthly Rental</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(reportData.data || []).map((row: any) => (
                      <tr key={row.id}>
                        <td className="py-3 px-4 font-semibold text-white">{row.vendorName}</td>
                        <td className="py-3 px-4 text-slate-300">{row.location}</td>
                        <td className="py-3 px-4 text-slate-400">{row.screenSize} ({row.resolution})</td>
                        <td className="py-3 px-4 text-cyan-300">{row.productBrand}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(row.rentalPrice)}</td>
                        <td className="py-3 px-4 text-center">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. Budget & Expenses */}
            {reportType === 'budget_expenses' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400">Total Budget</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {formatCurrency(reportData.budget?.totalBudget || 0)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400">Total Expenses Posted</div>
                    <div className="text-lg font-bold text-rose-400 mt-1">
                      {formatCurrency(reportData.totalExpenses || 0)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400">Net Headroom Remaining</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {formatCurrency(reportData.remainingBudget || 0)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Budget Pool</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4">Logged By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(reportData.expenses || []).map((e: any) => (
                        <tr key={e.id}>
                          <td className="py-3 px-4 text-slate-400">{e.date}</td>
                          <td className="py-3 px-4 font-semibold text-white">{e.budgetPool}</td>
                          <td className="py-3 px-4 text-slate-300">{e.category}</td>
                          <td className="py-3 px-4 text-white font-medium">{e.description}</td>
                          <td className="py-3 px-4 text-right font-bold text-rose-400">{formatCurrency(e.amount)}</td>
                          <td className="py-3 px-4 text-slate-400">{e.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. Payments Report */}
            {reportType === 'payments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Channel / Type</th>
                      <th className="py-3 px-4">Recipient / Vendor</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(reportData.data || []).map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4 font-semibold text-white">{p.sourceType}</td>
                        <td className="py-3 px-4 text-slate-200">{p.recipient}</td>
                        <td className="py-3 px-4 text-slate-400">{p.category}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(p.amount)}</td>
                        <td className="py-3 px-4 text-slate-400">{p.date}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
