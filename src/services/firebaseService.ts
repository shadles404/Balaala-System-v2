import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../lib/firebase';
import type {
  User,
  UserPermissions,
  Influencer,
  MonthlyTargetEnriched,
  DeliveryRecord,
  DeliveriesResponse,
  InfluencerPayment,
  Billboard,
  BillboardPayment,
  LCDScreen,
  LCDPayment,
  MonthlyBudget,
  Expense,
  DashboardData,
} from '../types';

// Helper to remove undefined fields before writing to Firestore
function sanitizeDoc<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// -------------------------------------------------------------
// USER MANAGEMENT & PERMISSIONS
// -------------------------------------------------------------
export function getAllPermissionsTrue(): UserPermissions {
  return {
    viewInfluencers: true,
    addInfluencers: true,
    updateInfluencers: true,
    deleteInfluencers: true,
    viewProducts: true,
    addProducts: true,
    updateProducts: true,
    deleteProducts: true,
    manageBillboards: true,
    manageLCDScreens: true,
    manageCampaigns: true,
    viewExpenses: true,
    addExpenses: true,
    deleteExpenses: true,
    viewPayments: true,
    approvePayments: true,
    viewReports: true,
    manageUsers: true,
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
  };
}

export function getDefaultSubUserPermissions(): UserPermissions {
  return {
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
    influencers: true,
    targets: true,
    deliveries: true,
    billboards: false,
    lcd_screens: false,
    budgets: false,
    expenses: true,
    payments: true,
    reports: true,
    settings: false,
  };
}

export async function getFirestoreUsers(): Promise<User[]> {
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    const list: User[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        uid: data.uid || d.id,
        email: data.email || '',
        username: data.username || (data.email ? data.email.split('@')[0] : 'user'),
        fullName: data.fullName || 'Enterprise User',
        role: data.role || 'sub_user',
        status: data.status || 'active',
        permissions: data.permissions || getDefaultSubUserPermissions(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
        lastLogin: data.lastLogin,
      });
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Error fetching users:', err);
    return [];
  }
}

export async function getFirestoreUser(uid: string): Promise<User | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      uid: data.uid || snap.id,
      email: data.email || '',
      username: data.username || (data.email ? data.email.split('@')[0] : 'user'),
      fullName: data.fullName || 'Enterprise User',
      role: data.role || 'sub_user',
      status: data.status || 'active',
      permissions: data.permissions || getDefaultSubUserPermissions(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      lastLogin: data.lastLogin,
    };
  } catch (err) {
    console.warn(`[Firestore] Error fetching user ${uid}:`, err);
    return null;
  }
}

export async function ensureAdminProfile(uid: string, email: string, displayName?: string): Promise<User> {
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  const now = new Date().toISOString();

  if (snap.exists()) {
    const existing = snap.data();
    if (email === 'balaalabc@gmail.com' && existing.role !== 'admin') {
      await updateDoc(userDocRef, {
        role: 'admin',
        status: 'active',
        permissions: getAllPermissionsTrue(),
        updatedAt: now,
      });
      return {
        id: uid,
        uid,
        email,
        username: existing.username || 'admin',
        fullName: existing.fullName || displayName || 'Primary Administrator',
        role: 'admin',
        status: 'active',
        permissions: getAllPermissionsTrue(),
        createdAt: existing.createdAt || now,
        updatedAt: now,
      };
    }
    return {
      id: snap.id,
      uid: existing.uid || snap.id,
      email: existing.email || email,
      username: existing.username || email.split('@')[0],
      fullName: existing.fullName || displayName || 'Primary Administrator',
      role: existing.role || 'admin',
      status: existing.status || 'active',
      permissions: existing.permissions || getAllPermissionsTrue(),
      createdAt: existing.createdAt || now,
      updatedAt: existing.updatedAt,
      lastLogin: existing.lastLogin,
    };
  }

  // Create initial Admin document in Firestore
  const adminDoc: Omit<User, 'id'> = {
    uid,
    email,
    username: email.split('@')[0] || 'admin',
    fullName: displayName || 'Primary Administrator',
    role: 'admin',
    status: 'active',
    permissions: getAllPermissionsTrue(),
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
  };

  await setDoc(userDocRef, sanitizeDoc(adminDoc));
  return { id: uid, ...adminDoc };
}

