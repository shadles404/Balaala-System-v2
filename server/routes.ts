import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  getDB,
  saveDB,
  ensureMonthInitialized,
  getCurrentMonthStr,
  User,
  UserPermissions,
  Influencer,
  MonthlyTarget,
  DeliveryRecord,
  InfluencerPayment,
  Billboard,
  BillboardPayment,
  LCDScreen,
  LCDPayment,
  MonthlyBudget,
  Expense,
} from './db.js';

export const apiRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise-marketing-operations-secret-jwt-key';

export interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const db = getDB();
    const user = db.users.find(u => u.id === decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid user session' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Role guard: Admin only
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Access forbidden: Admin privilege required' });
    return;
  }
  next();
}

// Permission guard
export function requirePermission(permission: keyof UserPermissions) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin') {
      return next();
    }
    if (req.user?.permissions && req.user.permissions[permission]) {
      return next();
    }
    res.status(403).json({ error: `Access forbidden: Missing permission for ${permission}` });
  };
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions,
      canEditBudget: user.canEditBudget,
    },
  });
});

apiRouter.get('/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      role: req.user.role,
      permissions: req.user.permissions,
      canEditBudget: req.user.canEditBudget,
    },
  });
});

// ==========================================
// 2. USERS & PERMISSIONS (Admin only)
// ==========================================

apiRouter.get('/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const safeUsers = db.users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    permissions: u.permissions,
    canEditBudget: u.canEditBudget,
    createdAt: u.createdAt,
  }));
  res.json(safeUsers);
});

apiRouter.post('/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { username, password, fullName, role, permissions, canEditBudget } = req.body;

  if (!username || !password || !fullName) {
    res.status(400).json({ error: 'Username, password, and full name are required' });
    return;
  }

  const db = getDB();
  if (db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
    res.status(400).json({ error: 'Username already exists' });
    return;
  }

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    username: username.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    fullName: fullName.trim(),
    role: role === 'admin' ? 'admin' : 'sub_user',
    permissions: permissions || {
      influencers: true,
      targets: true,
      deliveries: true,
      billboards: false,
      lcd_screens: false,
      budgets: false,
      expenses: true,
      payments: true,
      reports: false,
      settings: false,
    },
    canEditBudget: Boolean(canEditBudget),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDB();

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    fullName: newUser.fullName,
    role: newUser.role,
    permissions: newUser.permissions,
    canEditBudget: newUser.canEditBudget,
    createdAt: newUser.createdAt,
  });
});

apiRouter.put('/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { fullName, password, permissions, canEditBudget, role } = req.body;

  const db = getDB();
  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = db.users[userIndex];
  if (fullName) user.fullName = fullName.trim();
  if (role && (role === 'admin' || role === 'sub_user')) user.role = role;
  if (permissions) user.permissions = { ...user.permissions, ...permissions };
  if (canEditBudget !== undefined) user.canEditBudget = Boolean(canEditBudget);
  if (password && password.trim().length >= 4) {
    user.passwordHash = bcrypt.hashSync(password.trim(), 10);
  }

  saveDB();
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    permissions: user.permissions,
    canEditBudget: user.canEditBudget,
    createdAt: user.createdAt,
  });
});

apiRouter.delete('/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (req.user?.id === id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  const db = getDB();
  db.users = db.users.filter(u => u.id !== id);
  saveDB();
  res.json({ success: true });
});

// ==========================================
// 3. MONTH OPERATIONS & HISTORY
// ==========================================

apiRouter.get('/months', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const monthsSet = new Set<string>();
  
  // Current month
  monthsSet.add(getCurrentMonthStr());
  if (db.active_month) monthsSet.add(db.active_month);

  // Add all months with budgets, targets, expenses, payments
  db.budgets.forEach(b => monthsSet.add(b.month));
  db.monthly_targets.forEach(t => monthsSet.add(t.month));
  db.deliveries.forEach(d => monthsSet.add(d.month));
  db.expenses.forEach(e => monthsSet.add(e.month));
  db.influencer_payments.forEach(p => monthsSet.add(p.month));
  db.billboard_payments.forEach(p => monthsSet.add(p.month));
  db.lcd_payments.forEach(p => monthsSet.add(p.month));

  const sortedMonths = Array.from(monthsSet).sort().reverse();
  res.json({
    currentMonth: getCurrentMonthStr(),
    activeMonth: db.active_month || getCurrentMonthStr(),
    availableMonths: sortedMonths,
  });
});

apiRouter.post('/months/start-new', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { month } = req.body;
  const targetMonth = month || getCurrentMonthStr();
  
  ensureMonthInitialized(targetMonth);
  const db = getDB();
  db.active_month = targetMonth;
  saveDB();

  res.json({ success: true, month: targetMonth });
});

// ==========================================
// 4. DASHBOARD
// ==========================================

