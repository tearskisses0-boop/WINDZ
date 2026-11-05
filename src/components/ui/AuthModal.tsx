import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ALGERIAN_WILAYAS, getWilayaName } from '../../data/locations/wilayas';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  RefreshCw 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot_password';
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { t, language } = useLanguage();
  const { signIn, signUp, resetPassword, resendVerification, isSupabaseConnected } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilayaId, setWilayaId] = useState<number>(16); // Alger default
  
  // UI states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setShowResendButton(false);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email.trim()) {
          setError('يرجى إدخال البريد الإلكتروني.');
          setIsSubmitting(false);
          return;
        }

        const res = await signIn(email.trim(), password.trim() || undefined);
        if (!res.success) {
          if (res.error?.includes('Email not confirmed')) {
            setError('البريد الإلكتروني مسجل لكن لم يتم تفعيله بعد. يرجى تفقد صندوق الوارد والضغط على رابط التفعيل.');
            setShowResendButton(true);
          } else if (res.error?.includes('Invalid login credentials')) {
            setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
          } else {
            setError(res.error || 'فشل تسجيل الدخول.');
          }
          setIsSubmitting(false);
          return;
        }

        onClose();
      } else if (mode === 'register') {
        if (!email.trim() || !displayName.trim()) {
          setError('يرجى ملء جميع الحقول الإلزامية.');
          setIsSubmitting(false);
          return;
        }

        if (password.length > 0 && password.length < 6) {
          setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
          setIsSubmitting(false);
          return;
        }

        const res = await signUp({
          email: email.trim(),
          password: password.trim() || undefined,
          display_name: displayName.trim(),
          phone: phone.trim(),
          wilaya_id: wilayaId,
        });

        if (!res.success) {
          if (res.error?.includes('rate limit')) {
            setError('تم تجاوز حد إرسال الرسائل المؤقت في سحابة Supabase. يرجى المحاولة بعد قليل.');
          } else if (res.error?.includes('already registered')) {
            setError('هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة.');
          } else {
            setError(res.error || 'حدث خطأ أثناء التسجيل.');
          }
          setIsSubmitting(false);
          return;
        }

        if (res.needsConfirmation) {
          setSuccessMessage('تم إنشاء حسابك بنجاح! أرسلنا رابط تفعيل إلى بريدك الإلكتروني. يرجى تفقده لتسجيل الدخول.');
          setIsSubmitting(false);
          return;
        }

        onClose();
      } else if (mode === 'forgot_password') {
        if (!email.trim()) {
          setError('يرجى إدخال بريدك الإلكتروني لاستعادة كلمة المرور.');
          setIsSubmitting(false);
          return;
        }

        const res = await resetPassword(email.trim());
        if (!res.success) {
          setError(res.error || 'تعذر إرسال رابط استعادة كلمة المرور.');
        } else {
          setSuccessMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح.');
        }
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع.');
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResendStatus('sending');
    const res = await resendVerification(email.trim());
    if (res.success) {
      setResendStatus('sent');
      setSuccessMessage('تمت إعادة إرسال رابط التفعيل إلى بريدك الإلكتروني.');
    } else {
      setResendStatus('idle');
      setError(res.error || 'تعذر إعادة إرسال الرابط حالياً.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 end-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer transition"
          aria-label="إغلاق النافذة"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
            {mode === 'forgot_password' ? <KeyRound className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {mode === 'login' ? t.login : mode === 'register' ? t.register : 'استعادة كلمة المرور'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            منصة WIN DZ مجانية 100% للمواطنين دون أي رسوم
          </p>
          {isSupabaseConnected && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              قاعدة بيانات ومصادقة Supabase المباشرة مفعلة
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              {showResendButton && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendStatus === 'sending'}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${resendStatus === 'sending' ? 'animate-spin' : ''}`} />
                  {resendStatus === 'sending' ? 'جارٍ الإرسال...' : 'إعادة إرسال رابط التفعيل'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">
              <p className="font-semibold">{successMessage}</p>
              {mode === 'register' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setSuccessMessage('');
                  }}
                  className="mt-2 text-teal-600 dark:text-teal-400 font-bold underline"
                >
                  الانتقال لتسجيل الدخول
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t.displayName} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: أحمد بوعلام"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              البريد الإلكتروني <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
                required
              />
            </div>
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  كلمة المرور {mode === 'register' && <span className="text-rose-500">*</span>}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '6 أحرف على الأقل' : 'أدخل كلمة المرور'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
                  required={mode === 'register'}
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t.wilayaLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                  <select
                    value={wilayaId}
                    onChange={(e) => setWilayaId(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    {ALGERIAN_WILAYAS.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {getWilayaName(w, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t.phoneLabel}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05 / 06 / 07 ..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  رقم هاتفك لن يظهر للعامة إلا إذا اخترت ذلك صراحة في إعلانك.
                </span>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : null}
            <span>
              {mode === 'login'
                ? t.login
                : mode === 'register'
                ? t.register
                : 'إرسال رابط الاستعادة'}
            </span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 text-center space-y-1">
          {mode === 'forgot_password' ? (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMessage('');
              }}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
            >
              العودة لتسجيل الدخول
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setSuccessMessage('');
              }}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
            >
              {mode === 'login'
                ? 'ليس لديك حساب؟ أنشئ حساباً مجانياً'
                : 'لديك حساب بالفعل؟ تسجيل الدخول'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
