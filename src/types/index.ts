export type AppRole = 'customer' | 'driver' | 'admin';

export type VehicleCategory = 'standard' | 'family' | 'comfort';

export interface District {
  id: string;
  nameAr: string;
  nameFr?: string;
  category: 'residential' | 'historic' | 'facility' | 'education' | 'transport' | 'suburb';
  lat: number;
  lng: number;
  description?: string;
  popular?: boolean;
}

export interface DriverDocument {
  id: string;
  type: 'driving_license' | 'car_registration' | 'insurance' | 'professional_card';
  titleAr: string;
  fileUrl: string;
  uploadedAt: number;
  status: 'pending' | 'verified' | 'rejected';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  avatar: string;
  carModel: string;
  carColor: string;
  carColorHex: string;
  plateNumber: string; // Matricule (e.g. 05421-120-32)
  carYear: number;
  licenseNumber?: string; // رخصة الثقة / رخصة السياقة
  showPhoneToCustomer?: boolean; // خيار إظهار أو إخفاء رقم الهاتف عن الزبون (الإدارة وحدها تراه عند الإخفاء)
  registeredAt?: number;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  category?: VehicleCategory; // اقتصادية / عائلية / فاخرة
  rating: number;
  totalTrips: number;
  isOnline: boolean;
  isVerified?: boolean; // حالة توثيق الحساب برمز OTP (مفعل أم لا)
  status: 'available' | 'busy' | 'offline';
  currentLocation: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    districtId?: string;
  };
  documents?: DriverDocument[];
  wallet?: {
    balance: number; // الرصيد الصافي الحالي دج
    todayEarnings: number; // صافي أرباح اليوم
    todayGross?: number; // إجمالي دخل اليوم قبل الخصم
    todayCommissionPaid?: number; // عمولة المنصة لليوم
    weekEarnings: number; // صافي أرباح هذا الأسبوع
    weekGross?: number; // إجمالي دخل الأسبوع قبل الخصم
    weekCommissionPaid?: number; // عمولة المنصة للأسبوع
    commissionRate: number; // e.g. 0.15 (15%)
    totalPlatformFeePaid: number;
    history?: DriverEarningRecord[];
  };
}

export interface DriverEarningRecord {
  id: string;
  rideId: string;
  timestamp: number;
  pickupName: string;
  dropoffName: string;
  grossFare: number;
  platformCommissionPercent: number; // e.g. 15
  platformCommissionDeducted: number; // e.g. 45 DZD
  netDriverEarnings: number; // e.g. 255 DZD
  distanceKm?: number;
  paymentMethod: 'cash' | 'wallet' | 'card';
}

export type RideStatus = 
  | 'idle'
  | 'searching'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string; // اختياري بعد حذف رقم الهاتف كمتطلب إلزامي للزبون
  pickupDistrict: District;
  dropoffDistrict: District;
  distanceKm: number;
  estimatedMinutes: number;
  estimatedPrice: number;
  serviceType: VehicleCategory; // اقتصادية / عائلية / فاخرة مريحة
  status: RideStatus;
  createdAt: number;
  completedAt?: number;
  assignedDriverId?: string;
  driverLocation?: {
    lat: number;
    lng: number;
  };
  progressPercent?: number; // 0 - 100 for tracking animation
  notes?: string;
  paymentMethod: 'cash' | 'wallet' | 'card'; // الدفع نقداً كاش / محفظة / بطاقة
  rating?: number;
  review?: string;
  surgeMultiplier?: number;
  waitingMinutes?: number;
  platformFee?: number;
  driverEarnings?: number;
}

export interface PricingConfig {
  baseFare: number;       // فتح العداد (DZD)
  perKmRate: number;      // سعر الكيلومتر (DZD)
  minimumFare: number;    // الحد الأدنى للرحلة (DZD)
  waitingPerMinute: number; // سعر دقيقة الانتظار (DZD)
  nightSurcharge: number; // نسبة أو إضافة التعريفة الليلية (DZD)
  nightModeEnabled: boolean;
  familyMultiplier: number; // تاكسي عائلي
  comfortMultiplier: number; // تاكسي مريح وفاخر
  surgeMultiplier: number;  // معامل التسعير الديناميكي وقت الذروة (مثلاً 1.0 أو 1.25 أو 1.5)
  surgeReason?: string;     // سبب الذروة (أمطار، خروج الموظفين والمدارس، نقص السائقين)
  platformCommissionRate: number; // نسبة عمولة المنصة (مثلاً 0.15 = 15%)
}

// 4. المستخدمين والزبائن ونظام التحقق برمز الـ OTP عبر البريد الإلكتروني (Email OTP) وإدارة الزبائن
export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone?: string; // أُلغي كمتطلب إلزامي بناءً على طلب المستخدم
  isVerified: boolean; // حقل التوثيق وتفعيل الحساب برمز OTP
  status?: 'active' | 'suspended'; // تحكم الإدارة: نشط أو معلق
  registeredAt: number;
  totalTrips?: number;
  notes?: string;
}

export interface VerificationCodeRecord {
  id: string;
  phone: string;
  email?: string;
  userType: 'customer' | 'driver';
  verificationCode: string; // رمز التحقق المكون من 4 أو 6 أرقام
  codeExpiresAt: number; // طابع زمني لانتهاء الصلاحية (عادة بعد 3 إلى 5 دقائق)
  createdAt: number;
  isUsed: boolean;
}