apiRouter.get('/dashboard', authenticateToken, (req: AuthRequest, res: Response) => {
  const month = (req.query.month as string) || getCurrentMonthStr();
  ensureMonthInitialized(month);

  const db = getDB();

  // Budget
  const budget = db.budgets.find(b => b.month === month) || {
    totalBudget: 0,
    localBudget: 0,
    internationalBudget: 0,
  };

  // Expenses for this month
  const monthlyExpensesList = db.expenses.filter(e => e.month === month);
  const monthlyExpenses = monthlyExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalBudgetSpent = monthlyExpenses;
  const remainingBudget = Math.max(0, budget.totalBudget - totalBudgetSpent);

  // Local & International spent
  const localExpenses = monthlyExpensesList
    .filter(e => e.budgetPool === 'Local')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const internationalExpenses = monthlyExpensesList
    .filter(e => e.budgetPool === 'International')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Payments in this month
  const infPayments = db.influencer_payments.filter(p => p.month === month);
  const bbPayments = db.billboard_payments.filter(p => p.month === month);
  const lcdPayments = db.lcd_payments.filter(p => p.month === month);

  const allPayments = [
    ...infPayments.map(p => ({ amount: p.monthlySalary, status: p.paymentStatus })),
    ...bbPayments.map(p => ({ amount: p.amount, status: p.paymentStatus })),
    ...lcdPayments.map(p => ({ amount: p.amount, status: p.paymentStatus })),
  ];

  const totalPendingPayments = allPayments
    .filter(p => p.status === 'Pending' || p.status === 'Approved')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPaidPayments = allPayments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Influencers
  const activeInfluencersList = db.influencers.filter(i => i.status === 'Active');
  const activeInfluencers = activeInfluencersList.length;

  const targetsForMonth = db.monthly_targets.filter(t => t.month === month);
  const influencersWhoReachedTarget = targetsForMonth.filter(
    t => t.completedVideos >= t.targetVideos && t.targetVideos > 0
  ).length;

  // Billboards and LCD Screens
  const activeBillboards = db.billboards.filter(b => b.status === 'Active').length;
  const activeLCDScreens = db.lcd_screens.filter(l => l.status === 'Active').length;

  // Category breakdown for expenses
  const categoryExpenses = {
    Influencers: monthlyExpensesList.filter(e => e.category === 'Influencers').reduce((sum, e) => sum + e.amount, 0),
    Billboards: monthlyExpensesList.filter(e => e.category === 'Billboards').reduce((sum, e) => sum + e.amount, 0),
    'LCD Screens': monthlyExpensesList.filter(e => e.category === 'LCD Screens').reduce((sum, e) => sum + e.amount, 0),
    Other: monthlyExpensesList.filter(e => e.category === 'Other').reduce((sum, e) => sum + e.amount, 0),
  };

  res.json({
    month,
    totalMarketingBudget: budget.totalBudget,
    localBudget: budget.localBudget,
    internationalBudget: budget.internationalBudget,
    localExpenses,
    internationalExpenses,
    totalBudgetSpent,
    remainingBudget,
    totalPendingPayments,
    totalPaidPayments,
    activeInfluencers,
    influencersWhoReachedTarget,
    activeBillboards,
    activeLCDScreens,
    monthlyExpenses,
    categoryExpenses,
  });
});

// ==========================================
// 5. INFLUENCERS & TARGET TRACKING & DELIVERIES
// ==========================================

// Influencers Registration
apiRouter.get('/influencers', authenticateToken, requirePermission('influencers'), (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.influencers);
});

