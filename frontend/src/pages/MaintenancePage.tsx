import { useEffect, useState } from "react";
import { api } from "../api/client";
import Modal from "../components/Modal";
import { Plus } from "lucide-react";

interface MaintenanceRequest {
  id: string; requestNumber: string; issue: string; status: string; priority: string;
  device: { name: string; serialNumber: string }; employee: { fullName: string }; coverageType?: string;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد", RECEIVED: "مستلم", INSPECTING: "قيد الفحص", COVERAGE_DETERMINED: "تم تحديد التغطية",
  AWAITING_APPROVAL: "بانتظار الاعتماد", APPROVED: "معتمد", REJECTED: "مرفوض",
  SENT_FOR_REPAIR: "أُرسل للصيانة", IN_REPAIR: "قيد الإصلاح", REPAIRED: "تم الإصلاح",
  POST_CHECK: "فحص ما بعد الصيانة", DELIVERED_TO_USER: "سُلّم للمستخدم", CLOSED: "مغلق",
};

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ requestNumber: "", deviceId: "", employeeId: "", issue: "", priority: "MEDIUM" });
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);

  function reload() { api.get("/maintenance").then((r) => setRequests(r.data)); }
  useEffect(() => {
    reload();
    api.get("/devices").then((r) => setDevices(r.data));
    api.get("/employees").then((r) => setEmployees(r.data));
  }, []);

  async function save() {
    await api.post("/maintenance", form);
    setShow(false);
    reload();
  }

  async function inspect(id: string) {
    await api.post(`/maintenance/${id}/inspect`, {});
    reload();
  }

  async function approve(id: string, approved: boolean) {
    await api.post(`/maintenance/${id}/approve`, { approved });
    reload();
  }

  async function advance(id: string, stage: string) {
    await api.post(`/maintenance/${id}/advance`, { stage });
    reload();
  }

  const NEXT_STAGE: Record<string, string> = {
    APPROVED: "SENT_FOR_REPAIR", COVERAGE_DETERMINED: "SENT_FOR_REPAIR",
    SENT_FOR_REPAIR: "IN_REPAIR", IN_REPAIR: "REPAIRED", REPAIRED: "POST_CHECK",
    POST_CHECK: "DELIVERED_TO_USER", DELIVERED_TO_USER: "CLOSED",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">طلبات الصيانة</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4" /> طلب صيانة جديد</button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>الرقم</th><th>الجهاز</th><th>الموظف</th><th>الأولوية</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.requestNumber}</td>
                <td>{r.device?.name}</td>
                <td>{r.employee?.fullName}</td>
                <td>{r.priority}</td>
                <td><span className="badge badge-normal">{STATUS_LABELS[r.status] ?? r.status}</span></td>
                <td className="space-x-2 space-x-reverse">
                  {r.status === "NEW" && <button className="btn btn-secondary" onClick={() => inspect(r.id)}>فحص وتحديد التغطية</button>}
                  {r.status === "AWAITING_APPROVAL" && (
                    <>
                      <button className="btn btn-primary" onClick={() => approve(r.id, true)}>اعتماد</button>
                      <button className="btn btn-secondary" onClick={() => approve(r.id, false)}>رفض</button>
                    </>
                  )}
                  {NEXT_STAGE[r.status] && (
                    <button className="btn btn-secondary" onClick={() => advance(r.id, NEXT_STAGE[r.status])}>
                      التالي: {STATUS_LABELS[NEXT_STAGE[r.status]]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={6} className="text-center text-steel-500 py-4">لا توجد طلبات</td></tr>}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="طلب صيانة جديد" onClose={() => setShow(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="رقم الطلب" value={form.requestNumber} onChange={(e) => setForm({ ...form, requestNumber: e.target.value })} />
            <select className="input" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}>
              <option value="">اختر الجهاز</option>
              {devices.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.serialNumber}</option>)}
            </select>
            <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">اختر الموظف</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
            <input className="input" placeholder="المشكلة" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">منخفضة</option>
              <option value="MEDIUM">متوسطة</option>
              <option value="HIGH">عالية</option>
              <option value="CRITICAL">حرجة</option>
            </select>
            <button className="btn btn-primary w-full" onClick={save}>إنشاء الطلب</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
