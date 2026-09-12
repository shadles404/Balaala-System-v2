import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface UserPermissions {
  influencers: boolean;
  targets: boolean;
  deliveries: boolean;
  billboards: boolean;
  lcd_screens: boolean;
  budgets: boolean;
  expenses: boolean;
  payments: boolean;
  reports: boolean;
  settings: boolean;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: 'admin' | 'sub_user';
  permissions: UserPermissions;
  canEditBudget: boolean;
  createdAt: string;
}

export interface Influencer {
  id: string;
  fullName: string;
  tiktokUsername: string;
  phoneNumber: string;
  category: string;
  targetVideosPerMonth: number;
  salary: number;
  agreementStartDate: string;
  agreementEndDate: string;
  status: 'Active' | 'Inactive';
  notes: string;
  createdAt: string;
}

export interface MonthlyTarget {
  id: string;
  month: string; // YYYY-MM
  influencerId: string;
  targetVideos: number;
  completedVideos: number;
  notes: string;
  updatedAt: string;
}

export interface DeliveryRecord {
  id: string;
  month: string;
  influencerId: string;
  influencerName: string;
  productName: string;
  quantity: number;
  deliveryPrice: number;
  deliveryDate: string;
  paymentStatus: 'Paid' | 'Pending';
  notes: string;
  createdAt: string;
}

export interface InfluencerPayment {
  id: string;
  month: string;
  influencerId: string;
  influencerName: string;
  monthlySalary: number;
  completedVideos: number;
  targetVideos: number;
  paymentStatus: 'Pending' | 'Approved' | 'Paid';
  paymentDate: string;
  notes: string;
  submittedBy?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface Billboard {
  id: string;
  vendorName: string;
  billboardSize: string;
  location: string;
  productBrand: string;
  rentalPrice: number;
  agreementStartDate: string;
  agreementEndDate: string;
  status: 'Active' | 'Inactive';
  notes: string;
  createdAt: string;
}

export interface BillboardPayment {
  id: string;
  month: string;
  billboardId: string;
  vendorName: string;
  amount: number;
  date: string;
  paymentStatus: 'Pending' | 'Approved' | 'Paid';
  notes: string;
  createdAt: string;
}

export interface LCDScreen {
  id: string;
  vendorName: string;
  screenSize: string;
  resolution: string;
  location: string;
  productBrand: string;
  rentalPrice: number;
  agreementStartDate: string;
  agreementEndDate: string;
  status: 'Active' | 'Inactive';
  notes: string;
  createdAt: string;
}

export interface LCDPayment {
  id: string;
  month: string;
  lcdId: string;
  vendorName: string;
  amount: number;
  date: string;
  paymentStatus: 'Pending' | 'Approved' | 'Paid';
  notes: string;
  createdAt: string;
}

export interface MonthlyBudget {
  id: string;
  month: string; // YYYY-MM
  totalBudget: number;
  localBudget: number;
  internationalBudget: number;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  month: string;
  budgetPool: 'Local' | 'International';
  category: 'Influencers' | 'Billboards' | 'LCD Screens' | 'Other';
  description: string;
  amount: number;
  date: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  influencers: Influencer[];
  monthly_targets: MonthlyTarget[];
  deliveries: DeliveryRecord[];
  influencer_payments: InfluencerPayment[];
  billboards: Billboard[];
  billboard_payments: BillboardPayment[];
  lcd_screens: LCDScreen[];
  lcd_payments: LCDPayment[];
  budgets: MonthlyBudget[];
  expenses: Expense[];
  active_month: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'marketing_database.json');

// Helper to get current month in YYYY-MM format
export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

let dbInstance: DatabaseSchema | null = null;

export function getDB(): DatabaseSchema {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbInstance = JSON.parse(content);
      return dbInstance!;
    } catch (e) {
      console.error('Failed to parse database file, re-initializing', e);
    }
  }

  const initialMonth = getCurrentMonthStr();

  // Create default admin user
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const staffPasswordHash = bcrypt.hashSync('staff123', 10);

  const defaultAdmin: User = {
    id: 'usr_admin_default',
    username: 'admin',
    passwordHash: adminPasswordHash,
    fullName: 'System Administrator',
    role: 'admin',
    permissions: {
      influencers: true,
      targets: true,
      deliveries: true,
      billboards: true,
      lcd_screens: true,
      budgets: true,
      expenses: true,
      payments: true,
      reports: true,
      settings: true,
    },
    canEditBudget: true,
    createdAt: new Date().toISOString(),
  };

  const defaultStaff: User = {
    id: 'usr_staff_marketing',
    username: 'marketing_staff',
    passwordHash: staffPasswordHash,
    fullName: 'Marketing Coordinator',
    role: 'sub_user',
    permissions: {
      influencers: true,
      targets: true,
      deliveries: true,
      billboards: true,
      lcd_screens: true,
      budgets: true,
      expenses: true,
      payments: true,
      reports: true,
      settings: false,
    },
    canEditBudget: false,
    createdAt: new Date().toISOString(),
  };

  dbInstance = {
    users: [defaultAdmin, defaultStaff],
    influencers: [],
    monthly_targets: [],
    deliveries: [],
    influencer_payments: [],
    billboards: [],
    billboard_payments: [],
    lcd_screens: [],
    lcd_payments: [],
    budgets: [],
    expenses: [],
    active_month: initialMonth,
  };

  saveDB();
  return dbInstance;
}

export function saveDB() {
  if (!dbInstance) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(dbInstance, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// Ensure monthly targets are initialized for all active influencers for a given month
export function ensureMonthInitialized(month: string) {
  const db = getDB();
  
  // Ensure a budget record exists for the month if not already created
  const existingBudget = db.budgets.find(b => b.month === month);
  if (!existingBudget) {
    db.budgets.push({
      id: `bgt_${month}`,
      month: month,
      totalBudget: 0,
      localBudget: 0,
      internationalBudget: 0,
      notes: `Budget for ${month}`,
      updatedBy: 'system',
      updatedAt: new Date().toISOString(),
    });
  }

  // For all active influencers, ensure there's a target tracking record for this month
  const activeInfluencers = db.influencers.filter(i => i.status === 'Active');
  for (const inf of activeInfluencers) {
    const existingTarget = db.monthly_targets.find(t => t.month === month && t.influencerId === inf.id);
    if (!existingTarget) {
      db.monthly_targets.push({
        id: `tgt_${month}_${inf.id}`,
        month,
        influencerId: inf.id,
        targetVideos: inf.targetVideosPerMonth,
        completedVideos: 0,
        notes: '',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  saveDB();
}
