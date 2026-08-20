import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import DataTable from "../components/DataTable";

interface Device {
  id: string; internalNumber: string; name: string; serialNumber: string; status: string;
  warehouse?: { name: string }; contract?: { contractNumber: string };
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد", IN_WAREHOUSE: "بالمستودع", DELIVERED: "تم تسليمه", IN_USE: "مستخدم",
  UNDER_MAINTENANCE: "تحت الصيانة", FAULTY: "معطل", OUT_OF_SERVICE: "خارج الخدمة",
  RETURNED: "مرتجع", LOST: "مفقود", DAMAGED: "تالف",
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
        <h1 className="text-xl font-bold">الأجهزة</h1>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="card">
        <DataTable
          columns={[
            { header: "الرقم الداخلي", render: (d: Device) => <Link className="text-primary-600 underline" to={`/devices/${d.id}`}>{d.internalNumber}</Link> },
            { header: "الاسم", render: (d: Device) => d.name },
            { header: "Serial Number", render: (d: Device) => d.serialNumber },
            { header: "الحالة", render: (d: Device) => <span className="badge badge-normal">{STATUS_LABELS[d.status] ?? d.status}</span> },
            { header: "المستودع", render: (d: Device) => d.warehouse?.name ?? "-" },
            { header: "العقد", render: (d: Device) => d.contract?.contractNumber ?? "-" },
          ]}
          rows={devices}
        />
      </div>
    </div>
  );
}
