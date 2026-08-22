import { useEffect, useState } from "react";
import { api } from "../api/client";
import Modal from "../components/Modal";
import { Plus } from "lucide-react";

interface Warranty { id: string; startDate: string; endDate: string; isActive: boolean; device: { name: string; serialNumber: string }; }

export default function WarrantyPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ deviceId: "", startDate: "", endDate: "" });

  function reload() { api.get("/warranty").then((r) => setWarranties(r.data)); }
  useEffect(() => {
    reload();
    api.get("/devices").then((r) => setDevices(r.data));
  }, []);

  async function save() {
    await api.post("/warranty", form);
    setShow(false);
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">الضمان</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4" /> ضمان جديد</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>الجهاز</th><th>بداية الضمان</th><th>نهاية الضمان</th><th>الحالة</th></tr></thead>
          <tbody>
            {warranties.map((w) => (
              <tr key={w.id}>
                <td>{w.device?.name} ({w.device?.serialNumber})</td>
                <td>{new Date(w.startDate).toLocaleDateString()}</td>
                <td>{new Date(w.endDate).toLocaleDateString()}</td>
                <td>
                  <span className={`badge ${w.isActive ? "badge-normal" : "badge-expired"}`}>
                    {w.isActive ? "فعّال" : "منتهي"}
                  </span>
                </td>
              </tr>
            ))}
            {warranties.length === 0 && <tr><td colSpan={4} className="text-center text-steel-500 py-4">لا توجد ضمانات</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <Modal title="ضمان جديد" onClose={() => setShow(false)}>
          <div className="space-y-3">
            <select className="input" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}>
              <option value="">اختر الجهاز</option>
              {devices.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.serialNumber}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
