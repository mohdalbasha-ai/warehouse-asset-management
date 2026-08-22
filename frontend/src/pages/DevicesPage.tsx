import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import AssetTag from "../components/AssetTag";
import EmptyState from "../components/EmptyState";
import { Cpu, Filter } from "lucide-react";

interface Device {
  id: string; internalNumber: string; name: string; serialNumber: string; status: string;
  warehouse?: { name: string }; contract?: { contractNumber: string };
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد", IN_WAREHOUSE: "بالمستودع", DELIVERED: "تم تسليمه", IN_USE: "مستخدم",
  UNDER_MAINTENANCE: "تحت الصيانة", FAULTY: "معطل", OUT_OF_SERVICE: "خارج الخدمة",
  RETURNED: "مرتجع", LOST: "مفقود", DAMAGED: "تالف",
};
const STATUS_TONE: Record<string, string> = {
  NEW: "badge-normal", IN_WAREHOUSE: "badge-normal", DELIVERED: "badge-normal", IN_USE: "badge-normal",
  UNDER_MAINTENANCE: "badge-warning", FAULTY: "badge-danger", OUT_OF_SERVICE: "badge-danger",
  RETURNED: "badge-warning", LOST: "badge-severe", DAMAGED: "badge-severe",
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.get("/devices", { params: { status: statusFilter || undefined } }).then((r) => setDevices(r.data));
  }, [statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">الأجهزة</h1>
          <p className="text-sm text-steel-500">{devices.length} جهاز مسجّل</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-steel-500" />
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        {devices.length === 0 ? (
          <EmptyState icon={Cpu} title="لا توجد أجهزة مطابقة" hint="جرّب تغيير الفلتر أو أضف جهازًا جديدًا" />
        ) : (
          <DataTable
            columns={[
              { header: "الرقم الداخلي", render: (d: Device) => <Link className="text-petrol-600 hover:underline font-medium" to={`/devices/${d.id}`}>{d.internalNumber}</Link> },
              { header: "الاسم", render: (d: Device) => d.name },
              { header: "Serial Number", render: (d: Device) => <AssetTag>{d.serialNumber}</AssetTag> },
              { header: "الحالة", render: (d: Device) => <span className={`badge ${STATUS_TONE[d.status]}`}>{STATUS_LABELS[d.status] ?? d.status}</span> },
              { header: "المستودع", render: (d: Device) => d.warehouse?.name ?? "-" },
              { header: "العقد", render: (d: Device) => d.contract ? <AssetTag>{d.contract.contractNumber}</AssetTag> : "-" },
            ]}
            rows={devices}
          />
        )}
      </div>
    </div>
  );
}
