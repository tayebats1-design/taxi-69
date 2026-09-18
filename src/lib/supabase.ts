import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Driver, RideRequest } from '../types';

// Provided Supabase project credentials for El Abiodh Sidi Cheikh Taxi
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://hxceniydvbsstmnvhsnz.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_cfVcpdd21K4I0CxY2spucA_JeLA6Bxk',
};

// Verify if valid URL & Key are present
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.anonKey &&
    SUPABASE_CONFIG.url.startsWith('https://') &&
    SUPABASE_CONFIG.anonKey.length > 20
  );
};

// Lazy initialization of Supabase client
let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('Supabase initialization failed:', err);
      return null;
    }
  }
  return clientInstance;
};

/**
 * SQL Schema for El Abiodh Sidi Cheikh Taxi App on Supabase
 */
export const SUPABASE_SQL_SCHEMA = `-- سكربت إنشاء جداول تطبيق تاكسي الأبيض سيدي الشيخ على Supabase
-- يمكنك نسخه وتشغيله في Supabase SQL Editor (مرة واحدة فقط)

-- 1. جدول السائقين (Drivers)
create table if not exists public.drivers (
  id text primary key,
  name text not null,
  phone text not null,
  email text,
  car_model text not null,
  car_color text default 'أصفر',
  plate_number text not null,
  car_year int default 2022,
  license_number text,
  rating numeric default 5.0,
  total_trips int default 0,
  is_online boolean default true,
  status text default 'available',
  lat double precision not null,
  lng double precision not null,
  updated_at timestamp with time zone default now()
);

-- 2. جدول طلبات الرحلات (Rides)
create table if not exists public.rides (
  id text primary key,
  customer_name text not null,
  customer_phone text not null,
  pickup_district_id text,
  pickup_name text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dropoff_district_id text,
  dropoff_name text not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  assigned_driver_id text,
  driver_name text,
  driver_phone text,
  status text not null,
  fare numeric not null,
  service_type text default 'standard',
  payment_method text default 'cash',
  distance_km numeric,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- تمكين سياسات القراءة والكتابة العامة (RLS) للسماح بتطبيق التاكسي بالعمل
alter table public.drivers enable row level security;
alter table public.rides enable row level security;

create policy "الجميع يمكنهم قراءة وتحديث السائقين"
  on public.drivers for all
  using (true)
  with check (true);

create policy "الجميع يمكنهم طلب ومتابعة الرحلات"
  on public.rides for all
  using (true)
  with check (true);

-- تمكين ميزة التزامن المباشر Realtime للجدولين
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.rides;
`;

/**
 * Test Supabase connectivity and check if tables exist
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tablesExist: boolean;
  message: string;
}> {
  const sb = getSupabase();
  if (!sb) {
    return {
      connected: false,
      tablesExist: false,
      message: 'لم يتم العثور على إعدادات Supabase صالحة.',
    };
  }

  try {
    const { data, error } = await sb.from('drivers').select('id').limit(1);
    if (error) {
      // If table doesn't exist yet (PGRST204 or 42P01 in Postgres)
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          connected: true,
          tablesExist: false,
          message: 'الاتصال بـ Supabase ناجح، ولكن جدول drivers غير منشأ بعد. انسخ كود SQL وشغّله في الـ SQL Editor.',
        };
      }
      return {
        connected: true,
        tablesExist: false,
        message: `خطأ أثناء فحص الجداول: ${error.message}`,
      };
    }
    return {
      connected: true,
      tablesExist: true,
      message: 'متصل بنجاح مع قاعدة البيانات والجداول جاهزة!',
    };
  } catch (err: any) {
    return {
      connected: false,
      tablesExist: false,
      message: `فشل الاتصال: ${err.message || 'خطأ غير معروف'}`,
    };
  }
}

/**
 * Fetch drivers list from Supabase
 */
