import { CustomerUser } from '../types';
import { 
  syncCustomerToSupabase, 
  fetchCustomersFromSupabase, 
  deleteCustomerFromSupabase 
} from '../lib/supabase';

const STORAGE_KEY_ALL_CUSTOMERS = 'abiodh_taxis_all_customers';

// قائمة افتراضية أولية للزبائن المسجلين بالأبيض سيدي الشيخ
export const INITIAL_CUSTOMERS: CustomerUser[] = [
  {
    id: 'cust-101',
    name: 'أحمد بن الشيخ بوعمامة',
    email: 'ahmed.bouamama@gmail.com',
    isVerified: true,
    status: 'active',
    registeredAt: Date.now() - 86400000 * 14, // قبل 14 يوم
    totalTrips: 12,
    notes: 'زبون دائم ومحترم - رحلات متكررة من حي النصر للمستشفى الجديد',
  },
  {
    id: 'cust-102',
    name: 'فاطمة الزهراء قدوري',
    email: 'fatima.kaddouri@outlook.com',
    isVerified: true,
    status: 'active',
    registeredAt: Date.now() - 86400000 * 8, // قبل 8 أيام
    totalTrips: 7,
    notes: 'تفضل فئة التاكسي العائلية',
  },
  {
    id: 'cust-103',
    name: 'محمد الهواري بن عيسى',
    email: 'mohamed.houari@gmail.com',
    isVerified: true,
    status: 'active',
    registeredAt: Date.now() - 86400000 * 5,
    totalTrips: 4,
    notes: 'رحلات يومية إلى المحطة البرية',
  },
  {
    id: 'cust-104',
    name: 'ياسين بلخيري',
    email: 'yacine.belkheiri@yahoo.com',
    isVerified: false,
    status: 'active',
    registeredAt: Date.now() - 86400000 * 2,
    totalTrips: 1,
    notes: 'حساب جديد لم يكمل توثيق الـ OTP',
  },
  {
    id: 'cust-105',
    name: 'عمر بن زيان',
    email: 'omar.benziyan@gmail.com',
    isVerified: true,
    status: 'suspended',
    registeredAt: Date.now() - 86400000 * 25,
    totalTrips: 3,
    notes: 'تم تعليق الحساب مؤقتاً بسبب تكرار إلغاء الرحلات بعد وصول السائق',
  },
];

/**
 * جلب جميع الزبائن المسجلين من التخزين المحلي
 */
export function getAllCustomers(): CustomerUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALL_CUSTOMERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ALL_CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CUSTOMERS;
  } catch (err) {
    console.warn('Failed to parse all customers from localStorage:', err);
    return INITIAL_CUSTOMERS;
  }
}

/**
 * حفظ قائمة الزبائن في التخزين المحلي
 */
export function saveAllCustomers(customers: CustomerUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ALL_CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.warn('Failed to save customers list:', err);
  }
}

/**
 * إضافة أو تحديث زبون بعد التسجيل أو التوثيق
 */
export function registerOrUpdateCustomer(customer: CustomerUser): void {
  const current = getAllCustomers();
  const existingIndex = current.findIndex(c => c.id === customer.id || (customer.email && c.email.toLowerCase() === customer.email.toLowerCase()));

  let updatedList: CustomerUser[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = {
      ...current[existingIndex],
      ...customer,
      status: current[existingIndex].status || customer.status || 'active',
    };
  } else {
    const newEntry: CustomerUser = {
      ...customer,
      status: customer.status || 'active',
      totalTrips: customer.totalTrips || 0,
    };
    updatedList = [newEntry, ...current];
  }

  saveAllCustomers(updatedList);
  syncCustomerToSupabase(customer).catch(err => {
    console.warn('Could not sync customer to Supabase:', err);
  });
}

/**
 * تحكم الإدارة: تغيير حالة الزبون (نشط / معلق)
 */
export function setCustomerStatus(customerId: string, status: 'active' | 'suspended'): CustomerUser[] {
  const current = getAllCustomers();
  const updated = current.map(c => c.id === customerId ? { ...c, status } : c);
  saveAllCustomers(updated);

  const target = updated.find(c => c.id === customerId);
  if (target) {
    syncCustomerToSupabase(target).catch(console.warn);
  }
  return updated;
}

/**
 * تحكم الإدارة: تغيير حالة التوثيق برمز OTP
 */
export function setCustomerVerification(customerId: string, isVerified: boolean): CustomerUser[] {
  const current = getAllCustomers();
  const updated = current.map(c => c.id === customerId ? { ...c, isVerified } : c);
  saveAllCustomers(updated);

  const target = updated.find(c => c.id === customerId);
  if (target) {
    syncCustomerToSupabase(target).catch(console.warn);
  }
  return updated;
}

/**
 * تحكم الإدارة: تعديل بيانات الزبون (الاسم، البريد، الملاحظات الإدارية)
 */
export function updateCustomerDetails(
  customerId: string, 
  updates: { name?: string; email?: string; notes?: string }
): CustomerUser[] {
  const current = getAllCustomers();
  const updated = current.map(c => {
    if (c.id === customerId) {
      return {
        ...c,
        name: updates.name !== undefined ? updates.name.trim() : c.name,
        email: updates.email !== undefined ? updates.email.trim().toLowerCase() : c.email,
        notes: updates.notes !== undefined ? updates.notes.trim() : c.notes,
      };
    }
    return c;
  });

  saveAllCustomers(updated);
  const target = updated.find(c => c.id === customerId);
  if (target) {
    syncCustomerToSupabase(target).catch(console.warn);
  }
  return updated;
}

/**
 * تحكم الإدارة: حذف زبون من النظام وقاعدة البيانات
 */
export async function removeCustomer(customerId: string): Promise<CustomerUser[]> {
  const current = getAllCustomers();
  const updated = current.filter(c => c.id !== customerId);
  saveAllCustomers(updated);

  // حذف من Supabase إذا كان متوفراً
  try {
    await deleteCustomerFromSupabase(customerId);
  } catch (err) {
    console.warn('Could not delete customer from Supabase:', err);
  }

  return updated;
}

/**
 * تحكم الإدارة: إضافة زبون جديد يدوياً من لوحة التحكم
 */
export function addCustomerManually(data: {
  name: string;
  email: string;
  isVerified: boolean;
  status: 'active' | 'suspended';
  notes?: string;
}): CustomerUser[] {
  const newCustomer: CustomerUser = {
    id: `cust-${Date.now()}`,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    isVerified: data.isVerified,
    status: data.status,
    registeredAt: Date.now(),
    totalTrips: 0,
    notes: data.notes?.trim() || undefined,
  };

  const current = getAllCustomers();
  const updated = [newCustomer, ...current];
  saveAllCustomers(updated);

  syncCustomerToSupabase(newCustomer).catch(console.warn);
  return updated;
}

/**
 * مزامنة الزبائن من Supabase
 */
export async function syncCustomersWithSupabase(): Promise<CustomerUser[]> {
  try {
    const remote = await fetchCustomersFromSupabase();
    if (remote && remote.length > 0) {
      const local = getAllCustomers();
      // دمج وتحديث المحلي
      const map = new Map<string, CustomerUser>();
      local.forEach(c => map.set(c.id, c));
      remote.forEach(r => map.set(r.id, { ...map.get(r.id), ...r }));
      const merged = Array.from(map.values()).sort((a, b) => b.registeredAt - a.registeredAt);
      saveAllCustomers(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Sync with Supabase failed, using local:', err);
  }
  return getAllCustomers();
}
