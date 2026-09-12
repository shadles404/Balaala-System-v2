export interface UserPermissions {
  // Influencer Operations
  viewInfluencers: boolean;
  addInfluencers: boolean;
  updateInfluencers: boolean;
  deleteInfluencers: boolean;

  // Product Deliveries
  viewProducts: boolean;
  addProducts: boolean;
  updateProducts: boolean;
  deleteProducts: boolean;

  // Outdoor & Digital Signage Media
  manageBillboards: boolean;
  manageLCDScreens: boolean;

  // Marketing Campaigns & Operational Budgets
  manageCampaigns: boolean;
  viewExpenses: boolean;
  addExpenses: boolean;
  deleteExpenses: boolean;

  // Payroll & Lease Payments
  viewPayments: boolean;
  approvePayments: boolean;

  // Executive Reports
  viewReports: boolean;

  // System Administration (Admin only)
  manageUsers: boolean;

  // Backward compatibility alias keys
  influencers?: boolean;
  targets?: boolean;
  deliveries?: boolean;
  billboards?: boolean;
  lcd_screens?: boolean;
  budgets?: boolean;
  expenses?: boolean;
  payments?: boolean;
  reports?: boolean;
  settings?: boolean;
}

export interface User {
  id: string;
  uid: string;
  email: string;
  username: string;
  fullName: string;
  role: 'admin' | 'sub_user';
  status: 'active' | 'inactive';
  permissions: UserPermissions;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
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

export interface MonthlyTargetEnriched {
  id: string;
  month: string;
  influencerId: string;
  influencerName: string;
  tiktokUsername: string;
  category: string;
  salary: number;
  influencerStatus: 'Active' | 'Inactive';
  targetVideos: number;
  completedVideos: number;
  remainingVideos: number;
  progressPercentage: number;
  targetStatus: 'Reached' | 'Not Reached';
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

export interface DeliveriesResponse {
  deliveries: DeliveryRecord[];
  summary: {
    totalDeliveryValue: number;
    totalPaidDeliveriesCount: number;
    totalPaidDeliveriesValue: number;
    totalUnpaidDeliveriesCount: number;
    totalUnpaidDeliveriesValue: number;
  };
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
  month: string;
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

export interface DashboardData {
  month: string;
  totalMarketingBudget: number;
  localBudget: number;
  internationalBudget: number;
  localExpenses: number;
  internationalExpenses: number;
  totalBudgetSpent: number;
  remainingBudget: number;
  totalPendingPayments: number;
  totalPaidPayments: number;
  activeInfluencers: number;
  influencersWhoReachedTarget: number;
  activeBillboards: number;
  activeLCDScreens: number;
  monthlyExpenses: number;
  categoryExpenses: {
    Influencers: number;
    Billboards: number;
    'LCD Screens': number;
    Other: number;
  };
}
