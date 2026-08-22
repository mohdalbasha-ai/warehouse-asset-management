import { useEffect, useState } from "react";
import { api } from "../api/client";
import StatCard from "../components/StatCard";
import RiskBadge from "../components/RiskBadge";
import EmptyState from "../components/EmptyState";
import { useI18n } from "../i18n/I18nContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Warehouse, Boxes, Cpu, PackageCheck, Archive, Wrench, Ban,
  FileCheck2, FileClock, FileX2, Truck, AlertTriangle,
  ShieldAlert, TrendingDown, FileWarning,
} from "lucide-react";

interface Summary {
  warehouses: number;
  items: number;
  devices: { total: number; delivered: number; inWarehouse: number; underMaintenance: number; outOfService: number };
  contracts: { active: number; expiringSoon: number; expired: number };
  deliveries: { upcoming: number; delayed: number };
  maintenance: { open: number; critical: number };
  warrantiesExpiringSoon: number;
  lowStockItems: number;
}

interface ExpiringCard { contractNumber: string; supplierName: string; daysRemaining: number; riskLevel: string; }

export default function DashboardPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expiring, setExpiring] = useState<ExpiringCard[]>([]);

  useEffect(() => {
    api.get("/dashboard/summary").then((res) => setSummary(res.data));
    api.get("/dashboard/contracts-expiring-cards").then((res) => setExpiring(res.data));
  }, []);

  if (!summary) {
    return <div className="animate-pulse text-steel-500">...جاري تحميل لوحة التحكم</div>;
  }

  const deviceChartData = [
    { name: "بالمستودع", قيمة: summary.devices.inWarehouse },
    { name: "مسلّمة", قيمة: summary.devices.delivered },
    { name: "تحت الصيانة", قيمة: summary.devices.underMaintenance },
    { name: "خارج الخدمة", قيمة: summary.devices.outOfService },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900">{t("dashboard")}</h1>
        <p className="text-sm text-steel-500">نظرة عامة على حالة المستودعات والأصول الآن</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="المستودعات" value={summary.warehouses} icon={Warehouse} />
        <StatCard label="الأصناف" value={summary.items} icon={Boxes} />
        <StatCard label="إجمالي الأجهزة" value={summary.devices.total} icon={Cpu} />
        <StatCard label="أجهزة مسلّمة" value={summary.devices.delivered} icon={PackageCheck} />
        <StatCard label="أجهزة بالمستودع" value={summary.devices.inWarehouse} icon={Archive} />
        <StatCard label="تحت الصيانة" value={summary.devices.underMaintenance} tone="warning" icon={Wrench} />
        <StatCard label="خارج الخدمة" value={summary.devices.outOfService} tone="danger" icon={Ban} />
        <StatCard label="عقود فعّالة" value={summary.contracts.active} icon={FileCheck2} />
        <StatCard label="عقود قريبة الانتهاء" value={summary.contracts.expiringSoon} tone="warning" icon={FileClock} />
        <StatCard label="عقود منتهية" value={summary.contracts.expired} tone="danger" icon={FileX2} />
        <StatCard label="توريدات قادمة" value={summary.deliveries.upcoming} icon={Truck} />
        <StatCard label="توريدات متأخرة" value={summary.deliveries.delayed} tone="danger" icon={AlertTriangle} />
        <StatCard label="طلبات صيانة مفتوحة" value={summary.maintenance.open} icon={Wrench} />
        <StatCard label="طلبات صيانة حرجة" value={summary.maintenance.critical} tone="danger" icon={ShieldAlert} />
        <StatCard label="ضمانات قريبة الانتهاء" value={summary.warrantiesExpiringSoon} tone="warning" icon={FileWarning} />
        <StatCard label="أصناف تحت الحد الأدنى" value={summary.lowStockItems} tone="warning" icon={TrendingDown} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="font-display font-semibold mb-4 text-ink-900">توزيع حالة الأجهزة</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deviceChartData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid horizontal={false} stroke="#EEF0F3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: "#667085" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#EAF6F6" }} contentStyle={{ borderRadius: 8, borderColor: "#E4E7EC", fontSize: 12 }} />
              <Bar dataKey="قيمة" fill="#0E7C7B" radius={[0, 6, 6, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card lg:col-span-3">
          <h2 className="font-display font-semibold mb-3 text-ink-900">العقود القريبة من الانتهاء (خلال 30 يومًا)</h2>
          {expiring.length === 0 ? (
            <EmptyState icon={FileCheck2} title="لا توجد عقود قريبة من الانتهاء" hint="كل العقود ضمن المدى الطبيعي حاليًا" />
          ) : (
            <table className="data-table">
              <thead><tr><th>رقم العقد</th><th>المورد</th><th>الأيام المتبقية</th><th>الحالة</th></tr></thead>
              <tbody>
                {expiring.map((c) => (
                  <tr key={c.contractNumber}>
                    <td className="font-mono text-xs">{c.contractNumber}</td>
                    <td>{c.supplierName}</td>
                    <td>{c.daysRemaining}</td>
                    <td><RiskBadge level={c.riskLevel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
