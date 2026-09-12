import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, UserPermissions } from '../types';
import { getAllPermissionsTrue, getDefaultSubUserPermissions } from '../services/firebaseService';
import { formatMonthName } from '../lib/formatters';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  Lock,
  User as UserIcon,
  CheckCircle2,
  Calendar,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  Power,
  Check,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user: currentUser, isAdmin, activeMonth, availableMonths, setActiveMonth, refreshMonths, startNewMonth } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);

  const initialPermissions = getDefaultSubUserPermissions();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    role: 'sub_user' as 'admin' | 'sub_user',
    status: 'active' as 'active' | 'inactive',
    permissions: initialPermissions,
  });

  // Month Period State
  const [newMonthInput, setNewMonthInput] = useState('');
  const [isStartingMonth, setIsStartingMonth] = useState(false);

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res);
    } catch (e) {
      console.error('[Firestore] Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isAdmin]);

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id || targetUser.email === 'balaalabc@gmail.com') {
      alert('You cannot deactivate the primary active administrator account.');
      return;
    }

    const nextStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    setStatusActionLoading(targetUser.id);
    try {
      await api.updateUser(targetUser.id, { status: nextStatus });
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          fullName: form.fullName.trim(),
          status: form.status,
          role: form.role,
          permissions: form.role === 'admin' ? getAllPermissionsTrue() : form.permissions,
        });
      } else {
        if (!form.email || !form.email.includes('@')) {
          alert('A valid email address is required.');
          return;
        }

        if (form.password && form.password.trim().length > 0 && form.password.trim().length < 6) {
          alert('Password must be at least 6 characters.');
          return;
        }

        await api.createUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          username: form.username.trim() || form.email.split('@')[0],
          password: form.password.trim() || undefined,
          role: form.role,
          status: form.status,
          permissions: form.role === 'admin' ? getAllPermissionsTrue() : form.permissions,
        });
      }

      setShowAddUserModal(false);
      setEditingUser(null);
      setForm({
        fullName: '',
        email: '',
        username: '',
        password: '',
        role: 'sub_user',
        status: 'active',
        permissions: getDefaultSubUserPermissions(),
      });
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to save sub-user.');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser?.id || u.email === 'balaalabc@gmail.com') {
      alert('You cannot delete the active primary administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${u.fullName}" (@${u.username}) from Firebase?`)) return;

    try {
      await api.deleteUser(u.id);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const applyPreset = (preset: 'all' | 'viewer' | 'coordinator' | 'finance' | 'clear') => {
    if (preset === 'all') {
      setForm((prev) => ({ ...prev, permissions: getAllPermissionsTrue() }));
    } else if (preset === 'clear') {
      const cleared: any = {};
      Object.keys(form.permissions).forEach((k) => (cleared[k] = false));
      setForm((prev) => ({ ...prev, permissions: cleared }));
    } else if (preset === 'viewer') {
      setForm((prev) => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          viewInfluencers: true,
          addInfluencers: false,
          updateInfluencers: false,
          deleteInfluencers: false,
          viewProducts: true,
          addProducts: false,
          updateProducts: false,
          deleteProducts: false,
          manageBillboards: false,
          manageLCDScreens: false,
          manageCampaigns: false,
          viewExpenses: true,
          addExpenses: false,
          deleteExpenses: false,
          viewPayments: true,
          approvePayments: false,
          viewReports: true,
          manageUsers: false,
        },
      }));
    } else if (preset === 'coordinator') {
      setForm((prev) => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          viewInfluencers: true,
          addInfluencers: true,
          updateInfluencers: true,
          deleteInfluencers: false,
          viewProducts: true,
          addProducts: true,
          updateProducts: true,
          deleteProducts: false,
          manageBillboards: true,
          manageLCDScreens: true,
          manageCampaigns: false,
          viewExpenses: true,
          addExpenses: true,
          deleteExpenses: false,
          viewPayments: true,
          approvePayments: false,
          viewReports: true,
          manageUsers: false,
        },
      }));
    } else if (preset === 'finance') {
      setForm((prev) => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          viewInfluencers: true,
          addInfluencers: false,
          updateInfluencers: false,
          deleteInfluencers: false,
          viewProducts: true,
          addProducts: false,
          updateProducts: false,
          deleteProducts: false,
          manageBillboards: true,
          manageLCDScreens: true,
          manageCampaigns: true,
          viewExpenses: true,
          addExpenses: true,
          deleteExpenses: true,
          viewPayments: true,
          approvePayments: true,
          viewReports: true,
          manageUsers: false,
        },
      }));
    }
  };

  const handleStartNewMonth = async () => {
    if (!newMonthInput) return;
    setIsStartingMonth(true);
    try {
      await startNewMonth(newMonthInput);
      setNewMonthInput('');
      alert(`Clean operational month "${newMonthInput}" successfully initialized in Firebase.`);
    } catch (e: any) {
      alert(e.message || 'Failed to initialize month');
    } finally {
      setIsStartingMonth(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  if (!isAdmin) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Restricted Administrator Section</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          System Administration and Sub-User Management is restricted exclusively to authenticated users with the <span className="text-amber-300 font-semibold">Administrator</span> role. Sub-users cannot access or modify security credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Firebase Identity & Access Management (IAM)</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Settings & Sub-User Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create sub-users with Firebase Authentication credentials, dynamically configure granular permissions, activate or deactivate accounts, and manage accounting period rollovers.
            </p>
          </div>

          <button
            id="btn-create-sub-user"
            onClick={() => {
              setEditingUser(null);
              setForm({
                fullName: '',
                email: '',
                username: '',
                password: '',
                role: 'sub_user',
                status: 'active',
                permissions: getDefaultSubUserPermissions(),
              });
              setShowAddUserModal(true);
            }}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 self-start md:self-auto shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Sub-User Account</span>
          </button>
        </div>
      </div>

      {/* User Directory Filter & Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-white">System User Directory ({users.length})</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Zero-Trust Cloud Persistence
            </span>
          </div>
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pl-8 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User Details & Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Granted Permissions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading users from Firebase...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No users matching criteria. Click &quot;Create Sub-User Account&quot; to add one.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id || u.email === currentUser?.email;
                  const isPrimaryAdmin = u.email === 'balaalabc@gmail.com';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center space-x-2">
                          <span>{u.fullName}</span>
                          {isSelf && (
                            <span className="text-[10px] text-blue-400 font-medium px-1.5 py-0.2 bg-blue-950/60 rounded border border-blue-800/50">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        <div className="text-[10px] text-slate-500">@{u.username}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                            Administrator
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                            Sub-User
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        {u.role === 'admin' ? (
                          <span className="text-amber-300/90 font-medium text-[11px] flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Unrestricted System Access</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(u.permissions || {})
                              .filter(([k, allowed]) => allowed && !k.startsWith('__'))
                              .slice(0, 6)
                              .map(([permKey]) => (
                                <span
                                  key={permKey}
                                  className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 capitalize"
                                >
                                  {permKey.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              ))}
                            {Object.entries(u.permissions || {}).filter(([_, allowed]) => allowed).length > 6 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400">
                                +{Object.entries(u.permissions || {}).filter(([_, allowed]) => allowed).length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Quick Activate/Deactivate Toggle Button */}
                        {!isPrimaryAdmin && !isSelf && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={statusActionLoading === u.id}
                            className={`p-1.5 rounded-lg border transition ${
                              u.status === 'active'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={u.status === 'active' ? 'Deactivate Sub-User' : 'Activate Sub-User'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Permissions Button */}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setForm({
                              fullName: u.fullName,
                              email: u.email,
                              username: u.username,
                              password: '',
                              role: u.role,
                              status: u.status,
                              permissions: u.permissions || initialPermissions,
                            });
                            setShowAddUserModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="Edit User Permissions"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User Button */}
                        {!isPrimaryAdmin && !isSelf && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                            title="Permanently Delete Sub-User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Operations Rollover Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Accounting Period Rollover Engine</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4 max-w-2xl leading-relaxed">
          Open a clean operational month for fresh target tracking, expense ledgers, and payment workflows. Active influencers and vendor leases carry forward seamlessly while maintaining permanent audit history for all prior periods in Firestore.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 max-w-md">
          <input
            type="month"
            value={newMonthInput}
            onChange={(e) => setNewMonthInput(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-blue-500 focus:outline-none w-full sm:w-auto"
          />
          <button
            onClick={handleStartNewMonth}
            disabled={isStartingMonth || !newMonthInput}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition shadow-sm w-full sm:w-auto"
          >
            {isStartingMonth ? 'Initializing in Firebase...' : 'Open New Operational Month'}
          </button>
        </div>
      </div>

      {/* Add / Edit Sub-User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-7 max-w-xl w-full shadow-2xl text-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingUser ? 'Edit Sub-User & Access Permissions' : 'Create New Sub-User Account'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingUser
                      ? 'Update identity, activity status, and dynamic capability permissions'
                      : 'Provision user credentials via Firebase Auth and grant granular section access'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address * (Google or Standard Email)
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingUser)}
                    placeholder="e.g. sarah.jenkins@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none ${
                      editingUser ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Username / Handle</label>
                  <input
                    type="text"
                    disabled={Boolean(editingUser)}
                    placeholder="e.g. sarah_mkt"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none ${
                      editingUser ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {editingUser ? 'Password' : 'Password (min. 6 chars for email login)'}
                  </label>
                  <input
                    type="password"
                    disabled={Boolean(editingUser)}
                    placeholder={editingUser ? '•••••••• (Managed via Firebase)' : 'Enter initial password (optional if Google)'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none ${
                      editingUser ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center space-x-2">
                <Shield className="w-4 h-4 shrink-0 text-blue-400" />
                <span>Sub-users can log in using either their <strong>Email/Username & Password</strong> or by clicking <strong>Sign In with Google</strong> with their registered email.</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">System Role</label>
                  <select
                    value={form.role}
                    onChange={(e: any) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="sub_user">Sub-User (Granular Permissions)</option>
                    <option value="admin">Administrator (Full Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Account Activity Status</label>
                  <select
                    value={form.status}
                    onChange={(e: any) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="inactive">Deactivated (Access Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Granular Module Permissions */}
              {form.role === 'sub_user' && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Permission-Based Dynamic Access:</span>
                    </label>

                    {/* Permission Presets */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => applyPreset('viewer')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300"
                      >
                        View Only
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('coordinator')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-blue-300"
                      >
                        Coordinator
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('finance')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-emerald-300"
                      >
                        Finance
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('all')}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] text-amber-300"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('clear')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-rose-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 max-h-60 overflow-y-auto">
                    {/* Influencers */}
                    <div>
                      <div className="text-[11px] font-bold text-amber-300 mb-1 uppercase tracking-wider">
                        Influencer Operations
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'viewInfluencers', label: 'View Influencers' },
                          { key: 'addInfluencers', label: 'Add Influencers' },
                          { key: 'updateInfluencers', label: 'Update Influencers' },
                          { key: 'deleteInfluencers', label: 'Delete Influencers' },
                        ].map((p) => (
                          <label key={p.key} className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(form.permissions[p.key as keyof UserPermissions])}
                              onChange={() => handleTogglePermission(p.key as keyof UserPermissions)}
                              className="rounded border-slate-700 text-amber-600 focus:ring-0"
                            />
                            <span className="text-[11px]">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Products / Deliveries */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <div className="text-[11px] font-bold text-blue-300 mb-1 uppercase tracking-wider">
                        Product Units & Deliveries
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'viewProducts', label: 'View Products' },
                          { key: 'addProducts', label: 'Add Products' },
                          { key: 'updateProducts', label: 'Update Products' },
                          { key: 'deleteProducts', label: 'Delete Products' },
                        ].map((p) => (
                          <label key={p.key} className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(form.permissions[p.key as keyof UserPermissions])}
                              onChange={() => handleTogglePermission(p.key as keyof UserPermissions)}
                              className="rounded border-slate-700 text-amber-600 focus:ring-0"
                            />
                            <span className="text-[11px]">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Outdoor Media */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <div className="text-[11px] font-bold text-purple-300 mb-1 uppercase tracking-wider">
                        Outdoor Media & Signage
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'manageBillboards', label: 'Manage Billboards' },
                          { key: 'manageLCDScreens', label: 'Manage LCD Screens' },
                        ].map((p) => (
                          <label key={p.key} className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(form.permissions[p.key as keyof UserPermissions])}
                              onChange={() => handleTogglePermission(p.key as keyof UserPermissions)}
                              className="rounded border-slate-700 text-amber-600 focus:ring-0"
                            />
                            <span className="text-[11px]">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Financials, Budgets & Expenses */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <div className="text-[11px] font-bold text-emerald-300 mb-1 uppercase tracking-wider">
                        Financials, Budgets & Expenses
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'manageCampaigns', label: 'Manage Campaigns / Budgets' },
                          { key: 'viewExpenses', label: 'View Expenses' },
                          { key: 'addExpenses', label: 'Add Expenses' },
                          { key: 'deleteExpenses', label: 'Delete Expenses' },
                        ].map((p) => (
                          <label key={p.key} className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(form.permissions[p.key as keyof UserPermissions])}
                              onChange={() => handleTogglePermission(p.key as keyof UserPermissions)}
                              className="rounded border-slate-700 text-amber-600 focus:ring-0"
                            />
                            <span className="text-[11px]">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Payments & Reports */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <div className="text-[11px] font-bold text-indigo-300 mb-1 uppercase tracking-wider">
                        Disbursements & Analytics
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'viewPayments', label: 'View Payments' },
                          { key: 'approvePayments', label: 'Approve Payments' },
                          { key: 'viewReports', label: 'View Reports' },
                        ].map((p) => (
                          <label key={p.key} className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(form.permissions[p.key as keyof UserPermissions])}
                              onChange={() => handleTogglePermission(p.key as keyof UserPermissions)}
                              className="rounded border-slate-700 text-amber-600 focus:ring-0"
                            />
                            <span className="text-[11px]">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition shadow-sm"
                >
                  {editingUser ? 'Save Permissions' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
