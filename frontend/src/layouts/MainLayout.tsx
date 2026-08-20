import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { api } from "../api/client";

const MENU: { key: string; path: string }[] = [
  { key: "dashboard", path: "/" },
  { key: "warehouses", path: "/warehouses" },
  { key: "items", path: "/items" },
  { key: "devices", path: "/devices" },
  { key: "receive", path: "/stock/receive" },
  { key: "issue", path: "/stock/issue" },
  { key: "transfers", path: "/stock/transfers" },
  { key: "contracts", path: "/contracts" },
  { key: "deliveries", path: "/deliveries" },
  { key: "maintenance", path: "/maintenance" },
  { key: "warranty", path: "/warranty" },
  { key: "employees", path: "/employees" },
  { key: "centersDepartments", path: "/organization" },
  { key: "suppliers", path: "/suppliers" },
  { key: "users", path: "/users" },
  { key: "roles", path: "/roles" },
  { key: "notifications", path: "/notifications" },
  { key: "reports", path: "/reports" },
  { key: "auditLog", path: "/audit-log" },
];

export default function MainLayout() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api
      .get("/notifications", { params: { unreadOnly: true } })
      .then((res) => setUnread(res.data.length))
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-primary-900 text-white flex flex-col shrink-0">
        <div className="p-4 text-lg font-bold border-b border-primary-800">
          نظام إدارة المستودعات والأصول
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {MENU.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-primary-800 ${isActive ? "bg-primary-700 font-semibold" : "text-primary-100"}`
              }
            >
              {t(item.key)}
              {item.key === "notifications" && unread > 0 && (
                <span className="ms-2 badge bg-red-500 text-white">{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-primary-800 text-sm">
          <div className="mb-2">{user?.fullName}</div>
          <button onClick={logout} className="btn btn-secondary w-full">
            {t("logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-3 flex justify-end items-center">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as "ar" | "en")}
            className="input w-auto"
          >
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