export async function findFirestoreUserByEmail(email: string): Promise<User | null> {
  try {
    const colRef = collection(db, 'users');
    const q = query(colRef, where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();
      return {
        id: d.id,
        uid: data.uid || d.id,
        email: data.email || '',
        username: data.username || (data.email ? data.email.split('@')[0] : 'user'),
        fullName: data.fullName || 'Enterprise User',
        role: data.role || 'sub_user',
        status: data.status || 'active',
        permissions: data.permissions || getDefaultSubUserPermissions(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
        lastLogin: data.lastLogin,
      };
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] Error finding user by email:', err);
    return null;
  }
}

export async function syncAuthenticatedUserProfile(firebaseUser: {
  uid: string;
  email: string | null;
  displayName?: string | null;
}): Promise<User | null> {
  const email = (firebaseUser.email || '').trim().toLowerCase();
  if (!email) return null;

  // Primary administrator check
  if (email === 'balaalabc@gmail.com') {
    return await ensureAdminProfile(firebaseUser.uid, email, firebaseUser.displayName || 'Primary Administrator');
  }

  // 1. Check if user document already exists by uid
  const byUid = await getFirestoreUser(firebaseUser.uid);
  if (byUid) {
    if (byUid.status === 'inactive') {
      throw new Error('This account has been deactivated by the Administrator.');
    }
    // Update lastLogin & sync display name if available
    const updatedName = firebaseUser.displayName || byUid.fullName;
    await updateFirestoreUser(firebaseUser.uid, {
      lastLogin: new Date().toISOString(),
      fullName: updatedName,
    });
    return {
      ...byUid,
      fullName: updatedName,
      lastLogin: new Date().toISOString(),
    };
  }

  // 2. Check if pre-authorized by Admin using email
  const byEmail = await findFirestoreUserByEmail(email);
  if (byEmail) {
    if (byEmail.status === 'inactive') {
      throw new Error('This account has been deactivated by the Administrator.');
    }

    const now = new Date().toISOString();
    const syncedUser: Omit<User, 'id'> = {
      uid: firebaseUser.uid,
      email: byEmail.email,
      username: byEmail.username,
      fullName: firebaseUser.displayName || byEmail.fullName,
      role: byEmail.role,
      status: byEmail.status,
      permissions: byEmail.permissions,
      createdAt: byEmail.createdAt || now,
      updatedAt: now,
      lastLogin: now,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), sanitizeDoc(syncedUser));

    // If pre-authorized document had a temporary ID, remove it to prevent duplicate records
    if (byEmail.id !== firebaseUser.uid) {
      try {
        await deleteDoc(doc(db, 'users', byEmail.id));
      } catch (e) {
        console.warn('[Firestore] Cleaned up temporary user document:', e);
      }
    }

    return { id: firebaseUser.uid, ...syncedUser };
  }

  // Account not authorized by Administrator
  return null;
}

export const syncGoogleUserProfile = syncAuthenticatedUserProfile;