apiRouter.post('/influencers', authenticateToken, requirePermission('influencers'), (req: Request, res: Response) => {
  const {
    fullName,
    tiktokUsername,
    phoneNumber,
    category,
    targetVideosPerMonth,
    salary,
    agreementStartDate,
    agreementEndDate,
    status,
    notes,
  } = req.body;

  if (!fullName || !tiktokUsername) {
    res.status(400).json({ error: 'Full Name and TikTok Username are required' });
    return;
  }

  const db = getDB();
  const newInfluencer: Influencer = {
    id: `inf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    fullName: fullName.trim(),
    tiktokUsername: tiktokUsername.trim().replace(/^@/, ''),
    phoneNumber: phoneNumber?.trim() || '',
    category: category?.trim() || 'General',
    targetVideosPerMonth: Number(targetVideosPerMonth) || 0,
    salary: Number(salary) || 0,
    agreementStartDate: agreementStartDate || new Date().toISOString().split('T')[0],
    agreementEndDate: agreementEndDate || '',
    status: status === 'Inactive' ? 'Inactive' : 'Active',
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.influencers.push(newInfluencer);

  // If active, ensure current month has target record
  const currentMonth = getCurrentMonthStr();
  if (newInfluencer.status === 'Active') {
    db.monthly_targets.push({
      id: `tgt_${currentMonth}_${newInfluencer.id}`,
      month: currentMonth,
      influencerId: newInfluencer.id,
      targetVideos: newInfluencer.targetVideosPerMonth,
      completedVideos: 0,
      notes: '',
      updatedAt: new Date().toISOString(),
    });
  }

  saveDB();
  res.status(201).json(newInfluencer);
});

apiRouter.put('/influencers/:id', authenticateToken, requirePermission('influencers'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.influencers.findIndex(i => i.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Influencer not found' });
    return;
  }

  const existing = db.influencers[index];
  const updated: Influencer = {
    ...existing,
    fullName: req.body.fullName?.trim() ?? existing.fullName,
    tiktokUsername: req.body.tiktokUsername ? req.body.tiktokUsername.trim().replace(/^@/, '') : existing.tiktokUsername,
    phoneNumber: req.body.phoneNumber?.trim() ?? existing.phoneNumber,
    category: req.body.category?.trim() ?? existing.category,
    targetVideosPerMonth: req.body.targetVideosPerMonth !== undefined ? Number(req.body.targetVideosPerMonth) : existing.targetVideosPerMonth,
    salary: req.body.salary !== undefined ? Number(req.body.salary) : existing.salary,
    agreementStartDate: req.body.agreementStartDate ?? existing.agreementStartDate,
    agreementEndDate: req.body.agreementEndDate ?? existing.agreementEndDate,
    status: req.body.status ?? existing.status,
    notes: req.body.notes?.trim() ?? existing.notes,
  };

  db.influencers[index] = updated;

  // Also update current month target if targetVideosPerMonth changed
  const currentMonth = getCurrentMonthStr();
  const currentTarget = db.monthly_targets.find(t => t.month === currentMonth && t.influencerId === id);
  if (currentTarget && req.body.targetVideosPerMonth !== undefined) {
    currentTarget.targetVideos = updated.targetVideosPerMonth;
  }

  saveDB();
  res.json(updated);
});

apiRouter.delete('/influencers/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  db.influencers = db.influencers.filter(i => i.id !== id);
  saveDB();
  res.json({ success: true });
});

// Target Tracking
apiRouter.get('/targets', authenticateToken, requirePermission('targets'), (req: Request, res: Response) => {
  const month = (req.query.month as string) || getCurrentMonthStr();
  ensureMonthInitialized(month);

  const db = getDB();
  const targets = db.monthly_targets.filter(t => t.month === month);

  // Join with influencer profile
  const enriched = targets.map(t => {
    const influencer = db.influencers.find(i => i.id === t.influencerId);
    const targetVideos = t.targetVideos || 0;
    const completedVideos = t.completedVideos || 0;
    const remainingVideos = Math.max(0, targetVideos - completedVideos);
    const progressPercentage = targetVideos > 0 ? Math.min(100, Math.round((completedVideos / targetVideos) * 100)) : 0;
    const targetStatus = completedVideos >= targetVideos && targetVideos > 0 ? 'Reached' : 'Not Reached';

    return {
      ...t,
      influencerName: influencer?.fullName || 'Unknown',
      tiktokUsername: influencer?.tiktokUsername || '',
      category: influencer?.category || '',
      salary: influencer?.salary || 0,
      influencerStatus: influencer?.status || 'Inactive',
      targetVideos,
      completedVideos,
      remainingVideos,
      progressPercentage,
      targetStatus,
    };
  });

  res.json(enriched);
});

// Update target / completed videos
apiRouter.put('/targets/:id', authenticateToken, requirePermission('targets'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { completedVideos, targetVideos, notes } = req.body;

  const db = getDB();
  const targetIndex = db.monthly_targets.findIndex(t => t.id === id);
  if (targetIndex === -1) {
    res.status(404).json({ error: 'Target record not found' });
    return;
  }

  const target = db.monthly_targets[targetIndex];
  if (completedVideos !== undefined) target.completedVideos = Math.max(0, Number(completedVideos));
  if (targetVideos !== undefined && req.user?.role === 'admin') target.targetVideos = Math.max(0, Number(targetVideos));
  if (notes !== undefined) target.notes = String(notes);
  target.updatedAt = new Date().toISOString();

  // SYSTEM DIRECTIVE:
  // "Automatically add influencers to the monthly payment list only when they complete their assigned monthly video target before the month ends."
  const isReached = target.completedVideos >= target.targetVideos && target.targetVideos > 0;
  if (isReached) {
    const influencer = db.influencers.find(i => i.id === target.influencerId);
    if (influencer) {
      const existingPayment = db.influencer_payments.find(
        p => p.month === target.month && p.influencerId === influencer.id
      );

      if (!existingPayment) {
        // Automatically add to pending payments
        const newPayment: InfluencerPayment = {
          id: `pay_inf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          month: target.month,
          influencerId: influencer.id,
          influencerName: influencer.fullName,
          monthlySalary: influencer.salary,
          completedVideos: target.completedVideos,
          targetVideos: target.targetVideos,
          paymentStatus: 'Pending', // Pending approval!
          paymentDate: new Date().toISOString().split('T')[0],
          notes: `Automatic qualification: Target of ${target.targetVideos} videos completed.`,
          submittedBy: req.user?.username || 'system',
          createdAt: new Date().toISOString(),
        };
        db.influencer_payments.push(newPayment);
      } else {
        // Update video counts in existing payment record
        existingPayment.completedVideos = target.completedVideos;
        existingPayment.targetVideos = target.targetVideos;
      }
    }
  }

  saveDB();
  res.json(target);
});

// Delivery Records
apiRouter.get('/deliveries', authenticateToken, requirePermission('deliveries'), (req: Request, res: Response) => {
  const month = req.query.month as string;
  const db = getDB();

  let deliveries = db.deliveries;
  if (month && month !== 'all') {
    deliveries = deliveries.filter(d => d.month === month);
  }

  const totalDeliveryValue = deliveries.reduce((sum, d) => sum + (d.deliveryPrice * d.quantity || 0), 0);
  const paidDeliveries = deliveries.filter(d => d.paymentStatus === 'Paid');
  const unpaidDeliveries = deliveries.filter(d => d.paymentStatus === 'Pending');

  const totalPaidDeliveriesCount = paidDeliveries.length;
  const totalPaidDeliveriesValue = paidDeliveries.reduce((sum, d) => sum + (d.deliveryPrice * d.quantity || 0), 0);

  const totalUnpaidDeliveriesCount = unpaidDeliveries.length;
  const totalUnpaidDeliveriesValue = unpaidDeliveries.reduce((sum, d) => sum + (d.deliveryPrice * d.quantity || 0), 0);

  res.json({
    deliveries,
    summary: {
      totalDeliveryValue,
      totalPaidDeliveriesCount,
      totalPaidDeliveriesValue,
      totalUnpaidDeliveriesCount,
      totalUnpaidDeliveriesValue,
    },
  });
});