export async function fetchDriversFromSupabase(): Promise<Driver[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb.from('drivers').select('*');
    if (error || !data) {
      return null;
    }
    return data.map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      email: d.email || undefined,
      carModel: d.car_model,
      carColor: d.car_color || 'أصفر',
      carColorHex: d.car_color_hex || '#f59e0b',
      plateNumber: d.plate_number,
      carYear: d.car_year || 2022,
      licenseNumber: d.license_number || undefined,
      rating: Number(d.rating) || 5.0,
      totalTrips: d.total_trips || 0,
      isOnline: Boolean(d.is_online),
      status: d.status || 'available',
      currentLocation: {
        lat: Number(d.lat),
        lng: Number(d.lng),
      },
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
    }));
  } catch (err) {
    console.warn('Error fetching drivers from Supabase:', err);
    return null;
  }
}

/**
 * Sync driver location or status to Supabase
 */
export async function syncDriverToSupabase(driver: Driver): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb.from('drivers').upsert({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email || null,
      car_model: driver.carModel,
      car_color: driver.carColor,
      plate_number: driver.plateNumber,
      car_year: driver.carYear,
      license_number: driver.licenseNumber || null,
      rating: driver.rating,
      total_trips: driver.totalTrips,
      is_online: driver.isOnline,
      status: driver.status,
      lat: driver.currentLocation.lat,
      lng: driver.currentLocation.lng,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Error syncing driver to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync exception:', err);
    return false;
  }
}

/**
 * Sync ride request to Supabase
 */
export async function syncRideToSupabase(ride: RideRequest): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb.from('rides').upsert({
      id: ride.id,
      customer_name: ride.customerName,
      customer_phone: ride.customerPhone,
      pickup_district_id: ride.pickupDistrict.id,
      pickup_name: ride.pickupDistrict.nameAr,
      pickup_lat: ride.pickupDistrict.lat,
      pickup_lng: ride.pickupDistrict.lng,
      dropoff_district_id: ride.dropoffDistrict.id,
      dropoff_name: ride.dropoffDistrict.nameAr,
      dropoff_lat: ride.dropoffDistrict.lat,
      dropoff_lng: ride.dropoffDistrict.lng,
      assigned_driver_id: ride.assignedDriverId || null,
      status: ride.status,
      fare: ride.estimatedPrice,
      service_type: ride.serviceType,
      payment_method: ride.paymentMethod,
      distance_km: ride.distanceKm,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Error syncing ride to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync exception:', err);
    return false;
  }
}

/**
 * Fetch pending or active rides from Supabase so all drivers can see them
 */
export async function fetchActiveRidesFromSupabase(): Promise<RideRequest[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('rides')
      .select('*')
      .in('status', ['searching', 'pending', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    return data.map(r => ({
      id: r.id,
      customerId: 'cust-supabase',
      customerName: r.customer_name || 'زبون الأبيض سيدي الشيخ',
      customerPhone: r.customer_phone || '0661 12 34 56',
      pickupDistrict: {
        id: r.pickup_district_id || 'pickup-loc',
        nameAr: r.pickup_name || 'نقطة الانطلاق',
        lat: Number(r.pickup_lat),
        lng: Number(r.pickup_lng),
        category: 'residential',
      },
      dropoffDistrict: {
        id: r.dropoff_district_id || 'dropoff-loc',
        nameAr: r.dropoff_name || 'الوجهة',
        lat: Number(r.dropoff_lat),
        lng: Number(r.dropoff_lng),
        category: 'residential',
      },
      distanceKm: Number(r.distance_km) || 2.5,
      estimatedMinutes: Math.max(3, Math.round((Number(r.distance_km) || 2.5) * 3)),
      estimatedPrice: Number(r.fare) || 200,
      serviceType: (r.service_type as any) || 'standard',
      paymentMethod: (r.payment_method as any) || 'cash',
      status: r.status as any,
      createdAt: new Date(r.created_at || Date.now()).getTime(),
      assignedDriverId: r.assigned_driver_id || undefined,
      progressPercent: r.status === 'driver_arriving' ? 30 : r.status === 'in_progress' ? 50 : 0,
    }));
  } catch (err) {
    console.warn('Error fetching active rides from Supabase:', err);
    return null;
  }
}
