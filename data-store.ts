// lib/data-store.ts
// طبقة بيانات موحدة تعمل مع Firebase (Admin SDK) أو وضع Demo (file-based JSON)
// كل العمليات async حتى تنتقل بسلاسة بين الوضعين

import { db, isFirebaseConfigured } from './firebase';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { getAdminDb, isAdminConfigured } from './firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// تحديد ما إذا كنا في server-side (API route) لاستخدام Admin SDK
const useAdmin = typeof window === 'undefined' && isAdminConfigured;

// ============= الأنواع =============
export type UserRole = 'ADMIN' | 'SALES' | 'ACCOUNTANT';

export interface UserT {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface VisitorT {
  id: string;
  visitorCode: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface VisitT {
  id: string;
  visitorId: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorCode?: string;
  visitDate: string;
  request?: string;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}

export interface CustomerT {
  id: string;
  customerCode: string;
  visitorId: string;
  nationalId?: string;
  name: string;
  phone?: string;
  phone2?: string;
  address?: string;
  createdAt: string;
}

export type VillaType = 'CONNECTED' | 'SEMI_DETACHED';
export type LotStatus = 'EMPTY' | 'SEMI_FINISHED' | 'READY';

export interface LotT {
  id: string;
  lotNumber: string;
  titleDeed?: string;
  villaType: VillaType;
  lotArea: number;
  gardenArea: number;
  groundFloorArea: number;
  totalBuiltArea: number;
  status: LotStatus;
  priceEmpty: number;
  priceSemiFinished: number;
  priceReady: number;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD';

export type NotificationType = 'NOTE' | 'TASK';

export interface NotificationT {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  fromUserId: string;
  fromUserName: string;
  toUserId?: string;
  targetRole?: string;
  lotId?: string;
  lotNumber?: string;
  read: boolean;
  completed: boolean;
  createdAt: string;
}

export interface SaleT {
  id: string;
  saleDate: string;
  customerId: string;
  customerName?: string;
  customerCode?: string;
  lotId: string;
  lotNumber?: string;
  salePrice: number;
  contractPdf?: string;
  contractName?: string;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}

export interface PaymentT {
  id: string;
  saleId: string;
  saleInfo?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentImage?: string;
  paymentImageName?: string;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}

// ============= Demo Store (file-based JSON) =============
const DEMO_FILE = path.join(process.cwd(), 'db', 'demo-data.json');

interface DemoData {
  users: UserT[];
  visitors: VisitorT[];
  visits: VisitT[];
  customers: CustomerT[];
  lots: LotT[];
  sales: SaleT[];
  payments: PaymentT[];
  notifications: NotificationT[];
}

function defaultData(): DemoData {
  const now = new Date().toISOString();
  return {
    users: [
      { id: 'u-admin', name: 'المدير العام', username: 'admin', pin: '1234', role: 'ADMIN', active: true, createdAt: now },
      { id: 'u-sales', name: 'موظف المبيعات', username: 'sales', pin: '2345', role: 'SALES', active: true, createdAt: now },
      { id: 'u-acc', name: 'المحاسب', username: 'accountant', pin: '3456', role: 'ACCOUNTANT', active: true, createdAt: now },
    ],
    visitors: [],
    visits: [],
    customers: [],
    lots: [],
    sales: [],
    payments: [],
    notifications: [],
  };
}

let cache: DemoData | null = null;
let writeTimer: NodeJS.Timeout | null = null;

function loadDemo(): DemoData {
  // في dev mode، اقرأ من الملف دائماً لأن الـ workers قد يكونون منفصلين
  try {
    if (fs.existsSync(DEMO_FILE)) {
      const raw = fs.readFileSync(DEMO_FILE, 'utf8');
      const data = JSON.parse(raw);
      const def = defaultData();
      for (const k of Object.keys(def) as (keyof DemoData)[]) {
        if (!data[k]) data[k] = (def as any)[k];
      }
      cache = data;
      return cache;
    }
  } catch (e) {
    console.error('Demo load error:', e);
  }
  cache = defaultData();
  saveDemo(cache, true);
  return cache;
}

function saveDemo(data: DemoData, immediate = false): void {
  cache = data;
  try {
    fs.mkdirSync(path.dirname(DEMO_FILE), { recursive: true });
    fs.writeFileSync(DEMO_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Demo save error:', e);
  }
}

// قراءة-تعديل-كتابة atomic (لتجنب مشاكل الـ workers في dev mode)
function mutate<T>(name: CollectionName, fn: (arr: any[]) => T): T {
  const d = loadDemo();
  const arr = (d as any)[name] as any[];
  const result = fn(arr);
  saveDemo(d);
  return result;
}

// ============= عدّادات تلقائية =============
async function nextCode(collection: 'visitors' | 'customers'): Promise<string> {
  const prefix = collection === 'visitors' ? 'VIS' : 'CUS';
  const items = await getAll(collection);
  const max = items.reduce((m, x) => {
    const n = parseInt((x.visitorCode || x.customerCode || '').split('-')[1] || '0', 10);
    return n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

// ============= API الموحد =============
type CollectionName = 'users' | 'visitors' | 'visits' | 'customers' | 'lots' | 'sales' | 'payments' | 'notifications';

async function getAll(name: CollectionName): Promise<any[]> {
  // أولوية: Admin SDK (server-side) → Client SDK → Demo
  if (useAdmin) {
    const adminDb = getAdminDb();
    const snap = await adminDb.collection(name).get();
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    arr.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    return arr;
  }
  if (isFirebaseConfigured && db) {
    const snap = await getDocs(collection(db, name));
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    arr.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    return arr;
  }
  return (loadDemo() as any)[name] as any[];
}

async function getById(name: CollectionName, id: string): Promise<any | null> {
  if (useAdmin) {
    const adminDb = getAdminDb();
    const snap = await adminDb.collection(name).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db!, name, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  const arr = (loadDemo() as any)[name] as any[];
  return arr.find(x => x.id === id) || null;
}

async function create(name: CollectionName, data: any): Promise<any> {
  if (useAdmin) {
    const adminDb = getAdminDb();
    const ref = await adminDb.collection(name).add(data);
    return { id: ref.id, ...data };
  }
  if (isFirebaseConfigured && db) {
    const id = (await addDoc(collection(db!, name), data)).id;
    return { id, ...data };
  }
  const id = `local-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  mutate(name, arr => arr.push({ id, ...data }));
  return { id, ...data };
}

async function update(name: CollectionName, id: string, data: any): Promise<void> {
  if (useAdmin) {
    const adminDb = getAdminDb();
    await adminDb.collection(name).doc(id).update(data);
    return;
  }
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db!, name, id), data);
    return;
  }
  mutate(name, arr => {
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...data };
  });
}

async function remove(name: CollectionName, id: string): Promise<void> {
  if (useAdmin) {
    const adminDb = getAdminDb();
    await adminDb.collection(name).doc(id).delete();
    return;
  }
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db!, name, id));
    return;
  }
  mutate(name, arr => {
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
}

// ============= الواجهات المتخصصة =============

// --- المستخدمون ---
export const Users = {
  async findByPin(pin: string, username?: string): Promise<UserT | null> {
    const all = await getAll('users');
    const u = all.find(x => x.pin === pin && x.active && (!username || x.username === username));
    return u || null;
  },
  async findByUsername(username: string): Promise<UserT | null> {
    const all = await getAll('users');
    return all.find(x => x.username === username) || null;
  },
  async list(): Promise<UserT[]> { return getAll('users'); },
  async create(data: Partial<UserT>): Promise<UserT> {
    return create('users', {
      name: data.name || '',
      username: data.username || '',
      pin: data.pin || '0000',
      role: data.role || 'SALES',
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
    });
  },
  async update(id: string, data: Partial<UserT>): Promise<void> { return update('users', id, data); },
  async delete(id: string): Promise<void> { return remove('users', id); },
};

// --- الزوار ---
export const Visitors = {
  async list(): Promise<VisitorT[]> { return getAll('visitors'); },
  async get(id: string): Promise<VisitorT | null> { return getById('visitors', id); },
  async create(data: Partial<VisitorT>): Promise<VisitorT> {
    const visitorCode = data.visitorCode || await nextCode('visitors');
    return create('visitors', {
      visitorCode,
      name: data.name || '',
      phone: data.phone || '',
      createdAt: new Date().toISOString(),
    });
  },
  async update(id: string, data: Partial<VisitorT>): Promise<void> { return update('visitors', id, data); },
  async delete(id: string): Promise<void> {
    const visits = await Visits.list();
    for (const v of visits) {
      if (v.visitorId === id) await Visits.delete(v.id);
    }
    const customers = await Customers.list();
    if (customers.some(c => c.visitorId === id)) {
      throw new Error('لا يمكن حذف الزائر، تم تحويله إلى زبون');
    }
    return remove('visitors', id);
  },
};

// --- الزيارات ---
export const Visits = {
  async list(): Promise<VisitT[]> { return getAll('visits'); },
  async create(data: Partial<VisitT>): Promise<VisitT> {
    const visitor = data.visitorId ? await Visitors.get(data.visitorId) : null;
    return create('visits', {
      visitorId: data.visitorId || '',
      visitorName: visitor?.name || data.visitorName || '',
      visitorPhone: visitor?.phone || data.visitorPhone || '',
      visitorCode: visitor?.visitorCode || data.visitorCode || '',
      visitDate: data.visitDate || new Date().toISOString(),
      request: data.request || '',
      notes: data.notes || '',
      createdById: data.createdById || '',
      createdByName: data.createdByName || '',
      createdAt: new Date().toISOString(),
    });
  },
  async update(id: string, data: Partial<VisitT>): Promise<void> { return update('visits', id, data); },
  async delete(id: string): Promise<void> { return remove('visits', id); },
};

// --- الزبناء ---
export const Customers = {
  async list(): Promise<CustomerT[]> { return getAll('customers'); },
  async get(id: string): Promise<CustomerT | null> { return getById('customers', id); },
  async createFromVisitor(visitorId: string, extra?: Partial<CustomerT>): Promise<CustomerT> {
    const visitor = await Visitors.get(visitorId);
    if (!visitor) throw new Error('الزائر غير موجود');
    const existing = (await getAll('customers')).find(c => c.visitorId === visitorId);
    if (existing) throw new Error('هذا الزائر محوّل إلى زبون مسبقاً');
    const customerCode = await nextCode('customers');
    return create('customers', {
      customerCode,
      visitorId,
      nationalId: extra?.nationalId || '',
      name: extra?.name || visitor.name,
      phone: extra?.phone || visitor.phone || '',
      phone2: extra?.phone2 || '',
      address: extra?.address || '',
      createdAt: new Date().toISOString(),
    });
  },
  async update(id: string, data: Partial<CustomerT>): Promise<void> { return update('customers', id, data); },
  async delete(id: string): Promise<void> {
    const sales = await Sales.list();
    if (sales.some(s => s.customerId === id)) {
      throw new Error('لا يمكن حذف الزبون، لديه عمليات بيع');
    }
    return remove('customers', id);
  },
};

// --- البقع ---
export const Lots = {
  async list(): Promise<LotT[]> { return getAll('lots'); },
  async get(id: string): Promise<LotT | null> { return getById('lots', id); },
  async create(data: Partial<LotT>): Promise<LotT> {
    const existing = (await getAll('lots')).find(l => l.lotNumber === data.lotNumber);
    if (existing) throw new Error('رقم البقعة موجود مسبقاً');
    return create('lots', {
      lotNumber: data.lotNumber || '',
      titleDeed: data.titleDeed || '',
      villaType: data.villaType || 'CONNECTED',
      lotArea: Number(data.lotArea) || 0,
      gardenArea: Number(data.gardenArea) || 0,
      groundFloorArea: Number(data.groundFloorArea) || 0,
      totalBuiltArea: Number(data.totalBuiltArea) || 0,
      status: data.status || 'EMPTY',
      priceEmpty: Number(data.priceEmpty) || 0,
      priceSemiFinished: Number(data.priceSemiFinished) || 0,
      priceReady: Number(data.priceReady) || 0,
      createdAt: new Date().toISOString(),
    });
  },
  async update(id: string, data: Partial<LotT>): Promise<void> { return update('lots', id, data); },
  async delete(id: string): Promise<void> {
    const sales = await Sales.list();
    if (sales.some(s => s.lotId === id)) {
      throw new Error('لا يمكن حذف البقعة، تم بيعها');
    }
    return remove('lots', id);
  },
  currentPrice(lot: LotT): number {
    if (lot.status === 'READY') return lot.priceReady;
    if (lot.status === 'SEMI_FINISHED') return lot.priceSemiFinished;
    return lot.priceEmpty;
  },
  async availability(lotId: string): Promise<'AVAILABLE' | 'RESERVED' | 'SOLD'> {
    const sales = await getAll('sales');
    if (sales.some((s: any) => s.lotId === lotId)) return 'SOLD';
    const lots = await getAll('lots');
    const lot = lots.find((l: any) => l.id === lotId);
    if (lot?.reserved) return 'RESERVED';
    return 'AVAILABLE';
  },
  async reserve(id: string, data: { customerName: string; notes?: string; reservedBy: string; reservedByName: string }): Promise<void> {
    return update('lots', id, {
      reserved: true,
      reservedCustomerName: data.customerName,
      reservedNotes: data.notes || '',
      reservedBy: data.reservedBy,
      reservedByName: data.reservedByName,
      reservedAt: new Date().toISOString(),
    } as any);
  },
  async unreserve(id: string): Promise<void> {
    return update('lots', id, {
      reserved: false,
      reservedCustomerName: '',
      reservedNotes: '',
      reservedBy: '',
      reservedByName: '',
      reservedAt: '',
    } as any);
  },
};

// --- المبيعات ---
export const Sales = {
  async list(): Promise<SaleT[]> { return getAll('sales'); },
  async get(id: string): Promise<SaleT | null> { return getById('sales', id); },
  async create(data: Partial<SaleT>): Promise<SaleT> {
    const customer = data.customerId ? await Customers.get(data.customerId) : null;
    const lot = data.lotId ? await Lots.get(data.lotId) : null;
    const sales = await getAll('sales');
    if (sales.some((s: any) => s.lotId === data.lotId)) {
      throw new Error('هذه البقعة مبيعة مسبقاً');
    }
    return create('sales', {
      saleDate: data.saleDate || new Date().toISOString(),
      customerId: data.customerId || '',
      customerName: customer?.name || '',
      customerCode: customer?.customerCode || '',
      lotId: data.lotId || '',
      lotNumber: lot?.lotNumber || '',
      salePrice: Number(data.salePrice) || 0,
      contractPdf: data.contractPdf || '',
      contractName: data.contractName || '',
      notes: data.notes || '',
      createdById: data.createdById || '',
      createdByName: data.createdByName || '',
      createdAt: new Date().toISOString(),
    });
  },
  async update(id: string, data: Partial<SaleT>): Promise<void> { return update('sales', id, data); },
  async delete(id: string): Promise<void> {
    const payments = await Payments.list();
    for (const p of payments) {
      if (p.saleId === id) await Payments.delete(p.id);
    }
    return remove('sales', id);
  },
  async summary(saleId: string) {
    const sale = await Sales.get(saleId);
    if (!sale) return null;
    const payments = (await Payments.list()).filter(p => p.saleId === saleId);
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = sale.salePrice - paid;
    const percent = sale.salePrice > 0 ? (paid / sale.salePrice) * 100 : 0;
    return { sale, payments, paid, remaining, percent };
  },
};

// --- الدفعات ---
export const Payments = {
  async list(): Promise<PaymentT[]> { return getAll('payments'); },
  async create(data: Partial<PaymentT>): Promise<PaymentT> {
    const sale = data.saleId ? await Sales.get(data.saleId) : null;
    return create('payments', {
      saleId: data.saleId || '',
      saleInfo: sale ? `${sale.lotNumber} - ${sale.customerName}` : '',
      paymentDate: data.paymentDate || new Date().toISOString(),
      amount: Number(data.amount) || 0,
      paymentMethod: data.paymentMethod || 'CASH',
      paymentImage: data.paymentImage || '',
      paymentImageName: data.paymentImageName || '',
      notes: data.notes || '',
      createdById: data.createdById || '',
      createdByName: data.createdByName || '',
      createdAt: new Date().toISOString(),
    });
  },
  async update(id: string, data: Partial<PaymentT>): Promise<void> { return update('payments', id, data); },
  async delete(id: string): Promise<void> { return remove('payments', id); },
};

// --- البحث الموحد ---
export const Search = {
  async search(q: string) {
    const term = q.trim().toLowerCase();
    if (!term) return { visitors: [], visits: [], customers: [], lots: [], sales: [], payments: [] };
    const [visitors, visits, customers, lots, sales, payments] = await Promise.all([
      Visitors.list(), Visits.list(), Customers.list(),
      Lots.list(), Sales.list(), Payments.list(),
    ]);
    return {
      visitors: visitors.filter(v =>
        v.name.toLowerCase().includes(term) ||
        (v.phone || '').includes(term) ||
        v.visitorCode.toLowerCase().includes(term)
      ),
      visits: visits.filter(v =>
        (v.visitorName || '').toLowerCase().includes(term) ||
        (v.request || '').toLowerCase().includes(term) ||
        (v.notes || '').toLowerCase().includes(term) ||
        (v.visitorCode || '').toLowerCase().includes(term)
      ),
      customers: customers.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.phone || '').includes(term) ||
        (c.phone2 || '').includes(term) ||
        (c.nationalId || '').includes(term) ||
        c.customerCode.toLowerCase().includes(term)
      ),
      lots: lots.filter(l =>
        l.lotNumber.toLowerCase().includes(term) ||
        (l.titleDeed || '').toLowerCase().includes(term)
      ),
      sales: sales.filter(s =>
        (s.customerName || '').toLowerCase().includes(term) ||
        (s.lotNumber || '').toLowerCase().includes(term) ||
        (s.customerCode || '').toLowerCase().includes(term)
      ),
      payments: payments.filter(p =>
        (p.saleInfo || '').toLowerCase().includes(term) ||
        (p.notes || '').toLowerCase().includes(term)
      ),
    };
  },
};

// --- إحصائيات لوحة التحكم ---
export const Dashboard = {
  async stats() {
    const [visitors, customers, lots, sales, payments] = await Promise.all([
      Visitors.list(), Customers.list(), Lots.list(),
      Sales.list(), Payments.list(),
    ]);
    const soldLotIds = new Set(sales.map(s => s.lotId));
    const soldCount = lots.filter(l => soldLotIds.has(l.id)).length;
    const availableCount = lots.length - soldCount;
    const totalSales = sales.reduce((s, x) => s + x.salePrice, 0);
    const totalCollected = payments.reduce((s, x) => s + x.amount, 0);
    const totalRemaining = totalSales - totalCollected;
    return {
      visitorsCount: visitors.length,
      customersCount: customers.length,
      lotsCount: lots.length,
      soldCount, availableCount,
      totalSales, totalCollected, totalRemaining,
    };
  },
};

// --- النسخ الاحتياطي ---
export const Backup = {
  async exportAll() {
    const [users, visitors, visits, customers, lots, sales, payments, notifications] = await Promise.all([
      Users.list(), Visitors.list(), Visits.list(), Customers.list(),
      Lots.list(), Sales.list(), Payments.list(), Notifications.list(),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      data: { users, visitors, visits, customers, lots, sales, payments, notifications },
    };
  },
};

// --- المراسلات الداخلية ---
export const Notifications = {
  async list(): Promise<NotificationT[]> {
    const all = await getAll('notifications');
    return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  async forUser(userId: string, userRole: string): Promise<NotificationT[]> {
    const all = await getAll('notifications');
    return all
      .filter((n: any) =>
        !n.toUserId || n.toUserId === userId || !n.targetRole || n.targetRole === userRole
      )
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  async unreadCount(userId: string, userRole: string): Promise<number> {
    const msgs = await this.forUser(userId, userRole);
    return msgs.filter((n: any) => !n.read).length;
  },
  async create(data: Partial<NotificationT>): Promise<NotificationT> {
    return create('notifications', {
      type: data.type || 'NOTE',
      title: data.title || '',
      message: data.message || '',
      fromUserId: data.fromUserId || '',
      fromUserName: data.fromUserName || '',
      toUserId: data.toUserId || '',
      targetRole: data.targetRole || '',
      lotId: data.lotId || '',
      lotNumber: data.lotNumber || '',
      read: false,
      completed: false,
      createdAt: new Date().toISOString(),
    });
  },
  async markRead(id: string): Promise<void> { return update('notifications', id, { read: true } as any); },
  async markCompleted(id: string): Promise<void> { return update('notifications', id, { completed: true, read: true } as any); },
  async delete(id: string): Promise<void> { return remove('notifications', id); },
};
