import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import Logo from "../components/Logo";
import { LogIn, Warehouse, ShieldCheck, Wrench } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("بيانات الدخول غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* اللوحة البصرية — يسار على RTL */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }} />
        <div className="relative flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <span className="font-display font-bold text-white text-lg">نظام إدارة المستودعات والأصول</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display text-3xl font-bold text-white leading-relaxed">
            كل جهاز، عقد، وحركة مستودع —<br /> في مكان واحد موثوق.
          </h1>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Warehouse, label: "مستودعات وأصناف" },
              { icon: Wrench, label: "صيانة وضمان" },
              { icon: ShieldCheck, label: "صلاحيات وتدقيق" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <Icon className="w-6 h-6 text-petrol-300 mb-2" strokeWidth={1.5} />
                <div className="text-xs text-ink-100/80">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-ink-100/40">Warehouse & Asset Management System</div>
      </div>

      {/* نموذج الدخول */}
      <div className="flex-1 flex items-center justify-center bg-paper p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <Logo className="w-9 h-9" />
            <span className="font-display font-bold text-ink-900">نظام إدارة المستودعات</span>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">تسجيل الدخول</h2>
            <p className="text-sm text-steel-500 mt-1">أدخل بياناتك للوصول إلى النظام</p>
          </div>

          {error && (
            <div className="bg-danger-50 text-danger-600 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="field-label">{t("username")}</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="field-label">{t("password")}</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
            <LogIn className="w-4 h-4" />
            {loading ? "جارِ الدخول..." : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
}
