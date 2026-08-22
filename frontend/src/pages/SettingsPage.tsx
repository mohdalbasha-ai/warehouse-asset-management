import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { Settings, Globe, User, Info } from "lucide-react";

export default function SettingsPage() {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg bg-petrol-50 text-petrol-600 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink-900">إعدادات النظام</h1>
      </div>

      <div className="card space-y-4">
        <h2 className="font-display font-semibold text-ink-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-petrol-600" /> اللغة والعرض
        </h2>
        <div>
          <label className="field-label">لغة الواجهة</label>
          <select className="input max-w-xs" value={lang} onChange={(e) => setLang(e.target.value as "ar" | "en")}>
            <option value="ar">العربية (RTL)</option>
            <option value="en">English (LTR)</option>
          </select>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="font-display font-semibold text-ink-900 flex items-center gap-2">
          <User className="w-4 h-4 text-petrol-600" /> الحساب الحالي
        </h2>
        <div className="text-sm text-steel-500">الاسم: <span className="text-ink-900">{user?.fullName}</span></div>
        <div className="text-sm text-steel-500">اسم المستخدم: <span className="text-ink-900">{user?.username}</span></div>
        <div className="text-sm text-steel-500">الأدوار: <span className="text-ink-900">{user?.roles?.join("، ")}</span></div>
      </div>

      <div className="card space-y-2">
        <h2 className="font-display font-semibold text-ink-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-petrol-600" /> حول النظام
        </h2>
        <div className="text-sm text-steel-500">Warehouse & Asset Management System — الإصدار 0.1.0</div>
      </div>
    </div>
  );
}
