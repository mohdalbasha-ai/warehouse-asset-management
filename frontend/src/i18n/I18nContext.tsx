import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Lang = "ar" | "en";

const STRINGS: Record<Lang, Record<string, string>> = {
  ar: {
    dashboard: "لوحة التحكم", warehouses: "المستودعات", items: "الأصناف", devices: "الأجهزة",
    receive: "الاستلام", issue: "الصرف", transfers: "المناقلات", contracts: "العقود",
    deliveries: "التوريدات", maintenance: "الصيانة", warranty: "الضمان", employees: "الموظفين",
    centersDepartments: "المراكز والمديريات", suppliers: "الموردون", users: "المستخدمون",
    roles: "الصلاحيات", notifications: "الإشعارات", reports: "التقارير", auditLog: "سجل العمليات",
    settings: "إعدادات النظام", logout: "تسجيل الخروج", login: "تسجيل الدخول",
    username: "اسم المستخدم", password: "كلمة المرور",
  },
  en: {
    dashboard: "Dashboard", warehouses: "Warehouses", items: "Items", devices: "Devices",
    receive: "Receiving", issue: "Issuing", transfers: "Transfers", contracts: "Contracts",
    deliveries: "Deliveries", maintenance: "Maintenance", warranty: "Warranty", employees: "Employees",
    centersDepartments: "Centers & Departments", suppliers: "Suppliers", users: "Users",
    roles: "Roles & Permissions", notifications: "Notifications", reports: "Reports", auditLog: "Audit Log",
    settings: "Settings", logout: "Logout", login: "Login",
    username: "Username", password: "Password",
  },
};

interface I18nContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>((localStorage.getItem("lang") as Lang) || "ar");
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("lang", lang);
  }, [lang, dir]);

  const t = (key: string) => STRINGS[lang][key] ?? key;

  return <I18nContext.Provider value={{ lang, dir, t, setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