export async function createFirestoreSubUser(userData: {
  fullName: string;
  email: string;
  username?: string;
  password?: string;
  role: 'admin' | 'sub_user';
  status: 'active' | 'inactive';
  permissions: UserPermissions;
}): Promise<User> {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const now = new Date().toISOString();

  // Check if user with this email already exists
  const existing = await findFirestoreUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error(`A user with email "${normalizedEmail}" is already registered in the system.`);
  }

  let finalUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // If a password was provided (for email/password login), create Firebase Auth credentials using secondary app instance
  if (userData.password && userData.password.trim().length >= 6) {
    const secondaryAppName = `subuser_creator_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, userData.password.trim());
      finalUid = cred.user.uid;
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
    } catch (authErr: any) {
      try {
        await deleteApp(secondaryApp);
      } catch {}

      if (authErr.code === 'auth/email-already-in-use') {
        // If email already exists in Auth, we still create the Firestore record with a mapped ID
        console.warn('[Firebase Auth] Email already exists in Auth; linking Firestore profile');
      } else {
        throw authErr;
      }
    }
  }

  const newUser: Omit<User, 'id'> = {
    uid: finalUid,
    email: normalizedEmail,
    username: (userData.username || normalizedEmail.split('@')[0]).trim().toLowerCase(),
    fullName: userData.fullName.trim(),
    role: userData.role,
    status: userData.status,
    permissions: userData.permissions,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', finalUid), sanitizeDoc(newUser));
  return { id: finalUid, ...newUser };
}

export async function updateFirestoreUser(uid: string, updates: Partial<User>): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, sanitizeDoc({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

export async function deleteFirestoreUser(uid: string): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await deleteDoc(userDocRef);
}

export async function findUserEmailByUsername(username: string): Promise<string | null> {
  try {
    const colRef = collection(db, 'users');
    const q = query(colRef, where('username', '==', username.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data().email || null;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// -------------------------------------------------------------
// INFLUENCERS
// -------------------------------------------------------------
export async function getFirestoreInfluencers(): Promise<Influencer[]> {
  try {
    const colRef = collection(db, 'influencers');
    const snapshot = await getDocs(colRef);
    const list: Influencer[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<Influencer, 'id'>) });
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Error fetching influencers:', err);
    return [];
  }
}

export async function addFirestoreInfluencer(data: Omit<Influencer, 'id' | 'createdAt'>): Promise<Influencer> {
  const colRef = collection(db, 'influencers');
  const now = new Date().toISOString();
  const payload = sanitizeDoc({
    ...data,
    createdAt: now,
  });
  const docRef = await addDoc(colRef, payload);
  return {
    id: docRef.id,
    ...data,
    createdAt: now,
  };
}

export async function updateFirestoreInfluencer(id: string, updates: Partial<Influencer>): Promise<void> {
  const docRef = doc(db, 'influencers', id);
  await updateDoc(docRef, sanitizeDoc(updates));
}

export async function deleteFirestoreInfluencer(id: string): Promise<void> {
  const docRef = doc(db, 'influencers', id);
  await deleteDoc(docRef);
}

// -------------------------------------------------------------
// MONTHLY TARGETS
// -------------------------------------------------------------
export async function getFirestoreMonthlyTargets(month: string): Promise<MonthlyTargetEnriched[]> {
  const [influencers, targetsSnap] = await Promise.all([
    getFirestoreInfluencers(),
    getDocs(query(collection(db, 'monthly_targets'), where('month', '==', month))),
  ]);

  const targetsMap = new Map<string, any>();
  targetsSnap.forEach((d) => {
    targetsMap.set(d.data().influencerId, { id: d.id, ...d.data() });
  });

  const enriched: MonthlyTargetEnriched[] = influencers
    .filter((inf) => inf.status === 'Active')
    .map((inf) => {
      const existing = targetsMap.get(inf.id);
      const targetVideos = existing?.targetVideos ?? inf.targetVideosPerMonth;
      const completedVideos = existing?.completedVideos ?? 0;
      const remainingVideos = Math.max(0, targetVideos - completedVideos);
      const progressPercentage = targetVideos > 0 ? Math.min(100, Math.round((completedVideos / targetVideos) * 100)) : 0;
      const targetStatus: 'Reached' | 'Not Reached' = completedVideos >= targetVideos && targetVideos > 0 ? 'Reached' : 'Not Reached';

      return {
        id: existing?.id || `tgt_${month}_${inf.id}`,
        month,
        influencerId: inf.id,
        influencerName: inf.fullName,
        tiktokUsername: inf.tiktokUsername,
        category: inf.category,
        salary: inf.salary,
        influencerStatus: inf.status,
        targetVideos,
        completedVideos,
        remainingVideos,
        progressPercentage,
        targetStatus,
        notes: existing?.notes || '',
        updatedAt: existing?.updatedAt || new Date().toISOString(),
      };
    });

  return enriched;
}

export async function incrementFirestoreDeliverable(
  targetId: string,
  influencerId: string,
  month: string,
  notes: string = ''
): Promise<void> {
  const colRef = collection(db, 'monthly_targets');
  const q = query(colRef, where('month', '==', month), where('influencerId', '==', influencerId));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const d = snap.docs[0];
    const curCompleted = d.data().completedVideos || 0;
    await updateDoc(d.ref, {
      completedVideos: curCompleted + 1,
      notes: notes ? `${d.data().notes ? d.data().notes + '; ' : ''}${notes}` : d.data().notes || '',
      updatedAt: new Date().toISOString(),
    });
  } else {
    // create new target doc
    const influencers = await getFirestoreInfluencers();
    const inf = influencers.find((i) => i.id === influencerId);
    await addDoc(colRef, {
      month,
      influencerId,
      targetVideos: inf?.targetVideosPerMonth || 8,
      completedVideos: 1,
      notes,
      updatedAt: new Date().toISOString(),
    });
  }
}

// -------------------------------------------------------------
// DELIVERIES
// -------------------------------------------------------------
export async function getFirestoreDeliveries(month?: string): Promise<DeliveriesResponse> {
  const colRef = collection(db, 'deliveries');
  const q = month ? query(colRef, where('month', '==', month)) : colRef;
  const snap = await getDocs(q);

  const deliveries: DeliveryRecord[] = [];
  let totalDeliveryValue = 0;
  let totalPaidDeliveriesCount = 0;
  let totalPaidDeliveriesValue = 0;
  let totalUnpaidDeliveriesCount = 0;
  let totalUnpaidDeliveriesValue = 0;

  snap.forEach((d) => {
    const item = { id: d.id, ...(d.data() as Omit<DeliveryRecord, 'id'>) };
    deliveries.push(item);

    const val = Number(item.deliveryPrice || 0) * Number(item.quantity || 1);
    totalDeliveryValue += val;
    if (item.paymentStatus === 'Paid') {
      totalPaidDeliveriesCount += 1;
      totalPaidDeliveriesValue += val;
    } else {
      totalUnpaidDeliveriesCount += 1;
      totalUnpaidDeliveriesValue += val;
    }
  });

  return {
    deliveries,
    summary: {
      totalDeliveryValue,
      totalPaidDeliveriesCount,
      totalPaidDeliveriesValue,
      totalUnpaidDeliveriesCount,
      totalUnpaidDeliveriesValue,
    },
  };
}

export async function addFirestoreDelivery(data: Omit<DeliveryRecord, 'id' | 'createdAt'>): Promise<DeliveryRecord> {
  const colRef = collection(db, 'deliveries');
  const now = new Date().toISOString();
  const payload = sanitizeDoc({
    ...data,
    createdAt: now,
  });
  const docRef = await addDoc(colRef, payload);
  return {
    id: docRef.id,
    ...data,
    createdAt: now,
  };
}

export async function deleteFirestoreDelivery(id: string): Promise<void> {
  await deleteDoc(doc(db, 'deliveries', id));
}

// -------------------------------------------------------------
// INFLUENCER PAYMENTS
// -------------------------------------------------------------
export async function getFirestoreInfluencerPayments(month: string): Promise<InfluencerPayment[]> {
  const colRef = collection(db, 'influencer_payments');
  const q = query(colRef, where('month', '==', month));
  const snap = await getDocs(q);
  const list: InfluencerPayment[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...(d.data() as Omit<InfluencerPayment, 'id'>) });
  });
  return list;
}

export async function createFirestoreInfluencerPayment(data: Omit<InfluencerPayment, 'id' | 'createdAt'>): Promise<InfluencerPayment> {
  const colRef = collection(db, 'influencer_payments');
  const now = new Date().toISOString();
  const payload = sanitizeDoc({
    ...data,
    createdAt: now,
  });
  const docRef = await addDoc(colRef, payload);
  return {
    id: docRef.id,
    ...data,
    createdAt: now,
  };
}

export async function updateFirestoreInfluencerPaymentStatus(
  id: string,
  paymentStatus: 'Pending' | 'Approved' | 'Paid',
  approvedBy?: string
): Promise<void> {
  const docRef = doc(db, 'influencer_payments', id);
  const updates: Record<string, any> = { paymentStatus };
  if (approvedBy) updates.approvedBy = approvedBy;
  await updateDoc(docRef, updates);
}

// -------------------------------------------------------------
// BILLBOARDS & PAYMENTS
// -------------------------------------------------------------
export async function getFirestoreBillboards(): Promise<Billboard[]> {
  const colRef = collection(db, 'billboards');
  const snap = await getDocs(colRef);
  const list: Billboard[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...(d.data() as Omit<Billboard, 'id'>) });
  });
  return list;
}

export async function addFirestoreBillboard(data: Omit<Billboard, 'id' | 'createdAt'>): Promise<Billboard> {
  const colRef = collection(db, 'billboards');
  const now = new Date().toISOString();
  const payload = sanitizeDoc({ ...data, createdAt: now });
  const docRef = await addDoc(colRef, payload);
  return { id: docRef.id, ...data, createdAt: now };
}

export async function updateFirestoreBillboard(id: string, updates: Partial<Billboard>): Promise<void> {
  await updateDoc(doc(db, 'billboards', id), sanitizeDoc(updates));
}

export async function deleteFirestoreBillboard(id: string): Promise<void> {
  await deleteDoc(doc(db, 'billboards', id));
}

export async function getFirestoreBillboardPayments(month: string): Promise<BillboardPayment[]> {
  const q = query(collection(db, 'billboard_payments'), where('month', '==', month));
  const snap = await getDocs(q);
  const list: BillboardPayment[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...(d.data() as Omit<BillboardPayment, 'id'>) });
  });
  return list;
}

export async function createFirestoreBillboardPayment(data: Omit<BillboardPayment, 'id' | 'createdAt'>): Promise<BillboardPayment> {
  const now = new Date().toISOString();
  const payload = sanitizeDoc({ ...data, createdAt: now });
  const docRef = await addDoc(collection(db, 'billboard_payments'), payload);
  return { id: docRef.id, ...data, createdAt: now };
}

export async function updateFirestoreBillboardPaymentStatus(id: string, paymentStatus: 'Pending' | 'Approved' | 'Paid'): Promise<void> {
  await updateDoc(doc(db, 'billboard_payments', id), { paymentStatus });
}

// -------------------------------------------------------------
// LCD SCREENS & PAYMENTS
// -------------------------------------------------------------
export async function getFirestoreLCDScreens(): Promise<LCDScreen[]> {
  const colRef = collection(db, 'lcd_screens');
  const snap = await getDocs(colRef);
  const list: LCDScreen[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...(d.data() as Omit<LCDScreen, 'id'>) });
  });
  return list;
}

export async function addFirestoreLCDScreen(data: Omit<LCDScreen, 'id' | 'createdAt'>): Promise<LCDScreen> {
  const now = new Date().toISOString();
  const payload = sanitizeDoc({ ...data, createdAt: now });
  const docRef = await addDoc(collection(db, 'lcd_screens'), payload);
  return { id: docRef.id, ...data, createdAt: now };
}

export async function updateFirestoreLCDScreen(id: string, updates: Partial<LCDScreen>): Promise<void> {
  await updateDoc(doc(db, 'lcd_screens', id), sanitizeDoc(updates));
}

export async function deleteFirestoreLCDScreen(id: string): Promise<void> {
  await deleteDoc(doc(db, 'lcd_screens', id));
}

export async function getFirestoreLCDPayments(month: string): Promise<LCDPayment[]> {
  const q = query(collection(db, 'lcd_payments'), where('month', '==', month));
  const snap = await getDocs(q);
  const list: LCDPayment[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...(d.data() as Omit<LCDPayment, 'id'>) });
  });
  return list;
}

export async function createFirestoreLCDPayment(data: Omit<LCDPayment, 'id' | 'createdAt'>): Promise<LCDPayment> {
  const now = new Date().toISOString();
  const payload = sanitizeDoc({ ...data, createdAt: now });
  const docRef = await addDoc(collection(db, 'lcd_payments'), payload);
  return { id: docRef.id, ...data, createdAt: now };
}

export async function updateFirestoreLCDPaymentStatus(id: string, paymentStatus: 'Pending' | 'Approved' | 'Paid'): Promise<void> {
  await updateDoc(doc(db, 'lcd_payments', id), { paymentStatus });
}

// -------------------------------------------------------------
// BUDGETS & EXPENSES
// -------------------------------------------------------------
export async function getFirestoreBudget(month: string): Promise<MonthlyBudget> {
  const q = query(collection(db, 'budgets'), where('month', '==', month));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<MonthlyBudget, 'id'>) };
  }
  // Return clean zero budget for new months
  return {
    id: `bgt_${month}`,
    month,
    totalBudget: 0,
    localBudget: 0,
    internationalBudget: 0,
    notes: `Marketing budget for ${month}`,
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  };
}

export async function saveFirestoreBudget(month: string, data: { localBudget: number; internationalBudget: number; notes?: string }, username: string): Promise<MonthlyBudget> {
  const q = query(collection(db, 'budgets'), where('month', '==', month));
  const snap = await getDocs(q);
  const now = new Date().toISOString();
  const totalBudget = Number(data.localBudget || 0) + Number(data.internationalBudget || 0);

  if (!snap.empty) {
    const d = snap.docs[0];
    await updateDoc(d.ref, {
      totalBudget,
      localBudget: Number(data.localBudget || 0),
      internationalBudget: Number(data.internationalBudget || 0),
      notes: data.notes || '',
      updatedBy: username,
      updatedAt: now,
    });
    return {
      id: d.id,
      month,
      totalBudget,
      localBudget: Number(data.localBudget || 0),
      internationalBudget: Number(data.internationalBudget || 0),
      notes: data.notes || '',
      updatedBy: username,
      updatedAt: now,
    };
  } else {
    const payload = {
      month,
      totalBudget,
      localBudget: Number(data.localBudget || 0),
      internationalBudget: Number(data.internationalBudget || 0),
      notes: data.notes || '',
      updatedBy: username,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, 'budgets'), payload);
    return { id: docRef.id, ...payload };
  }
}

export async function getFirestoreExpenses(month?: string): Promise<Expense[]> {
  const colRef = collection(db, 'expenses');
  const q = month ? query(colRef, where('month', '==', month)) : colRef;
  const snap = await getDocs(q);
  const list: Expense[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) });
  });
  return list;
}

export async function addFirestoreExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const now = new Date().toISOString();
  const payload = sanitizeDoc({ ...data, createdAt: now });
  const docRef = await addDoc(collection(db, 'expenses'), payload);
  return { id: docRef.id, ...data, createdAt: now };
}

export async function deleteFirestoreExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id));
}

// -------------------------------------------------------------
// DASHBOARD METRICS
// -------------------------------------------------------------
export async function getFirestoreDashboardMetrics(month: string): Promise<DashboardData> {
  const [budget, expenses, infPayments, bbPayments, lcdPayments, influencers, targets] = await Promise.all([
    getFirestoreBudget(month),
    getFirestoreExpenses(month),
    getFirestoreInfluencerPayments(month),
    getFirestoreBillboardPayments(month),
    getFirestoreLCDPayments(month),
    getFirestoreInfluencers(),
    getFirestoreMonthlyTargets(month),
  ]);

  let localExpenses = 0;
  let internationalExpenses = 0;
  const categoryExpenses: Record<string, number> = {
    Influencers: 0,
    Billboards: 0,
    'LCD Screens': 0,
    Other: 0,
  };

  for (const exp of expenses) {
    const amt = Number(exp.amount || 0);
    if (exp.budgetPool === 'Local') localExpenses += amt;
    if (exp.budgetPool === 'International') internationalExpenses += amt;
    if (categoryExpenses[exp.category] !== undefined) {
      categoryExpenses[exp.category] += amt;
    } else {
      categoryExpenses.Other += amt;
    }
  }

  const totalBudgetSpent = localExpenses + internationalExpenses;
  const remainingBudget = Number(budget.totalBudget || 0) - totalBudgetSpent;

  let totalPendingPayments = 0;
  let totalPaidPayments = 0;

  for (const p of infPayments) {
    const amt = Number(p.monthlySalary || 0);
    if (p.paymentStatus === 'Paid') totalPaidPayments += amt;
    else totalPendingPayments += amt;
  }
  for (const p of bbPayments) {
    const amt = Number(p.amount || 0);
    if (p.paymentStatus === 'Paid') totalPaidPayments += amt;
    else totalPendingPayments += amt;
  }
  for (const p of lcdPayments) {
    const amt = Number(p.amount || 0);
    if (p.paymentStatus === 'Paid') totalPaidPayments += amt;
    else totalPendingPayments += amt;
  }

  const activeInfluencers = influencers.filter((i) => i.status === 'Active').length;
  const targetsReached = targets.filter((t) => t.targetStatus === 'Reached').length;

  const [billboards, lcdScreens] = await Promise.all([
    getFirestoreBillboards(),
    getFirestoreLCDScreens(),
  ]);

  return {
    month,
    totalMarketingBudget: Number(budget.totalBudget || 0),
    localBudget: Number(budget.localBudget || 0),
    internationalBudget: Number(budget.internationalBudget || 0),
    localExpenses,
    internationalExpenses,
    totalBudgetSpent,
    remainingBudget,
    totalPendingPayments,
    totalPaidPayments,
    activeInfluencers,
    influencersWhoReachedTarget: targetsReached,
    activeBillboards: billboards.filter((b) => b.status === 'Active').length,
    activeLCDScreens: lcdScreens.filter((s) => s.status === 'Active').length,
    monthlyExpenses: totalBudgetSpent,
    categoryExpenses: categoryExpenses as any,
  };
}

// ============================================================================
// OPERATIONAL MONTHS (Persistent in Firestore)
// ============================================================================
export async function getFirestoreMonths(): Promise<{ currentMonth: string; activeMonth: string; availableMonths: string[] }> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    const snap = await getDocs(collection(db, 'operational_months'));
    const monthSet = new Set<string>();
    monthSet.add(currentMonth);

    snap.forEach((d) => {
      const m = d.data().month || d.id;
      if (m && typeof m === 'string') monthSet.add(m);
    });

    // Also collect months from existing budgets if any
    const budgetSnap = await getDocs(collection(db, 'budgets'));
    budgetSnap.forEach((d) => {
      const m = d.data().month;
      if (m && typeof m === 'string') monthSet.add(m);
    });

    const sortedMonths = Array.from(monthSet).sort().reverse();
    return {
      currentMonth,
      activeMonth: sortedMonths[0] || currentMonth,
      availableMonths: sortedMonths,
    };
  } catch (e) {
    console.warn('[Firestore] Error reading operational months:', e);
    return {
      currentMonth,
      activeMonth: currentMonth,
      availableMonths: [currentMonth],
    };
  }
}

export async function startFirestoreNewMonth(targetMonth?: string): Promise<{ success: boolean; month: string }> {
  let m = targetMonth?.trim();
  if (!m) {
    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    m = nextMonthDate.toISOString().slice(0, 7);
  }

  try {
    // Record the month in Firestore
    await setDoc(doc(db, 'operational_months', m), {
      month: m,
      createdAt: new Date().toISOString(),
      status: 'active',
    }, { merge: true });

    // Initialize month targets for active influencers
    const infs = await getFirestoreInfluencers();
    const activeInfs = infs.filter((i) => i.status === 'Active');

    for (const inf of activeInfs) {
      const targetDocRef = doc(db, 'monthly_targets', `tgt_${m}_${inf.id}`);
      await setDoc(targetDocRef, {
        month: m,
        influencerId: inf.id,
        targetVideos: inf.targetVideosPerMonth || 4,
        completedVideos: 0,
        bonusEligible: false,
        notes: `Auto-initialized for operational period ${m}`,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return { success: true, month: m };
  } catch (e: any) {
    console.error('[Firestore] Error starting new month:', e);
    throw new Error(e.message || 'Failed to start operational month');
  }
}
