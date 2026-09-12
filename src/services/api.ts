import {
  User,
  Influencer,
  MonthlyTargetEnriched,
  DeliveriesResponse,
  DeliveryRecord,
  InfluencerPayment,
  Billboard,
  BillboardPayment,
  LCDScreen,
  LCDPayment,
  MonthlyBudget,
  Expense,
  UnifiedPayment,
  DashboardData,
} from '../types';
import * as firestoreService from './firebaseService';

const TOKEN_KEY = 'mkt_enterprise_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // -----------------------------------------------------------
  // AUTH & USERS (Firebase Firestore & Firebase Auth)
  // -----------------------------------------------------------
  getUsers: async (): Promise<User[]> => {
    return await firestoreService.getFirestoreUsers();
  },
  createUser: async (data: any): Promise<User> => {
    return await firestoreService.createFirestoreSubUser(data);
  },
  updateUser: async (id: string, data: any): Promise<void> => {
    await firestoreService.updateFirestoreUser(id, data);
  },
  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    await firestoreService.deleteFirestoreUser(id);
    return { success: true };
  },

  // -----------------------------------------------------------
  // MONTHS (Operational accounting periods stored in Firestore)
  // -----------------------------------------------------------
  getMonths: async (): Promise<{ currentMonth: string; activeMonth: string; availableMonths: string[] }> => {
    return await firestoreService.getFirestoreMonths();
  },
  startNewMonth: async (month?: string): Promise<{ success: boolean; month: string }> => {
    return await firestoreService.startFirestoreNewMonth(month);
  },

  // -----------------------------------------------------------
  // DASHBOARD (Live calculated from Firestore)
  // -----------------------------------------------------------
  getDashboard: async (month?: string): Promise<DashboardData> => {
    try {
      const activeMonth = month || new Date().toISOString().slice(0, 7);
      const metrics = await firestoreService.getFirestoreDashboardMetrics(activeMonth);
      return metrics;
    } catch (err) {
      console.warn('[Firestore] Dashboard fallback to server:', err);
      return request<DashboardData>(`/api/dashboard${month ? `?month=${month}` : ''}`);
    }
  },

  // -----------------------------------------------------------
  // INFLUENCERS (Firebase Firestore)
  // -----------------------------------------------------------
  getInfluencers: async (): Promise<Influencer[]> => {
    try {
      return await firestoreService.getFirestoreInfluencers();
    } catch (err) {
      console.warn('[Firestore] Fallback getInfluencers to server:', err);
      return request<Influencer[]>('/api/influencers');
    }
  },
  createInfluencer: async (data: any): Promise<Influencer> => {
    try {
      return await firestoreService.addFirestoreInfluencer(data);
    } catch (err) {
      console.warn('[Firestore] Fallback createInfluencer to server:', err);
      return request<Influencer>('/api/influencers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateInfluencer: async (id: string, data: any): Promise<Influencer> => {
    try {
      await firestoreService.updateFirestoreInfluencer(id, data);
      return { id, ...data };
    } catch (err) {
      return request<Influencer>(`/api/influencers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  deleteInfluencer: async (id: string): Promise<{ success: boolean }> => {
    try {
      await firestoreService.deleteFirestoreInfluencer(id);
      return { success: true };
    } catch (err) {
      return request<{ success: boolean }>(`/api/influencers/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // -----------------------------------------------------------
  // TARGETS (Firebase Firestore)
  // -----------------------------------------------------------
  getTargets: async (month?: string): Promise<MonthlyTargetEnriched[]> => {
    const activeMonth = month || new Date().toISOString().slice(0, 7);
    try {
      return await firestoreService.getFirestoreMonthlyTargets(activeMonth);
    } catch (err) {
      return request<MonthlyTargetEnriched[]>(`/api/targets${month ? `?month=${month}` : ''}`);
    }
  },
  updateTarget: async (id: string, data: { completedVideos?: number; targetVideos?: number; notes?: string; influencerId?: string; month?: string }): Promise<any> => {
    try {
      const activeMonth = data.month || new Date().toISOString().slice(0, 7);
      if (data.influencerId) {
        await firestoreService.incrementFirestoreDeliverable(id, data.influencerId, activeMonth, data.notes);
        return { success: true };
      }
      return request<any>(`/api/targets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err) {
      return request<any>(`/api/targets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },

  // -----------------------------------------------------------
  // DELIVERIES (Firebase Firestore)
  // -----------------------------------------------------------
  getDeliveries: async (month?: string): Promise<DeliveriesResponse> => {
    try {
      return await firestoreService.getFirestoreDeliveries(month);
    } catch (err) {
      return request<DeliveriesResponse>(`/api/deliveries${month ? `?month=${month}` : ''}`);
    }
  },
  createDelivery: async (data: any): Promise<DeliveryRecord> => {
    try {
      return await firestoreService.addFirestoreDelivery(data);
    } catch (err) {
      return request<DeliveryRecord>('/api/deliveries', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateDelivery: (id: string, data: any) =>
    request<DeliveryRecord>(`/api/deliveries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDelivery: async (id: string): Promise<{ success: boolean }> => {
    try {
      await firestoreService.deleteFirestoreDelivery(id);
      return { success: true };
    } catch (err) {
      return request<{ success: boolean }>(`/api/deliveries/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // -----------------------------------------------------------
  // INFLUENCER PAYMENTS (Firebase Firestore)
  // -----------------------------------------------------------
  getInfluencerPayments: async (month?: string): Promise<InfluencerPayment[]> => {
    const activeMonth = month || new Date().toISOString().slice(0, 7);
    try {
      return await firestoreService.getFirestoreInfluencerPayments(activeMonth);
    } catch (err) {
      return request<InfluencerPayment[]>(`/api/influencer-payments${month ? `?month=${month}` : ''}`);
    }
  },
  requestInfluencerPayment: async (data: { influencerId: string; month?: string; notes?: string }): Promise<InfluencerPayment> => {
    try {
      const activeMonth = data.month || new Date().toISOString().slice(0, 7);
      const influencers = await firestoreService.getFirestoreInfluencers();
      const inf = influencers.find((i) => i.id === data.influencerId);
      const targets = await firestoreService.getFirestoreMonthlyTargets(activeMonth);
      const tgt = targets.find((t) => t.influencerId === data.influencerId);

      return await firestoreService.createFirestoreInfluencerPayment({
        month: activeMonth,
        influencerId: data.influencerId,
        influencerName: inf ? inf.fullName : 'Influencer',
        monthlySalary: inf ? inf.salary : 0,
        targetVideos: tgt ? tgt.targetVideos : 0,
        completedVideos: tgt ? tgt.completedVideos : 0,
        paymentStatus: 'Pending',
        paymentDate: `${activeMonth}-15`,
        notes: data.notes || '',
      });
    } catch (err) {
      return request<InfluencerPayment>('/api/influencer-payments/request', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateInfluencerPaymentStatus: async (
    id: string,
    data: { status: 'Approved' | 'Paid'; paymentDate?: string; notes?: string }
  ): Promise<InfluencerPayment> => {
    try {
      await firestoreService.updateFirestoreInfluencerPaymentStatus(id, data.status);
      return { id, paymentStatus: data.status } as any;
    } catch (err) {
      return request<InfluencerPayment>(`/api/influencer-payments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  },

  // -----------------------------------------------------------
  // BILLBOARDS & PAYMENTS (Firebase Firestore)
  // -----------------------------------------------------------
  getBillboards: async (): Promise<Billboard[]> => {
    try {
      return await firestoreService.getFirestoreBillboards();
    } catch (err) {
      return request<Billboard[]>('/api/billboards');
    }
  },
  createBillboard: async (data: any): Promise<Billboard> => {
    try {
      return await firestoreService.addFirestoreBillboard(data);
    } catch (err) {
      return request<Billboard>('/api/billboards', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateBillboard: async (id: string, data: any): Promise<Billboard> => {
    try {
      await firestoreService.updateFirestoreBillboard(id, data);
      return { id, ...data };
    } catch (err) {
      return request<Billboard>(`/api/billboards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  deleteBillboard: async (id: string): Promise<{ success: boolean }> => {
    try {
      await firestoreService.deleteFirestoreBillboard(id);
      return { success: true };
    } catch (err) {
      return request<{ success: boolean }>(`/api/billboards/${id}`, {
        method: 'DELETE',
      });
    }
  },
  getBillboardPayments: async (month?: string): Promise<BillboardPayment[]> => {
    const activeMonth = month || new Date().toISOString().slice(0, 7);
    try {
      return await firestoreService.getFirestoreBillboardPayments(activeMonth);
    } catch (err) {
      return request<BillboardPayment[]>(`/api/billboard-payments${month ? `?month=${month}` : ''}`);
    }
  },
  createBillboardPayment: async (data: any): Promise<BillboardPayment> => {
    try {
      return await firestoreService.createFirestoreBillboardPayment(data);
    } catch (err) {
      return request<BillboardPayment>('/api/billboard-payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateBillboardPaymentStatus: async (
    id: string,
    data: { status: 'Approved' | 'Paid'; date?: string; notes?: string }
  ): Promise<BillboardPayment> => {
    try {
      await firestoreService.updateFirestoreBillboardPaymentStatus(id, data.status);
      return { id, paymentStatus: data.status } as any;
    } catch (err) {
      return request<BillboardPayment>(`/api/billboard-payments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  },

  // -----------------------------------------------------------
  // LCD SCREENS & PAYMENTS (Firebase Firestore)
  // -----------------------------------------------------------
  getLCDScreens: async (): Promise<LCDScreen[]> => {
    try {
      return await firestoreService.getFirestoreLCDScreens();
    } catch (err) {
      return request<LCDScreen[]>('/api/lcd-screens');
    }
  },
  createLCDScreen: async (data: any): Promise<LCDScreen> => {
    try {
      return await firestoreService.addFirestoreLCDScreen(data);
    } catch (err) {
      return request<LCDScreen>('/api/lcd-screens', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateLCDScreen: async (id: string, data: any): Promise<LCDScreen> => {
    try {
      await firestoreService.updateFirestoreLCDScreen(id, data);
      return { id, ...data };
    } catch (err) {
      return request<LCDScreen>(`/api/lcd-screens/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  deleteLCDScreen: async (id: string): Promise<{ success: boolean }> => {
    try {
      await firestoreService.deleteFirestoreLCDScreen(id);
      return { success: true };
    } catch (err) {
      return request<{ success: boolean }>(`/api/lcd-screens/${id}`, {
        method: 'DELETE',
      });
    }
  },
  getLCDPayments: async (month?: string): Promise<LCDPayment[]> => {
    const activeMonth = month || new Date().toISOString().slice(0, 7);
    try {
      return await firestoreService.getFirestoreLCDPayments(activeMonth);
    } catch (err) {
      return request<LCDPayment[]>(`/api/lcd-payments${month ? `?month=${month}` : ''}`);
    }
  },
  createLCDPayment: async (data: any): Promise<LCDPayment> => {
    try {
      return await firestoreService.createFirestoreLCDPayment(data);
    } catch (err) {
      return request<LCDPayment>('/api/lcd-payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateLCDPaymentStatus: async (
    id: string,
    data: { status: 'Approved' | 'Paid'; date?: string; notes?: string }
  ): Promise<LCDPayment> => {
    try {
      await firestoreService.updateFirestoreLCDPaymentStatus(id, data.status);
      return { id, paymentStatus: data.status } as any;
    } catch (err) {
      return request<LCDPayment>(`/api/lcd-payments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  },

  // -----------------------------------------------------------
  // BUDGET & EXPENSES (Firebase Firestore)
  // -----------------------------------------------------------
  getBudget: async (month?: string): Promise<MonthlyBudget> => {
    const activeMonth = month || new Date().toISOString().slice(0, 7);
    try {
      return await firestoreService.getFirestoreBudget(activeMonth);
    } catch (err) {
      return request<MonthlyBudget>(`/api/budgets${month ? `?month=${month}` : ''}`);
    }
  },
  saveBudget: async (data: any): Promise<MonthlyBudget> => {
    const activeMonth = data.month || new Date().toISOString().slice(0, 7);
    try {
      return await firestoreService.saveFirestoreBudget(activeMonth, data, 'user');
    } catch (err) {
      return request<MonthlyBudget>('/api/budgets', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  getExpenses: async (month?: string): Promise<Expense[]> => {
    try {
      return await firestoreService.getFirestoreExpenses(month);
    } catch (err) {
      return request<Expense[]>(`/api/expenses${month ? `?month=${month}` : ''}`);
    }
  },
  createExpense: async (data: any): Promise<Expense> => {
    try {
      return await firestoreService.addFirestoreExpense(data);
    } catch (err) {
      return request<Expense>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  updateExpense: (id: string, data: any) =>
    request<Expense>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteExpense: async (id: string): Promise<{ success: boolean }> => {
    try {
      await firestoreService.deleteFirestoreExpense(id);
      return { success: true };
    } catch (err) {
      return request<{ success: boolean }>(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // -----------------------------------------------------------
  // PAYMENTS CENTRAL (Consolidated across Firestore collections)
  // -----------------------------------------------------------
  getPayments: async (params?: { month?: string; status?: string; type?: string }) => {
    const activeMonth = params?.month || new Date().toISOString().slice(0, 7);
    try {
      const [infPayments, bbPayments, lcdPayments] = await Promise.all([
        firestoreService.getFirestoreInfluencerPayments(activeMonth),
        firestoreService.getFirestoreBillboardPayments(activeMonth),
        firestoreService.getFirestoreLCDPayments(activeMonth),
      ]);

      const all: UnifiedPayment[] = [];

      infPayments.forEach((p) => {
        all.push({
          id: p.id,
          sourceType: 'Influencer',
          sourceId: p.influencerId,
          recipient: p.influencerName || 'Influencer',
          category: 'Influencer Retainer',
          amount: p.monthlySalary,
          status: p.paymentStatus,
          date: p.paymentDate || `${p.month}-15`,
          notes: p.notes,
          month: p.month,
          details: { completedVideos: p.completedVideos, targetVideos: p.targetVideos },
        });
      });

      bbPayments.forEach((p) => {
        all.push({
          id: p.id,
          sourceType: 'Billboard',
          sourceId: p.billboardId,
          recipient: p.vendorName || 'Billboard Vendor',
          category: 'Outdoor Billboard Lease',
          amount: p.amount,
          status: p.paymentStatus,
          date: p.date,
          notes: p.notes,
          month: p.month,
        });
      });

      lcdPayments.forEach((p) => {
        all.push({
          id: p.id,
          sourceType: 'LCD Screen',
          sourceId: p.lcdId,
          recipient: p.vendorName || 'LCD Vendor',
          category: 'Commercial LCD Lease',
          amount: p.amount,
          status: p.paymentStatus,
          date: p.date,
          notes: p.notes,
          month: p.month,
        });
      });

      let filtered = all;
      if (params?.status && params.status !== 'All') {
        filtered = filtered.filter((p) => p.status.toLowerCase() === params.status?.toLowerCase());
      }
      if (params?.type && params.type !== 'All') {
        filtered = filtered.filter((p) => p.sourceType.toLowerCase() === params.type?.toLowerCase());
      }

      let totalAmount = 0;
      let pendingAmount = 0;
      let paidAmount = 0;

      filtered.forEach((p) => {
        totalAmount += p.amount;
        if (p.status === 'Paid') paidAmount += p.amount;
        else pendingAmount += p.amount;
      });

      return {
        payments: filtered,
        summary: {
          totalCount: filtered.length,
          totalAmount,
          pendingAmount,
          paidAmount,
        },
      };
    } catch (err) {
      const q = new URLSearchParams();
      if (params?.month) q.set('month', params.month);
      if (params?.status) q.set('status', params.status);
      if (params?.type) q.set('type', params.type);
      return request<{
        payments: UnifiedPayment[];
        summary: { totalCount: number; totalAmount: number; pendingAmount: number; paidAmount: number };
      }>(`/api/payments?${q.toString()}`);
    }
  },
  updatePaymentStatus: async (
    sourceType: string,
    id: string,
    data: { status: 'Approved' | 'Paid'; date?: string; notes?: string }
  ) => {
    try {
      if (sourceType === 'Influencer') {
        await firestoreService.updateFirestoreInfluencerPaymentStatus(id, data.status);
      } else if (sourceType === 'Billboard') {
        await firestoreService.updateFirestoreBillboardPaymentStatus(id, data.status);
      } else if (sourceType === 'LCD Screen') {
        await firestoreService.updateFirestoreLCDPaymentStatus(id, data.status);
      }
      return { success: true };
    } catch (err) {
      return request<any>(`/api/payments/${sourceType}/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  },

  // -----------------------------------------------------------
  // REPORTS
  // -----------------------------------------------------------
  getReport: (params: { type: string; month?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams(params as any);
    return request<any>(`/api/reports?${q.toString()}`);
  },
};
