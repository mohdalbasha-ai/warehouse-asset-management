import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import AssetTag from "../components/AssetTag";
import EmptyState from "../components/EmptyState";
import AttachmentsPanel from "../components/AttachmentsPanel";
import { ArrowLeftRight, Wrench, Cpu, ShieldCheck } from "lucide-react";

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<any>(null);

  useEffect(() => {
    api.get(`/devices/${id}/full-history`).then((r) => setDevice(r.data));
  }, [id]);

  if (!device) return <div className="animate-pulse text-steel-500">...جاري التحميل</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg bg-petrol-50 text-petrol-600 flex items-center justify-center">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">{device.name}</h1>
          <AssetTag>{device.serialNumber}</AssetTag>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card"><div className="text-xs text-steel-500 mb-1">الحالة</div><span className="badge badge-normal">{device.status}</span></div>
        <div className="card"><div className="text-xs text-steel-500 mb-1">العقد</div><div className="font-medium text-sm">{device.contract?.contractNumber ?? "-"}</div></div>
        <div className="card"><div className="text-xs text-steel-500 mb-1">المورد</div><div className="font-medium text-sm">{device.contract?.supplier?.name ?? "-"}</div></div>
        <div className="card">
          <div className="text-xs text-steel-500 mb-1">الضمان</div>
          <div className="font-medium text-sm">{device.warranty ? new Date(device.warranty.endDate).toLocaleDateString() : "لا يوجد"}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display font-semibold mb-3 text-ink-900 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-petrol-600" /> سجل التسليم والإرجاع
        </h2>
        {device.assignments.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="لا يوجد سجل تسليم أو إرجاع بعد" />
        ) : (
          <table className="data-table">
            <thead><tr><th>الإجراء</th><th>الموظف</th><th>التاريخ</th><th>ملاحظات</th></tr></thead>
            <tbody>
              {device.assignments.map((a: any) => (
                <tr key={a.id}>
                  <td>
                    <span className={`badge ${a.action === "ISSUE" ? "badge-normal" : "badge-warning"}`}>
                      {a.action === "ISSUE" ? "تسليم" : "إرجاع"}
                    </span>
                  </td>
                  <td>{a.employee?.fullName}</td>
                  <td>{new Date(a.date).toLocaleDateString()}</td>
                  <td className="text-steel-500">{a.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="font-display font-semibold mb-3 text-ink-900 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-petrol-600" /> طلبات الصيانة
        </h2>
        {device.maintenanceRequests.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="لم يخضع هذا الجهاز لأي صيانة" hint="سجل نظيف حتى الآن" />
        ) : (
          <div className="space-y-2">
            {device.maintenanceRequests.map((req: any) => (
              <div key={req.id} className="border border-steel-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{req.requestNumber} — {req.issue}</span>
                  <span className="badge badge-normal">{req.status}</span>
                </div>
                <div className="text-xs text-steel-500 mt-1.5">
                  {req.actions.map((a: any) => a.stage).join(" ← ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AttachmentsPanel entityType="device" entityId={device.id} />
    </div>
  );
}