apiRouter.post('/deliveries', authenticateToken, requirePermission('deliveries'), (req: Request, res: Response) => {
  const { influencerId, productName, quantity, deliveryPrice, deliveryDate, paymentStatus, notes, month } = req.body;

  if (!influencerId || !productName) {
    res.status(400).json({ error: 'Influencer and Product Name are required' });
    return;
  }

  const db = getDB();
  const influencer = db.influencers.find(i => i.id === influencerId);

  const targetMonth = month || getCurrentMonthStr();
  const newDelivery: DeliveryRecord = {
    id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    month: targetMonth,
    influencerId,
    influencerName: influencer?.fullName || 'Unknown Influencer',
    productName: productName.trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    deliveryPrice: Math.max(0, Number(deliveryPrice) || 0),
    deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
    paymentStatus: paymentStatus === 'Paid' ? 'Paid' : 'Pending',
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.deliveries.push(newDelivery);
  saveDB();
  res.status(201).json(newDelivery);
});

apiRouter.put('/deliveries/:id', authenticateToken, requirePermission('deliveries'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.deliveries.findIndex(d => d.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Delivery record not found' });
    return;
  }

  const existing = db.deliveries[index];
  const updated: DeliveryRecord = {
    ...existing,
    productName: req.body.productName?.trim() ?? existing.productName,
    quantity: req.body.quantity !== undefined ? Number(req.body.quantity) : existing.quantity,
    deliveryPrice: req.body.deliveryPrice !== undefined ? Number(req.body.deliveryPrice) : existing.deliveryPrice,
    deliveryDate: req.body.deliveryDate ?? existing.deliveryDate,
    paymentStatus: req.body.paymentStatus ?? existing.paymentStatus,
    notes: req.body.notes?.trim() ?? existing.notes,
  };

  db.deliveries[index] = updated;
  saveDB();
  res.json(updated);
});

apiRouter.delete('/deliveries/:id', authenticateToken, requirePermission('deliveries'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  db.deliveries = db.deliveries.filter(d => d.id !== id);
  saveDB();
  res.json({ success: true });
});

// Influencer Payments
apiRouter.get('/influencer-payments', authenticateToken, requirePermission('payments'), (req: Request, res: Response) => {
  const month = req.query.month as string;
  const db = getDB();
  let list = db.influencer_payments;
  if (month && month !== 'all') {
    list = list.filter(p => p.month === month);
  }
  res.json(list);
});

apiRouter.post('/influencer-payments/request', authenticateToken, requirePermission('payments'), (req: AuthRequest, res: Response) => {
  const { influencerId, month, notes } = req.body;
  if (!influencerId) {
    res.status(400).json({ error: 'Influencer ID required' });
    return;
  }

  const db = getDB();
  const targetMonth = month || getCurrentMonthStr();
  const influencer = db.influencers.find(i => i.id === influencerId);
  if (!influencer) {
    res.status(404).json({ error: 'Influencer not found' });
    return;
  }

  const target = db.monthly_targets.find(t => t.month === targetMonth && t.influencerId === influencerId);
  const existingPayment = db.influencer_payments.find(p => p.month === targetMonth && p.influencerId === influencerId);

  if (existingPayment) {
    res.status(400).json({ error: 'Payment request already exists for this influencer in this month' });
    return;
  }

  const newPayment: InfluencerPayment = {
    id: `pay_inf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    month: targetMonth,
    influencerId: influencer.id,
    influencerName: influencer.fullName,
    monthlySalary: influencer.salary,
    completedVideos: target?.completedVideos || 0,
    targetVideos: target?.targetVideos || influencer.targetVideosPerMonth,
    paymentStatus: 'Pending',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: notes?.trim() || 'Manual payment request submitted',
    submittedBy: req.user?.username || 'user',
    createdAt: new Date().toISOString(),
  };

  db.influencer_payments.push(newPayment);
  saveDB();
  res.status(201).json(newPayment);
});

// Payment Status Update (ADMIN ONLY: Approve and Mark as Paid)
apiRouter.patch('/influencer-payments/:id/status', authenticateToken, (req: AuthRequest, res: Response) => {
  // SYSTEM MANDATE: Sub-users can submit payment requests only. Admin can approve payments and mark them as paid.
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied: Only Administrators can approve or mark payments as paid.' });
    return;
  }

  const { id } = req.params;
  const { status, paymentDate, notes } = req.body;

  if (!['Pending', 'Approved', 'Paid'].includes(status)) {
    res.status(400).json({ error: 'Invalid status: must be Pending, Approved, or Paid' });
    return;
  }

  const db = getDB();
  const payment = db.influencer_payments.find(p => p.id === id);
  if (!payment) {
    res.status(404).json({ error: 'Payment record not found' });
    return;
  }

  payment.paymentStatus = status;
  if (paymentDate) payment.paymentDate = paymentDate;
  if (notes) payment.notes = notes;
  if (status === 'Approved') payment.approvedBy = req.user.username;

  saveDB();
  res.json(payment);
});

// ==========================================
// 6. BILLBOARDS & PAYMENTS
// ==========================================

apiRouter.get('/billboards', authenticateToken, requirePermission('billboards'), (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.billboards);
});

apiRouter.post('/billboards', authenticateToken, requirePermission('billboards'), (req: Request, res: Response) => {
  const { vendorName, billboardSize, location, productBrand, rentalPrice, agreementStartDate, agreementEndDate, status, notes } = req.body;

  if (!vendorName || !location) {
    res.status(400).json({ error: 'Vendor Name and Location are required' });
    return;
  }

  const db = getDB();
  const newBillboard: Billboard = {
    id: `bb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    vendorName: vendorName.trim(),
    billboardSize: billboardSize?.trim() || '',
    location: location.trim(),
    productBrand: productBrand?.trim() || '',
    rentalPrice: Number(rentalPrice) || 0,
    agreementStartDate: agreementStartDate || new Date().toISOString().split('T')[0],
    agreementEndDate: agreementEndDate || '',
    status: status === 'Inactive' ? 'Inactive' : 'Active',
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.billboards.push(newBillboard);
  saveDB();
  res.status(201).json(newBillboard);
});

apiRouter.put('/billboards/:id', authenticateToken, requirePermission('billboards'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.billboards.findIndex(b => b.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Billboard not found' });
    return;
  }

  const existing = db.billboards[index];
  const updated: Billboard = {
    ...existing,
    vendorName: req.body.vendorName?.trim() ?? existing.vendorName,
    billboardSize: req.body.billboardSize?.trim() ?? existing.billboardSize,
    location: req.body.location?.trim() ?? existing.location,
    productBrand: req.body.productBrand?.trim() ?? existing.productBrand,
    rentalPrice: req.body.rentalPrice !== undefined ? Number(req.body.rentalPrice) : existing.rentalPrice,
    agreementStartDate: req.body.agreementStartDate ?? existing.agreementStartDate,
    agreementEndDate: req.body.agreementEndDate ?? existing.agreementEndDate,
    status: req.body.status ?? existing.status,
    notes: req.body.notes?.trim() ?? existing.notes,
  };

  db.billboards[index] = updated;
  saveDB();
  res.json(updated);
});

apiRouter.delete('/billboards/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  db.billboards = db.billboards.filter(b => b.id !== id);
  saveDB();
  res.json({ success: true });
});

// Billboard Payments
apiRouter.get('/billboard-payments', authenticateToken, requirePermission('billboards'), (req: Request, res: Response) => {
  const month = req.query.month as string;
  const db = getDB();
  let list = db.billboard_payments;
  if (month && month !== 'all') {
    list = list.filter(p => p.month === month);
  }
  res.json(list);
});

apiRouter.post('/billboard-payments', authenticateToken, requirePermission('billboards'), (req: AuthRequest, res: Response) => {
  const { billboardId, vendorName, amount, date, paymentStatus, notes, month } = req.body;
  if (!amount || (!billboardId && !vendorName)) {
    res.status(400).json({ error: 'Amount and Vendor/Billboard are required' });
    return;
  }

  const db = getDB();
  const bb = billboardId ? db.billboards.find(b => b.id === billboardId) : null;
  const targetMonth = month || getCurrentMonthStr();

  // Sub-user can submit payment requests with status 'Pending'
  const initialStatus = req.user?.role === 'admin' ? (paymentStatus || 'Pending') : 'Pending';

  const newPayment: BillboardPayment = {
    id: `pay_bb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    month: targetMonth,
    billboardId: billboardId || '',
    vendorName: vendorName?.trim() || bb?.vendorName || 'Billboard Vendor',
    amount: Number(amount),
    date: date || new Date().toISOString().split('T')[0],
    paymentStatus: initialStatus,
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.billboard_payments.push(newPayment);
  saveDB();
  res.status(201).json(newPayment);
});

apiRouter.patch('/billboard-payments/:id/status', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied: Only Admin can approve or mark billboard payments as paid' });
    return;
  }

  const { id } = req.params;
  const { status, date, notes } = req.body;

  const db = getDB();
  const payment = db.billboard_payments.find(p => p.id === id);
  if (!payment) {
    res.status(404).json({ error: 'Billboard payment record not found' });
    return;
  }

  if (status) payment.paymentStatus = status;
  if (date) payment.date = date;
  if (notes) payment.notes = notes;

  saveDB();
  res.json(payment);
});

// ==========================================
// 7. LCD SCREENS & PAYMENTS
// ==========================================

apiRouter.get('/lcd-screens', authenticateToken, requirePermission('lcd_screens'), (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.lcd_screens);
});

apiRouter.post('/lcd-screens', authenticateToken, requirePermission('lcd_screens'), (req: Request, res: Response) => {
  const { vendorName, screenSize, resolution, location, productBrand, rentalPrice, agreementStartDate, agreementEndDate, status, notes } = req.body;

  if (!vendorName || !location) {
    res.status(400).json({ error: 'Vendor Name and Location are required' });
    return;
  }

  const db = getDB();
  const newLCD: LCDScreen = {
    id: `lcd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    vendorName: vendorName.trim(),
    screenSize: screenSize?.trim() || '',
    resolution: resolution?.trim() || '',
    location: location.trim(),
    productBrand: productBrand?.trim() || '',
    rentalPrice: Number(rentalPrice) || 0,
    agreementStartDate: agreementStartDate || new Date().toISOString().split('T')[0],
    agreementEndDate: agreementEndDate || '',
    status: status === 'Inactive' ? 'Inactive' : 'Active',
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.lcd_screens.push(newLCD);
  saveDB();
  res.status(201).json(newLCD);
});

apiRouter.put('/lcd-screens/:id', authenticateToken, requirePermission('lcd_screens'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.lcd_screens.findIndex(l => l.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'LCD Screen not found' });
    return;
  }

  const existing = db.lcd_screens[index];
  const updated: LCDScreen = {
    ...existing,
    vendorName: req.body.vendorName?.trim() ?? existing.vendorName,
    screenSize: req.body.screenSize?.trim() ?? existing.screenSize,
    resolution: req.body.resolution?.trim() ?? existing.resolution,
    location: req.body.location?.trim() ?? existing.location,
    productBrand: req.body.productBrand?.trim() ?? existing.productBrand,
    rentalPrice: req.body.rentalPrice !== undefined ? Number(req.body.rentalPrice) : existing.rentalPrice,
    agreementStartDate: req.body.agreementStartDate ?? existing.agreementStartDate,
    agreementEndDate: req.body.agreementEndDate ?? existing.agreementEndDate,
    status: req.body.status ?? existing.status,
    notes: req.body.notes?.trim() ?? existing.notes,
  };

  db.lcd_screens[index] = updated;
  saveDB();
  res.json(updated);
});

