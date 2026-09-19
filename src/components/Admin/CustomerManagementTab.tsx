import React, { useState, useEffect } from 'react';
import { CustomerUser } from '../../types';
import { 
  getAllCustomers, 
  setCustomerStatus, 
  setCustomerVerification, 
  updateCustomerDetails, 
  removeCustomer, 
  addCustomerManually,
  syncCustomersWithSupabase
} from '../../services/customerService';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Plus, 
  RotateCw, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  Mail, 
  Calendar, 
  AlertCircle,
  Copy,
  Car,
  FileText
} from 'lucide-react';

export const CustomerManagementTab: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerUser[]>(() => getAllCustomers());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'verified' | 'unverified'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [customerToEdit, setCustomerToEdit] = useState<CustomerUser | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerUser | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formVerified, setFormVerified] = useState(true);
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync with Supabase on mount
  useEffect(() => {
    handleSync();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncCustomersWithSupabase();
      setCustomers(synced);
      showToast('تمت مزامنة قائمة الزبائن مع قاعدة بيانات Supabase بنجاح 🔄');
    } catch {
      showToast('تم استخدام البيانات المحلية للزبائن.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Toggle Active / Suspended
  const handleToggleStatus = (cust: CustomerUser) => {
    const nextStatus = cust.status === 'suspended' ? 'active' : 'suspended';
    const updated = setCustomerStatus(cust.id, nextStatus);
    setCustomers(updated);
    showToast(
      nextStatus === 'active' 
        ? `تم تفعيل حساب الزبون (${cust.name}) بنجاح 🟢` 
        : `تم تعليق حساب الزبون (${cust.name}) بنجاح 🔴`
    );
  };

  // 2. Toggle OTP Verification
  const handleToggleVerification = (cust: CustomerUser) => {
    const nextVerification = !cust.isVerified;
    const updated = setCustomerVerification(cust.id, nextVerification);
    setCustomers(updated);
    showToast(
      nextVerification 
        ? `تم توثيق وتفعيل حساب (${cust.name}) برمز OTP 🛡️` 
        : `تم إلغاء توثيق حساب (${cust.name})`
    );
  };

  // 3. Open Edit Modal
  const openEditModal = (cust: CustomerUser) => {
    setCustomerToEdit(cust);
    setFormName(cust.name);
    setFormEmail(cust.email);
    setFormNotes(cust.notes || '');
    setFormError(null);
  };

  // 4. Submit Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToEdit) return;

    if (!formName.trim()) {
      setFormError('يرجى إدخال اسم الزبون.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    const updated = updateCustomerDetails(customerToEdit.id, {
      name: formName.trim(),
      email: formEmail.trim(),
      notes: formNotes.trim(),
    });
    setCustomers(updated);
    setCustomerToEdit(null);
    showToast(`تم تحديث بيانات الزبون (${formName}) بنجاح ✓`);
  };

  // 5. Submit Add
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('يرجى إدخال اسم الزبون.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('يرجى إدخال بريد إلكتروني صحيح لتسجيل الزبون.');
      return;
    }

    const updated = addCustomerManually({
      name: formName.trim(),
      email: formEmail.trim(),
      isVerified: formVerified,
      status: formStatus,
      notes: formNotes.trim(),
    });
    setCustomers(updated);
    setIsAddModalOpen(false);
    showToast(`تمت إضافة الزبون الجديد (${formName}) بنجاح وحفظه في النظام 🚕`);
  };

  // 6. Confirm Delete
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    const targetName = customerToDelete.name;
    const updated = await removeCustomer(customerToDelete.id);
    setCustomers(updated);
    setCustomerToDelete(null);
    showToast(`تم حذف حساب الزبون (${targetName}) نهائياً من النظام.`);
  };

  // Filtered List
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return c.status !== 'suspended';
    if (statusFilter === 'suspended') return c.status === 'suspended';
    if (statusFilter === 'verified') return c.isVerified;
    if (statusFilter === 'unverified') return !c.isVerified;

    return true;
  });

  // Counters
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.status !== 'suspended').length;
  const suspendedCount = customers.filter(c => c.status === 'suspended').length;
  const verifiedCount = customers.filter(c => c.isVerified).length;

  const formatDate = (ts: number) => {
    try {
      return new Date(ts).toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'تاريخ التسجيل';
    }
  };

  return (
    <div className="space-y-4 font-['Cairo',sans-serif]">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats & Main Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">إجمالي الزبائن</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <span className="text-[10px] text-slate-400">مسجلين في المنظومة</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700">الحسابات النشطة</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
          <span className="text-[10px] text-emerald-600">يمكنهم طلب التاكسي</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700">موثق بـ Email OTP</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{verifiedCount}</div>
          <span className="text-[10px] text-amber-600">هويات حقيقية معتمدة</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700">حسابات معلقة</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{suspendedCount}</div>
          <span className="text-[10px] text-rose-600">ممنوعون من الطلب مؤقتاً</span>
        </div>
      </div>

      {/* Action Header & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Title & Info */}
          <div>
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>لوحة التحكم بالزبائن المسجلين بالأبيض سيدي الشيخ</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              مراقبة الحسابات المسجلة بالبريد الإلكتروني، تفعيل أو تعليق الحسابات، وتعديل الملاحظات الإدارية.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="مزامنة الزبائن مع Supabase"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'مزامنة...' : 'مزامنة Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormName('');
                setFormEmail('');
                setFormVerified(true);
                setFormStatus('active');
                setFormNotes('');
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة زبون يدوياً ➕</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، البريد الإلكتروني، أو الملاحظات..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              الكل ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              نشط ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              معلق ({suspendedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('verified')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'verified'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              موثق ({verifiedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Customer List / Table */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
            🔍
          </div>
          <h5 className="font-bold text-sm text-slate-700">لا توجد حسابات زبائن مطابقة لخيارات البحث</h5>
          <p className="text-xs text-slate-400">
            جرب تغيير معايير البحث أو تصفية الحالة لعرض بقية الزبائن.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCustomers.map(cust => {
            const isSuspended = cust.status === 'suspended';

            return (
              <div
                key={cust.id}
                className={`bg-white rounded-2xl p-4 border transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isSuspended ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Customer Details */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                    isSuspended ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {cust.name.slice(0, 1)}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-slate-900 text-sm">{cust.name}</h5>

                      {/* Status badge */}
                      {isSuspended ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          حساب معلق (محظور مؤقتاً)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          حساب نشط
                        </span>
                      )}

                      {/* OTP Verified badge */}
                      {cust.isVerified ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          موثق بـ OTP
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-slate-400" />
                          غير موثق
                        </span>
                      )}
                    </div>

                    {/* Email and Stats row */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1 font-mono text-slate-700" dir="ltr">
                        <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{cust.email}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>سجل في: {formatDate(cust.registeredAt)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-bold">
                        <Car className="w-3 h-3 text-indigo-600" />
                        <span>{cust.totalTrips || 0} رحلة مكتملة</span>
                      </div>
                    </div>

                    {/* Admin notes if any */}
                    {cust.notes && (
                      <div className="text-[11px] bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-700 flex items-start gap-1.5 mt-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-slate-900">ملاحظة الإدارة: </strong>
                          <span>{cust.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Actions Bar */}
                <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end flex-wrap">
                  {/* Toggle Active / Suspended */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(cust)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                      isSuspended
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                    title={isSuspended ? 'إعادة تفعيل الحساب' : 'تعليق حساب الزبون مؤقتاً'}
                  >
                    {isSuspended ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>تفعيل الحساب 🟢</span>
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        <span>تعليق الحساب 🔴</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Verification */}
                  <button
                    type="button"
                    onClick={() => handleToggleVerification(cust)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="تغيير حالة توثيق الـ OTP"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${cust.isVerified ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span>{cust.isVerified ? 'إلغاء التوثيق' : 'توثيق الحساب'}</span>
                  </button>

                  {/* Edit Customer Details */}
                  <button
                    type="button"
                    onClick={() => openEditModal(cust)}
                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 transition cursor-pointer"
                    title="تعديل بيانات وملاحظات الزبون"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete Customer */}
                  <button
                    type="button"
                    onClick={() => setCustomerToDelete(cust)}
                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                    title="حذف حساب الزبون"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD CUSTOMER MANUALLY (إضافة زبون جديد يدوياً من الإدارة) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
            <div className="p-4 bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h4 className="font-black text-sm">إضافة زبون جديد إلى المنظومة</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم الزبون الكامل:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: يوسف بن أحمد"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان البريد الإلكتروني (لتلقي الـ OTP):</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="youssef@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 font-mono font-bold text-slate-900"
                  dir="ltr"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">حالة الحساب:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 font-bold text-slate-800 bg-white"
                  >
                    <option value="active">نشط (Active) 🟢</option>
                    <option value="suspended">معلق (Suspended) 🔴</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">توثيق البريد OTP:</label>
                  <select
                    value={formVerified ? 'yes' : 'no'}
                    onChange={(e) => setFormVerified(e.target.value === 'yes')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 font-bold text-slate-800 bg-white"
                  >
                    <option value="yes">موثق ومعتمد ✓</option>
                    <option value="no">غير موثق بعد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات إدارية (اختياري):</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ملاحظات الإدارة حول هذا الزبون أو الحي المفضل له..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-xs cursor-pointer"
                >
                  حفظ الزبون في المنظومة 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CUSTOMER DETAILS (تعديل بيانات الزبون) */}
      {customerToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
            <div className="p-4 bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                <h4 className="font-black text-sm">تعديل بيانات الزبون وملاحظات الإدارة</h4>
              </div>
              <button
                type="button"
                onClick={() => setCustomerToEdit(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم الزبون:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني:</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 font-mono font-bold text-slate-900"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات الإدارة الخاصة:</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="سجل أي ملاحظات بخصوص سلوك الراكب، التزامه، أو تعليقه..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomerToEdit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-xs cursor-pointer"
                >
                  حفظ التعديلات ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION (نافذة تأكيد حذف الزبون الآمنة بدون window.confirm) */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-rose-200 overflow-hidden text-center p-6 space-y-4" dir="rtl">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-2xl shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-black text-base text-slate-900">تأكيد حذف حساب الزبون</h4>
              <p className="text-xs text-slate-500 mt-1">
                هل أنت متأكد من رغبتك في حذف حساب الزبون <strong className="text-slate-900 font-bold">{customerToDelete.name}</strong>؟
              </p>
              <div className="mt-2 p-2.5 bg-slate-50 rounded-xl text-[11px] font-mono text-slate-600" dir="ltr">
                {customerToDelete.email}
              </div>
              <p className="text-[10px] text-rose-600 font-bold mt-2">
                سيتم حذف السجل من لوحة الإدارة ومزامنة الحذف مع قاعدة البيانات.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition cursor-pointer shadow-xs"
              >
                تأكيد الحذف نهائياً 🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
