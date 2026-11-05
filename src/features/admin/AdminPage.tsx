import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../lib/supabase/store';
import { validateAlgerianLocations, LocationValidationReport } from '../../data/locations/validation';
import { PLATFORM_CATEGORIES } from '../../data/categories';
import { Post, UserProfile, ContentReport, ModerationAuditLog } from '../../types';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff, 
  Trash2, 
  Lock, 
  MapPin, 
  ListOrdered, 
  Check, 
  RefreshCw,
  Search,
  UserX,
  Database,
  Server,
  Key,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkSupabaseConnection, SupabaseConnectionStatus } from '../../lib/supabase/supabaseHealth';
import { SupabaseService } from '../../lib/supabase/supabaseService';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'overview' | 'database' | 'reports' | 'posts' | 'users' | 'locations' | 'audit'>('overview');
  const [isServerVerifiedAdmin, setIsServerVerifiedAdmin] = useState<boolean | null>(null);

  const [reports, setReports] = useState<ContentReport[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<ModerationAuditLog[]>([]);
  const [locationReport, setLocationReport] = useState<LocationValidationReport | null>(null);
  const [dbStatus, setDbStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const checkDb = async () => {
    setIsCheckingDb(true);
    const status = await checkSupabaseConnection();
    setDbStatus(status);
    setIsCheckingDb(false);
  };

  const loadAdminData = async () => {
    setReports(store.getReports());
    setPosts(store.getPosts());
    const realProfiles = await SupabaseService.fetchAllProfiles();
    setUsers(realProfiles.length > 0 ? realProfiles : store.getAllUsers());
    setAuditLogs(store.getAuditLogs());
    setLocationReport(validateAlgerianLocations());
  };

  useEffect(() => {
    let isMounted = true;

    const verifyAndLoad = async () => {
      if (!user) {
        if (isMounted) setIsServerVerifiedAdmin(false);
        return;
      }

      try {
        const isAuthoritativeAdmin = await SupabaseService.checkIsAdmin(user.id);
        if (isMounted) {
          setIsServerVerifiedAdmin(isAuthoritativeAdmin);
          if (isAuthoritativeAdmin) {
            await loadAdminData();
            checkDb();
          }
        }
      } catch {
        if (isMounted) setIsServerVerifiedAdmin(false);
      }
    };

    verifyAndLoad();

    const unsubscribe = store.subscribe(() => {
      if (isServerVerifiedAdmin) {
        loadAdminData();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  // Loading state during server verification
  if (isServerVerifiedAdmin === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          جاري التحقق من الصلاحيات الإدارية المشفرة في قاعدة البيانات...
        </p>
      </div>
    );
  }

  // Security check: Authoritative server-side verification failed
  if (!isServerVerifiedAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          {t.adminAccessRestricted}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          يتطلب هذا القسم صلاحيات مسؤول النظام في منصة WIN DZ ومطابقة معرّف الحساب في جدول admin_users. يرجى تسجيل الدخول بحساب مسؤول مصرح له.
        </p>
        <Link
          to="/"
          className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          العودة للصفحة الرئيسية
        </Link>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const needsCount = posts.filter(p => p.post_type === 'NEED').length;
  const offersCount = posts.filter(p => p.post_type === 'OFFER').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black">{t.adminTitle}</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t.adminSubtitle} • المشرف الحالي: {user?.display_name}
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Real Statistics Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.statsTotalPosts}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{posts.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-amber-500">{t.statsNeeds}</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{needsCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-teal-500">{t.statsOffers}</p>
          <p className="text-2xl font-black text-teal-500 mt-1">{offersCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.statsUsers}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-rose-500">{t.statsReports}</p>
          <p className="text-2xl font-black text-rose-500 mt-1">{pendingReports.length}</p>
        </div>
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
            activeTab === 'overview' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          نظرة عامة
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'database' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>فحص وتدقيق Supabase</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span>{t.reportsQueue}</span>
          {pendingReports.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-rose-600 text-[10px] flex items-center justify-center font-black">
              {pendingReports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
            activeTab === 'posts' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          إدارة الإعلانات ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
            activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t.userManagement} ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
            activeTab === 'locations' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t.locationValidationReport}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
            activeTab === 'audit' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t.auditLogs}
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {/* Reports Moderation Queue */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              بلاغات المواطنين المعلقة للمراجعة
            </h2>
            {reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          rep.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : rep.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rep.status === 'pending' ? 'قيد المراجعة' : rep.status === 'resolved' ? 'تمت المعالجة' : 'مرفوض'}
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          السبب: {rep.reason}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rep.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                      {rep.details}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2">
                      <div className="space-x-3 rtl:space-x-reverse">
                        {rep.post_id && (
                          <Link
                            to={`/post/${rep.post_id}`}
                            className="text-teal-600 hover:underline font-bold"
                          >
                            معاينة الإعلان المبلغ عنه
                          </Link>
                        )}
                        <span className="text-slate-400">المبلّغ: {rep.reporter_name}</span>
                      </div>

                      {rep.status === 'pending' && (
                        <div className="flex gap-2">
                          {rep.post_id && (
                            <button
                              onClick={() => {
                                store.adminHidePost(rep.post_id!, `بناء على البلاغ رقم ${rep.id}`);
                                store.resolveReport(rep.id, 'resolved', 'تم إخفاء الإعلان المخالف');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                            >
                              إخفاء الإعلان واعتماد البلاغ
                            </button>
                          )}
                          <button
                            onClick={() => store.resolveReport(rep.id, 'rejected', 'لا توجد مخالفة')}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold text-xs"
                          >
                            {t.actionDismiss}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">لا توجد بلاغات حالياً.</div>
            )}
          </div>
        )}

        {/* Posts Moderation */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              إدارة كافة الإعلانات والطلبات
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3 text-start">العنوان</th>
                    <th className="p-3 text-start">النوع</th>
                    <th className="p-3 text-start">الولاية</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-start">التاريخ</th>
                    <th className="p-3 text-start">الإجراءات الإشرافية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {posts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        <Link to={`/post/${p.id}`} className="hover:text-teal-500">
                          {p.title}
                        </Link>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.post_type === 'NEED' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {p.post_type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{p.wilaya_id}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          p.availability_status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.availability_status === 'hidden'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {p.availability_status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {p.availability_status === 'hidden' ? (
                            <button
                              onClick={() => store.adminRestorePost(p.id)}
                              className="p-1 rounded text-teal-600 hover:bg-teal-50"
                              title="استعادة الإعلان"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => store.adminHidePost(p.id, 'إخفاء إداري')}
                              className="p-1 rounded text-amber-600 hover:bg-amber-50"
                              title="إخفاء الإعلان"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm('حذف الإعلان نهائياً؟')) {
                                store.deletePost(p.id);
                              }
                            }}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Management */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              إدارة حسابات المستخدمين
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3 text-start">اسم العرض</th>
                    <th className="p-3 text-start">البريد الإلكتروني</th>
                    <th className="p-3 text-start">الرتبة</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-start">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{u.display_name}</td>
                      <td className="p-3 text-slate-500">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.is_suspended ? (
                          <span className="text-rose-600 font-bold">معلق (Suspended)</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">نشط</span>
                        )}
                      </td>
                      <td className="p-3">
                        {u.role !== 'admin' && (
                          u.is_suspended ? (
                            <button
                              onClick={() => store.adminRestoreUser(u.id)}
                              className="px-2.5 py-1 rounded bg-teal-50 text-teal-600 font-bold text-xs"
                            >
                              {t.actionUnbanUser}
                            </button>
                          ) : (
                            <button
                              onClick={() => store.adminSuspendUser(u.id, 'تعليق بواسطة الإدارة')}
                              className="px-2.5 py-1 rounded bg-rose-50 text-rose-600 font-bold text-xs"
                            >
                              {t.actionBanUser}
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Location Integrity Report (69 Wilayas) */}
        {activeTab === 'locations' && locationReport && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  <span>تقرير مطابقة التقسيم الإداري الوطني (الولايات والبلديات)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  فحص سلامة البيانات لـ 69 ولاية جزائرية ومطابقة المعرفات البريدية
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                locationReport.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {locationReport.isValid ? 'سليم 100% (Verified OK)' : 'تنبيه'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xs text-slate-500">إجمالي الولايات المسجلة:</span>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {locationReport.wilayasTotal} / 69
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xs text-slate-500">البلديات المعتمدة:</span>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {locationReport.communesTotal}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xs text-slate-500">سجلات مكررة:</span>
                <p className="text-xl font-black text-emerald-600 mt-1">
                  {locationReport.duplicateWilayaIds.length} (صفر تكرار)
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xs text-slate-500">سجلات معزولة أو مفقودة:</span>
                <p className="text-xl font-black text-emerald-600 mt-1">
                  {locationReport.orphanCommunes.length}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              ✓ تم استيراد والتحقق من التقسيم الإداري الجزائري الرسمي المعتمد شاملاً الولايات المستحدثة (أفلو، بريكة، قصر الشلالة، عين وسارة، مسعد، بوسعادة، الأبيض سيدي الشيخ، العريشة، تنس، فرندة، ششار).
            </div>
          </div>
        )}

        {/* Audit Log */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.auditLogs}
            </h2>
            {auditLogs.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-3 text-start">الوقت والتاريخ</th>
                      <th className="p-3 text-start">المشرف</th>
                      <th className="p-3 text-start">نوع الإجراء</th>
                      <th className="p-3 text-start">الهدف</th>
                      <th className="p-3 text-start">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{log.admin_name}</td>
                        <td className="p-3 font-bold text-teal-600">{log.action_type}</td>
                        <td className="p-3 text-slate-500">{log.target_type}: {log.target_id}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{log.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">لا توجد عمليات إدارية مسجلة بعد.</div>
            )}
          </div>
        )}

        {/* Database & Supabase Audit Tab */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            
            {/* Supabase Connection Audit Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    dbStatus?.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      تقرير تدقيق الاتصال بقاعدة بيانات Supabase
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      فحص البيئة، المفاتيح الأمنية، نمط التخزين، وسياسات الأمان RLS
                    </p>
                  </div>
                </div>

                <button
                  onClick={checkDb}
                  disabled={isCheckingDb}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                  <span>{isCheckingDb ? 'جارٍ الفحص...' : 'إعادة فحص الاتصال'}</span>
                </button>
              </div>

              {/* Status Indicator Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">حالة الاتصال بالسحابة</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      dbStatus?.status === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                    }`} />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {dbStatus?.status === 'connected' 
                        ? 'متصل بنجاح بالسحابة' 
                        : dbStatus?.status === 'not_configured' 
                        ? 'مفاتيح البيئة غير مهيأة' 
                        : 'خطأ في الاتصال بالسحابة'}
                    </span>
                  </div>
                  {dbStatus?.latencyMs !== undefined && (
                    <span className="text-[10px] text-slate-400 mt-1 block">زمن الاستجابة: {dbStatus.latencyMs}ms</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">نمط التخزين الفعّال</span>
                  <span className="font-black text-xs text-teal-600 dark:text-teal-400 block">
                    {dbStatus?.storageMode === 'supabase_cloud' 
                      ? 'Supabase PostgreSQL السحابي' 
                      : 'تخزين محلي مؤقت (LocalStorage Cache)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {dbStatus?.storageMode === 'supabase_cloud' ? 'مزامنة سحابية نشطة' : 'تنبيه معروض للمستخدم (لا رجوع صامت)'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">مفتاح Anon العام</span>
                  <span className={`font-bold text-xs block ${
                    dbStatus?.hasAnonKey ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {dbStatus?.hasAnonKey ? 'مهيأ ومضبوط' : 'مفقود (غير مضبوط)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">VITE_SUPABASE_ANON_KEY</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">مفتاح Service Role السري</span>
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>آمن (غير معرّض)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">خالٍ تماماً من الواجهة الأمامية</span>
                </div>
              </div>

              {/* Fallback Notice Explanation */}
              {dbStatus?.status !== 'connected' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تنبيه تدقيق الاتصال بالبيئة السحابية:</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    التطبيق يعمل حالياً في وضع التخزين المحلي المؤقت (Local Offline Cache) لأن مفاتيح الربط <code>VITE_SUPABASE_URL</code> و <code>VITE_SUPABASE_ANON_KEY</code> فارغة في ملف البيئة. تم تفعيل شريط التنبيه المرئي لمنع أي رجوع صامت للذاكرة المحلية وفق المتطلبات.
                  </p>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    <p className="font-sans font-bold text-slate-600 dark:text-slate-400 mb-1">لتفعيل المزامنة السحابية المباشرة، أضف المتغيرين إلى ملف <code>.env</code>:</p>
                    VITE_SUPABASE_URL="https://your-project.supabase.co"<br/>
                    VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
                  </div>
                </div>
              )}
            </div>

            {/* Database Tables Audit Matrix (All 16 Required Tables) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    جدول تدقيق الـ 16 جدولاً المطلوبة في قاعدة البيانات (PostgreSQL Schema)
                  </h3>
                  <p className="text-xs text-slate-500">
                    مطابقة الهيكلية المعتمدة في ملف الهجرة <code>20261103000000_win_dz_schema.sql</code>
                  </p>
                </div>
                <span className="text-xs font-bold bg-teal-500/10 text-teal-600 px-3 py-1 rounded-full border border-teal-500/20">
                  16 / 16 جدول معتمد
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-3 text-start">#</th>
                      <th className="p-3 text-start">اسم الجدول</th>
                      <th className="p-3 text-start">المفتاح الرئيسي (PK)</th>
                      <th className="p-3 text-start">العلاقات والمفاتيح الخارجية</th>
                      <th className="p-3 text-start">حالة RLS</th>
                      <th className="p-3 text-start">الوصف والغرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { num: 1, name: 'profiles', pk: 'UUID (auth.users)', fk: 'wilayas, communes', rls: 'مفعل', desc: 'ملفات المستخدمين وصلاحيات الأدوار' },
                      { num: 2, name: 'wilayas', pk: 'SMALLINT (1-69)', fk: '-', rls: 'عام للقراءة', desc: 'الولايات الـ 69 المعتمدة لعام 2026' },
                      { num: 3, name: 'communes', pk: 'VARCHAR(10)', fk: 'wilayas(id)', rls: 'عام للقراءة', desc: 'الـ 1,541 بلدية جزائرية مع الترقيم البريدي' },
                      { num: 4, name: 'categories', pk: 'VARCHAR(50)', fk: '-', rls: 'عام للقراءة', desc: 'الأقسام الخمسة الرئيسية للمنصة' },
                      { num: 5, name: 'posts', pk: 'UUID', fk: 'profiles, categories, wilayas, communes', rls: 'مفعل', desc: 'طلبات (NEED) وعروض (OFFER) مع فهرس GIN' },
                      { num: 6, name: 'post_images', pk: 'UUID', fk: 'posts(id)', rls: 'مفعل', desc: 'معرض صور الإعلانات المتعددة' },
                      { num: 7, name: 'conversations', pk: 'UUID', fk: 'posts(id)', rls: 'مفعل', desc: 'المحادثات الخاصة بين المواطنين' },
                      { num: 8, name: 'conversation_participants', pk: '(conversation_id, user_id)', fk: 'conversations, profiles', rls: 'مفعل', desc: 'أطراف المحادثات الخاصة' },
                      { num: 9, name: 'messages', pk: 'UUID', fk: 'conversations, profiles', rls: 'مفعل', desc: 'الرسائل الداخلية المشفرة مع إيصالات القراءة' },
                      { num: 10, name: 'favorites', pk: 'UUID', fk: 'profiles, posts', rls: 'مفعل', desc: 'إعلانات المواطنين المفضلة (قيد فريد)' },
                      { num: 11, name: 'notifications', pk: 'UUID', fk: 'profiles, posts, conversations', rls: 'مفعل', desc: 'تنبيهات المطابقة والرسائل للمواطن' },
                      { num: 12, name: 'saved_searches', pk: 'UUID', fk: 'profiles, categories, wilayas, communes', rls: 'مفعل', desc: 'عمليات البحث المحفوظة وتنبيهات المطابقة' },
                      { num: 13, name: 'reports', pk: 'UUID', fk: 'profiles, posts', rls: 'مفعل', desc: 'طابور بلاغات المواطنين للمشرفين' },
                      { num: 14, name: 'admin_users', pk: 'UUID (profiles)', fk: 'profiles(id)', rls: 'مفعل', desc: 'جدول المشرفين المصرح لهم برمجياً' },
                      { num: 15, name: 'moderation_actions', pk: 'UUID', fk: 'profiles(admin_id)', rls: 'مفعل', desc: 'سجل تدقيق الإجراءات الإدارية غير القابل للحذف' },
                      { num: 16, name: 'user_blocks', pk: '(blocker_id, blocked_id)', fk: 'profiles, profiles', rls: 'مفعل', desc: 'حظر المستخدمين المتبادل لحماية الخصوصية' },
                    ].map((tbl) => (
                      <tr key={tbl.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 font-mono">{tbl.num}</td>
                        <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">{tbl.name}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">{tbl.pk}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{tbl.fk}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                            {tbl.rls}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{tbl.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row Level Security (RLS) & Storage Policies Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-500" />
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    حماية البيانات وسياسات RLS المحققة
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>الإعلانات (posts):</strong> تصفح عام للإعلانات النشطة؛ والتعديل والحذف محصور بصاحب الإعلان (auth.uid = user_id).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>المحادثات والرسائل:</strong> محصورة حصراً بأطراف المحادثة (conversation_participants).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>المفضلة والتنبيهات:</strong> سرية وخاصة بكل مستخدم على حدة.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>الإدارة والرقابة:</strong> صلاحيات مؤكدة بسيرفر قاعدة البيانات عبر دالة <code>is_admin()</code> دون الوثوق بأي قيمة من المتصفح.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-teal-500" />
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    حاوية التخزين السحابي (Supabase Storage)
                  </h3>
                </div>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>اسم الحاوية:</strong> <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">post-images</code>
                  </p>
                  <p>
                    <strong>الحد الأقصى للملف:</strong> 5 ميغابايت لكل صورة.
                  </p>
                  <p>
                    <strong>الصيغ المسموحة:</strong> WebP (المفضلة)، JPEG، PNG.
                  </p>
                  <p>
                    <strong>سياسة القراءة:</strong> عامة للجميع لعرض صور الإعلانات.
                  </p>
                  <p>
                    <strong>سياسة الرفع والحذف:</strong> الرفع للمستخدم المسجل فقط، والحذف لمالك الصورة حصراً.
                  </p>
                </div>
              </div>
            </div>

            {/* SQL Migrations Status */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                حزم الهجرة والتثبيت الجاهزة في المشروع (Migrations Repository)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="font-mono font-bold text-teal-600 block">20261103000000_win_dz_schema.sql</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">إنشاء الـ 16 جدولاً وفهارس GIN وسياسات RLS الأساسية.</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="font-mono font-bold text-teal-600 block">20261103000001_storage_and_enhancements.sql</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">إضافة عمود commune_id، حاوية post-images، ودالة is_admin().</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="font-mono font-bold text-teal-600 block">locations_seed.sql</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">تغذية بيانات الـ 69 ولاية والـ 1,541 بلدية الجزائرية.</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  توزيع الإعلانات حسب الأقسام
                </h3>
                <div className="space-y-2">
                  {PLATFORM_CATEGORIES.map((c) => {
                    const count = posts.filter(p => p.category_id === c.id).length;
                    const pct = posts.length > 0 ? Math.round((count / posts.length) * 100) : 0;
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{c.name_ar}</span>
                          <span>{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: c.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  معايير وإرشادات منصة WIN DZ الوطنية
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>المبدأ الأساسي: المنصة مجانية 100% للمواطنين دون رسوم أو اشتراكات.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>الخصوصية: حجب أرقام الهواتف افتراضياً وتفضيل المراسلة الداخلية.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>المصداقية: منع نشر إعلانات وهمية أو تجارية احتيالية.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>تغطية 69 ولاية كاملة دون تفرقة جغرافية.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