apiRouter.delete('/lcd-screens/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  db.lcd_screens = db.lcd_screens.filter(l => l.id !== id);
  saveDB();
  res.json({ success: true });
});

// LCD Payments
apiRouter.get('/lcd-payments', authenticateToken, requirePermission('lcd_screens'), (req: Request, res: Response) => {
  const month = req.query.month as string;
  const db = getDB();
  let list = db.lcd_payments;
  if (month && month !== 'all') {
    list = list.filter(p => p.month === month);
  }
  res.json(list);
});

apiRouter.post('/lcd-payments', authenticateToken, requirePermission('lcd_screens'), (req: AuthRequest, res: Response) => {
  const { lcdId, vendorName, amount, date, paymentStatus, notes, month } = req.body;
  if (!amount || (!lcdId && !vendorName)) {
    res.status(400).json({ error: 'Amount and Vendor/LCD are required' });
    return;
  }

  const db = getDB();
  const lcd = lcdId ? db.lcd_screens.find(l => l.id === lcdId) : null;
  const targetMonth = month || getCurrentMonthStr();
  const initialStatus = req.user?.role === 'admin' ? (paymentStatus || 'Pending') : 'Pending';

  const newPayment: LCDPayment = {
    id: `pay_lcd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    month: targetMonth,
    lcdId: lcdId || '',
    vendorName: vendorName?.trim() || lcd?.vendorName || 'LCD Vendor',
    amount: Number(amount),
    date: date || new Date().toISOString().split('T')[0],
    paymentStatus: initialStatus,
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  db.lcd_payments.push(newPayment);
  saveDB();
  res.status(201).json(newPayment);
});

apiRouter.patch('/lcd-payments/:id/status', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied: Only Admin can approve or mark LCD payments as paid' });
    return;
  }

  const { id } = req.params;
  const { status, date, notes } = req.body;

  const db = getDB();
  const payment = db.lcd_payments.find(p => p.id === id);
  if (!payment) {
    res.status(404).json({ error: 'LCD payment record not found' });
    return;
  }

  if (status) payment.paymentStatus = status;
  if (date) payment.date = date;
  if (notes) payment.notes = notes;

  saveDB();
  res.json(payment);
});

// ==========================================
// 8. BUDGET MANAGEMENT & EXPENSES
// ==========================================

apiRouter.get('/budgets', authenticateToken, requirePermission('budgets'), (req: Request, res: Response) => {
  const month = (req.query.month as string) || getCurrentMonthStr();
  ensureMonthInitialized(month);

  const db = getDB();
  const budget = db.budgets.find(b => b.month === month);
  res.json(budget || { month, totalBudget: 0, localBudget: 0, internationalBudget: 0 });
});

apiRouter.post('/budgets', authenticateToken, requirePermission('budgets'), (req: AuthRequest, res: Response) => {
  // SYSTEM MANDATE: Sub-users cannot change total marketing budget unless explicitly permitted
  if (req.user?.role !== 'admin' && !req.user?.canEditBudget) {
    res.status(403).json({ error: 'Permission denied: Only Admin or explicitly permitted users can set marketing budgets' });
    return;
  }

  const { month, totalBudget, localBudget, internationalBudget, notes } = req.body;
  const targetMonth = month || getCurrentMonthStr();

  const total = Number(totalBudget) || 0;
  const local = Number(localBudget) || 0;
  const intl = Number(internationalBudget) || 0;

  const db = getDB();
  const existingIndex = db.budgets.findIndex(b => b.month === targetMonth);

  const budgetRecord: MonthlyBudget = {
    id: existingIndex !== -1 ? db.budgets[existingIndex].id : `bgt_${targetMonth}`,
    month: targetMonth,
    totalBudget: total,
    localBudget: local,
    internationalBudget: intl,
    notes: notes?.trim() || '',
    updatedBy: req.user?.username || 'admin',
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    db.budgets[existingIndex] = budgetRecord;
  } else {
    db.budgets.push(budgetRecord);
  }

  saveDB();
  res.json(budgetRecord);
});

// Expenses Ledger
apiRouter.get('/expenses', authenticateToken, requirePermission('expenses'), (req: Request, res: Response) => {
  const month = req.query.month as string;
  const db = getDB();
  let list = db.expenses;
  if (month && month !== 'all') {
    list = list.filter(e => e.month === month);
  }
  res.json(list);
});

apiRouter.post('/expenses', authenticateToken, requirePermission('expenses'), (req: AuthRequest, res: Response) => {
  const { budgetPool, category, description, amount, date, notes, month } = req.body;

  // SYSTEM MANDATE: Prevent expenses from being recorded without a valid budget pool and amount.
  if (!budgetPool || !['Local', 'International'].includes(budgetPool)) {
    res.status(400).json({ error: 'Valid budget pool (Local or International) is required' });
    return;
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
    res.status(400).json({ error: 'Valid positive amount in USD is required' });
    return;
  }

  if (!description || description.trim().length === 0) {
    res.status(400).json({ error: 'Expense description is required' });
    return;
  }

  if (!category || !['Influencers', 'Billboards', 'LCD Screens', 'Other'].includes(category)) {
    res.status(400).json({ error: 'Valid category (Influencers, Billboards, LCD Screens, Other) is required' });
    return;
  }

  const targetMonth = month || getCurrentMonthStr();
  const db = getDB();

  const newExpense: Expense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    month: targetMonth,
    budgetPool,
    category,
    description: description.trim(),
    amount: numAmount,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes?.trim() || '',
    createdBy: req.user?.username || 'user',
    createdAt: new Date().toISOString(),
  };

  db.expenses.push(newExpense);
  saveDB();
  res.status(201).json(newExpense);
});

apiRouter.put('/expenses/:id', authenticateToken, requirePermission('expenses'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.expenses.findIndex(e => e.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Expense record not found' });
    return;
  }

  const existing = db.expenses[index];
  const { budgetPool, category, description, amount, date, notes } = req.body;

  if (budgetPool && !['Local', 'International'].includes(budgetPool)) {
    res.status(400).json({ error: 'Valid budget pool is required' });
    return;
  }
  if (amount !== undefined && (Number(amount) <= 0 || isNaN(Number(amount)))) {
    res.status(400).json({ error: 'Valid amount is required' });
    return;
  }

  const updated: Expense = {
    ...existing,
    budgetPool: budgetPool ?? existing.budgetPool,
    category: category ?? existing.category,
    description: description?.trim() ?? existing.description,
    amount: amount !== undefined ? Number(amount) : existing.amount,
    date: date ?? existing.date,
    notes: notes?.trim() ?? existing.notes,
  };

  db.expenses[index] = updated;
  saveDB();
  res.json(updated);
});

apiRouter.delete('/expenses/:id', authenticateToken, requirePermission('expenses'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  db.expenses = db.expenses.filter(e => e.id !== id);
  saveDB();
  res.json({ success: true });
});

// ==========================================
// 9. CENTRALIZED PAYMENT MANAGEMENT
// ==========================================

export interface UnifiedPayment {
  id: string;
  sourceType: 'Influencer' | 'Billboard' | 'LCD Screen';
  sourceId: string;
  month: string;
  recipient: string;
  category: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Paid';
  date: string;
  notes: string;
  details?: Record<string, any>;
}

apiRouter.get('/payments', authenticateToken, requirePermission('payments'), (req: Request, res: Response) => {
  const month = req.query.month as string;
  const filterStatus = req.query.status as string; // all, pending, paid
  const filterType = req.query.type as string; // all, Influencer, Billboard, LCD Screen

  const db = getDB();

  let unified: UnifiedPayment[] = [
    ...db.influencer_payments.map(p => ({
      id: p.id,
      sourceType: 'Influencer' as const,
      sourceId: p.influencerId,
      month: p.month,
      recipient: p.influencerName,
      category: 'Influencers',
      amount: p.monthlySalary,
      status: p.paymentStatus,
      date: p.paymentDate,
      notes: p.notes,
      details: {
        completedVideos: p.completedVideos,
        targetVideos: p.targetVideos,
        submittedBy: p.submittedBy,
        approvedBy: p.approvedBy,
      },
    })),
    ...db.billboard_payments.map(p => ({
      id: p.id,
      sourceType: 'Billboard' as const,
      sourceId: p.billboardId,
      month: p.month,
      recipient: p.vendorName,
      category: 'Billboards',
      amount: p.amount,
      status: p.paymentStatus,
      date: p.date,
      notes: p.notes,
    })),
    ...db.lcd_payments.map(p => ({
      id: p.id,
      sourceType: 'LCD Screen' as const,
      sourceId: p.lcdId,
      month: p.month,
      recipient: p.vendorName,
      category: 'LCD Screens',
      amount: p.amount,
      status: p.paymentStatus,
      date: p.date,
      notes: p.notes,
    })),
  ];

  if (month && month !== 'all') {
    unified = unified.filter(p => p.month === month);
  }

  if (filterType && filterType !== 'all') {
    unified = unified.filter(p => p.sourceType === filterType);
  }

  if (filterStatus === 'pending') {
    unified = unified.filter(p => p.status === 'Pending' || p.status === 'Approved');
  } else if (filterStatus === 'paid') {
    unified = unified.filter(p => p.status === 'Paid');
  }

  const totalAmount = unified.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingAmount = unified.filter(p => p.status === 'Pending' || p.status === 'Approved').reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidAmount = unified.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);

  res.json({
    payments: unified,
    summary: {
      totalCount: unified.length,
      totalAmount,
      pendingAmount,
      paidAmount,
    },
  });
});

// Generic payment status change (ADMIN ONLY)
apiRouter.patch('/payments/:sourceType/:id/status', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied: Only Administrators can approve or mark payments as paid' });
    return;
  }

  const { sourceType, id } = req.params;
  const { status, date, notes } = req.body;

  if (!['Pending', 'Approved', 'Paid'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const db = getDB();

  if (sourceType === 'Influencer') {
    const p = db.influencer_payments.find(item => item.id === id);
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    p.paymentStatus = status;
    if (date) p.paymentDate = date;
    if (notes) p.notes = notes;
    if (status === 'Approved') p.approvedBy = req.user.username;
    saveDB();
    return res.json(p);
  } else if (sourceType === 'Billboard') {
    const p = db.billboard_payments.find(item => item.id === id);
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    p.paymentStatus = status;
    if (date) p.date = date;
    if (notes) p.notes = notes;
    saveDB();
    return res.json(p);
  } else if (sourceType === 'LCD Screen') {
    const p = db.lcd_payments.find(item => item.id === id);
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    p.paymentStatus = status;
    if (date) p.date = date;
    if (notes) p.notes = notes;
    saveDB();
    return res.json(p);
  }

  res.status(400).json({ error: 'Invalid payment sourceType' });
});

// ==========================================
// 10. ENTERPRISE REPORTS
// ==========================================

apiRouter.get('/reports', authenticateToken, requirePermission('reports'), (req: Request, res: Response) => {
  const { type, month, startDate, endDate } = req.query as {
    type?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
  };

  const db = getDB();
  const selectedMonth = month || getCurrentMonthStr();

  switch (type) {
    case 'influencer-performance': {
      const targets = db.monthly_targets.filter(t => !selectedMonth || selectedMonth === 'all' || t.month === selectedMonth);
      const rows = targets.map(t => {
        const inf = db.influencers.find(i => i.id === t.influencerId);
        const targetVideos = t.targetVideos || 0;
        const completedVideos = t.completedVideos || 0;
        const remainingVideos = Math.max(0, targetVideos - completedVideos);
        const progressPercentage = targetVideos > 0 ? Math.min(100, Math.round((completedVideos / targetVideos) * 100)) : 0;
        const targetStatus = completedVideos >= targetVideos && targetVideos > 0 ? 'Reached' : 'Not Reached';

        return {
          month: t.month,
          influencerId: t.influencerId,
          fullName: inf?.fullName || 'Unknown',
          tiktokUsername: inf?.tiktokUsername || '',
          category: inf?.category || '',
          salary: inf?.salary || 0,
          targetVideos,
          completedVideos,
          remainingVideos,
          progressPercentage,
          targetStatus,
          notes: t.notes,
        };
      });
      return res.json({ type, month: selectedMonth, rows });
    }

    case 'influencer-payment': {
      let payments = db.influencer_payments;
      if (selectedMonth && selectedMonth !== 'all') {
        payments = payments.filter(p => p.month === selectedMonth);
      }
      return res.json({ type, month: selectedMonth, rows: payments });
    }

    case 'billboard': {
      const rows = db.billboards.map(b => {
        const payments = db.billboard_payments.filter(p => p.billboardId === b.id);
        const totalPaid = payments.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
        const totalPending = payments.filter(p => p.paymentStatus !== 'Paid').reduce((sum, p) => sum + p.amount, 0);
        return {
          ...b,
          totalPaid,
          totalPending,
          paymentRecordsCount: payments.length,
        };
      });
      return res.json({ type, rows });
    }

    case 'lcd-screen': {
      const rows = db.lcd_screens.map(l => {
        const payments = db.lcd_payments.filter(p => p.lcdId === l.id);
        const totalPaid = payments.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
        const totalPending = payments.filter(p => p.paymentStatus !== 'Paid').reduce((sum, p) => sum + p.amount, 0);
        return {
          ...l,
          totalPaid,
          totalPending,
          paymentRecordsCount: payments.length,
        };
      });
      return res.json({ type, rows });
    }

    case 'budget-expense': {
      let expenses = db.expenses;
      if (selectedMonth && selectedMonth !== 'all') {
        expenses = expenses.filter(e => e.month === selectedMonth);
      }
      if (startDate) expenses = expenses.filter(e => e.date >= startDate);
      if (endDate) expenses = expenses.filter(e => e.date <= endDate);

      const budget = db.budgets.find(b => b.month === selectedMonth) || {
        totalBudget: 0,
        localBudget: 0,
        internationalBudget: 0,
      };

      const localSpent = expenses.filter(e => e.budgetPool === 'Local').reduce((sum, e) => sum + e.amount, 0);
      const intlSpent = expenses.filter(e => e.budgetPool === 'International').reduce((sum, e) => sum + e.amount, 0);
      const totalSpent = localSpent + intlSpent;

      return res.json({
        type,
        month: selectedMonth,
        budget,
        localSpent,
        intlSpent,
        totalSpent,
        remainingBalance: Math.max(0, budget.totalBudget - totalSpent),
        expenses,
      });
    }

    case 'payment': {
      let payments = [
        ...db.influencer_payments.map(p => ({
          type: 'Influencer',
          recipient: p.influencerName,
          amount: p.monthlySalary,
          status: p.paymentStatus,
          date: p.paymentDate,
          month: p.month,
          notes: p.notes,
        })),
        ...db.billboard_payments.map(p => ({
          type: 'Billboard',
          recipient: p.vendorName,
          amount: p.amount,
          status: p.paymentStatus,
          date: p.date,
          month: p.month,
          notes: p.notes,
        })),
        ...db.lcd_payments.map(p => ({
          type: 'LCD Screen',
          recipient: p.vendorName,
          amount: p.amount,
          status: p.paymentStatus,
          date: p.date,
          month: p.month,
          notes: p.notes,
        })),
      ];

      if (selectedMonth && selectedMonth !== 'all') {
        payments = payments.filter(p => p.month === selectedMonth);
      }
      if (startDate) payments = payments.filter(p => p.date >= startDate);
      if (endDate) payments = payments.filter(p => p.date <= endDate);

      return res.json({ type, month: selectedMonth, rows: payments });
    }

    case 'monthly-operations':
    default: {
      const budget = db.budgets.find(b => b.month === selectedMonth) || {
        totalBudget: 0,
        localBudget: 0,
        internationalBudget: 0,
      };

      const expenses = db.expenses.filter(e => e.month === selectedMonth);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      const targets = db.monthly_targets.filter(t => t.month === selectedMonth);
      const deliveries = db.deliveries.filter(d => d.month === selectedMonth);
      const infPayments = db.influencer_payments.filter(p => p.month === selectedMonth);
      const bbPayments = db.billboard_payments.filter(p => p.month === selectedMonth);
      const lcdPayments = db.lcd_payments.filter(p => p.month === selectedMonth);

      return res.json({
        type: 'monthly-operations',
        month: selectedMonth,
        budget,
        totalExpenses,
        remainingBudget: Math.max(0, budget.totalBudget - totalExpenses),
        activeInfluencersCount: db.influencers.filter(i => i.status === 'Active').length,
        targetsReachedCount: targets.filter(t => t.completedVideos >= t.targetVideos && t.targetVideos > 0).length,
        deliveriesCount: deliveries.length,
        deliveriesTotalValue: deliveries.reduce((sum, d) => sum + d.deliveryPrice * d.quantity, 0),
        influencerPaymentsTotal: infPayments.reduce((sum, p) => sum + p.monthlySalary, 0),
        billboardPaymentsTotal: bbPayments.reduce((sum, p) => sum + p.amount, 0),
        lcdPaymentsTotal: lcdPayments.reduce((sum, p) => sum + p.amount, 0),
        expensesBreakdown: {
          Local: expenses.filter(e => e.budgetPool === 'Local').reduce((sum, e) => sum + e.amount, 0),
          International: expenses.filter(e => e.budgetPool === 'International').reduce((sum, e) => sum + e.amount, 0),
          Influencers: expenses.filter(e => e.category === 'Influencers').reduce((sum, e) => sum + e.amount, 0),
          Billboards: expenses.filter(e => e.category === 'Billboards').reduce((sum, e) => sum + e.amount, 0),
          'LCD Screens': expenses.filter(e => e.category === 'LCD Screens').reduce((sum, e) => sum + e.amount, 0),
          Other: expenses.filter(e => e.category === 'Other').reduce((sum, e) => sum + e.amount, 0),
        },
      });
    }
  }
});
