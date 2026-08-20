import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<any>(null);

  useEffect(() => {
    api.get(`/devices/${id}/full-history`).then((r) => setDevice(r.data));
  }, [id]);

  if (!device) return <div>...جاري التحميل</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{device.name} — {device.serialNumber}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card"><div className="text-sm text-gray-500">الحالة</div><div className="font-bold">{device.status}</div></div>
        <div className="card"><div className="text-sm text-gray-500">العقد</div><div className="font-bold">{device.contract?.contractNumber ?? "-"}</div></div>
        <div className="card"><div className="text-sm text-gray-500">المورد</div><div className="font-bold">{device.contract?.supplier?.name ?? "-"}</div></div>
        <div className="card">
          <div className="text-sm text-gray-500">الضمان</div>
          <div className="font-bold">{device.warranty ? new Date(device.warranty.endDate).toLocaleDateString() : "لا يوجد"}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">سجل التسليم والإرجاع</h2>
        <table className="data-table">
          <thead><tr><th>الإجراء</th><th>الموظف</th><th>التاريخ</th><th>ملاحظات</th></tr></thead>
          <tbody>
            {device.assignments.map((a: any) => (
              <tr key={a.id}>
                <td>{a.action === "ISSUE" ? "تسليم" : "إرجاع"}</td>
                <td>{a.employee?.fullName}</td>
                <td>{new Date(a.date).toLocaleDateString()}</td>
                <td>{a.notes ?? "-"}</td>
              </tr>
            ))}
            {device.assignments.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-4">لا يوجد سجل</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">طلبات الصيانة</h2>
        {device.maintenanceRequests.map((req: any) => (
          <div key={req.id} className="border rounded p-3 mb-2">
            <div className="flex justify-between">
              <span className="font-semibold">{req.requestNumber} — {req.issue}</span>
              <span className="badge badge-normal">{req.status}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              مراحل: {req.actions.map((a: any) => a.stage).join(" ← ")}
            </div>
          </div>
        ))}
        {device.maintenanceRequests.length === 0 && <div className="text-gray-400 text-sm">لا توجد طلبات صيانة</div>}
      </div>
    </div>
  );
}
