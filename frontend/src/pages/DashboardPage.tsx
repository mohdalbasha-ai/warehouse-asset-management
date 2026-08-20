import { useEffect, useState } from "react";
import { api } from "../api/client";
import StatCard from "../components/StatCard";
import RiskBadge from "../components/RiskBadge";
import { useI18n } from "../i18n/I18nContext";

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

interface ExpiringCard {
  contractNumber: string;
  supplierName: string;
  daysRemaining: number;
  riskLevel: string;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expiring, setExpiring] = useState<ExpiringCard[]>([]);

  useEffect(() => {
    api.get("/dashboard/summary").then((res) => setSummary(res.data));
    api.get("/dashboard/contracts-expiring-cards").then((res) => setExpiring(res.data));
  }, []);

  if (!summary) return <div>...جاري التحميل</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("dashboard")}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="المستودعات" value={summary.warehouses} />
        <StatCard label="الأصناف" value={summary.items} />
        <StatCard label="إجمالي الأجهزة" value={summary.devices.total} />
        <StatCard label="أجهزة مسلّمة" value={summary.devices.delivered} />
        <StatCard label="أجهزة بالمستودع" value={summary.devices.inWarehouse} />
        <StatCard label="تحت الصيانة" value={summary.devices.underMaintenance} tone="warning" />
        <StatCard label="خارج الخدمة" value={summary.devices.outOfService} tone="danger" />
        <StatCard label="عقود فعّالة" value={summary.contracts.active} />
        <StatCard label="عقود قريبة الانتهاء" value={summary.contracts.expiringSoon} tone="warning" />
        <StatCard label="عقود منتهية" value={summary.contracts.expired} tone="danger" />
        <StatCard label="توريدات قادمة" value={summary.deliveries.upcoming} />
        <StatCard label="توريدات متأخرة" value={summary.deliveries.delayed} tone="danger" />
        <StatCard label="طلبات صيانة مفتوحة" value={summary.maintenance.open} />
        <StatCard label="طلبات صيانة حرجة" value={summary.maintenance.critical} tone="danger" />
        <StatCard label="ضمانات قريبة الانتهاء" value={summary.warrantiesExpiringSoon} tone="warning" />
        <StatCard label="أصناف تحت الحد الأدنى" value={summary.lowStockItems} tone="warning" />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">العقود القريبة من الانتهاء (خلال 30 يومًا)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم العقد</th>
              <th>المورد</th>
              <th>الأيام المتبقية</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {expiring.map((c) => (
              <tr key={c.contractNumber}>
                <td>{c.contractNumber}</td>
                <td>{c.supplierName}</td>
                <td>{c.daysRemaining}</td>
                <td><RiskBadge level={c.riskLevel} /></td>
              </tr>
            ))}
            {expiring.length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 py-4">لا توجد عقود قريبة من الانتهاء</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
