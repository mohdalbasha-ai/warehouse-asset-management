import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import Logo from "../components/Logo";
import {
  LayoutDashboard, Warehouse, Boxes, Cpu, PackageCheck, PackageMinus, ArrowLeftRight,
  FileText, Truck, Wrench, ShieldCheck, Users2, Building2, Contact, UserCog, KeyRound,
  Bell, BarChart3, ScrollText, LogOut, Globe, Settings,
} from "lucide-react";

const MENU: { key: string; path: string; icon: any }[] = [
  { key: "dashboard", path: "/", icon: LayoutDashboard },
  { key: "warehouses", path: "/warehouses", icon: Warehouse },
  { key: "items", path: "/items", icon: Boxes },
  { key: "devices", path: "/devices", icon: Cpu },
  { key: "receive", path: "/stock/receive", icon: PackageCheck },
  { key: "issue", path: "/stock/issue", icon: PackageMinus },
  { key: "transfers", path: "/stock/transfers", icon: ArrowLeftRight },
  { key: "contracts", path: "/contracts", icon: FileText },
  { key: "deliveries", path: "/deliveries", icon: Truck },
  { key: "maintenance", path: "/maintenance", icon: Wrench },
  { key: "warranty", path: "/warranty", icon: ShieldCheck },
  { key: "employees", path: "/employees", icon: Contact },
  { key: "centersDepartments", path: "/organization", icon: Building2 },
  { key: "suppliers", path: "/suppliers", icon: Users2 },
  { key: "users", path: "/users", icon: UserCog },
  { key: "roles", path: "/roles", icon: KeyRound },
  { key: "notifications", path: "/notifications", icon: Bell },
  { key: "reports", path: "/reports", icon: BarChart3 },
  { key: "auditLog", path: "/audit-log", icon: ScrollText },
  { key: "settings", path: "/settings", icon: Settings },
];

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default function MainLayout() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get("/notifications", { params: { unreadOnly: true } }).then((res) => setUnread(res.data.length)).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-ink-900 text-ink-100 flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-ink-700">
          <Logo className="w-9 h-9" />
          <div className="leading-tight">
            <div className="font-display font-bold text-white text-sm">نظام إدارة المستودعات</div>
            <div className="text-[11px] text-petrol-300">والأصول والصيانة</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {MENU.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    isActive ? "bg-petrol-500 text-white font-medium shadow-sm" : "text-ink-100/70 hover:bg-ink-700 hover:text-white"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span className="flex-1">{t(item.key)}</span>
                {item.key === "notifications" && unread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-semibold">
                    {unread}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-ink-700 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-petrol-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {initials(user?.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{user?.fullName}</div>
            <div className="text-[11px] text-ink-100/50 truncate">{user?.roles?.[0]}</div>
          </div>
          <button onClick={logout} title={t("logout")} className="btn-ghost p-2 rounded-lg text-ink-100/70 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-steel-200 px-6 py-3 flex justify-end items-center gap-3">
          <Globe className="w-4 h-4 text-steel-500" />
          <select value={lang} onChange={(e) => setLang(e.target.value as "ar" | "en")} className="input w-auto py-1.5">
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
