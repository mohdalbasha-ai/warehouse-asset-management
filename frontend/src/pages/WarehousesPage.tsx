import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { Plus } from "lucide-react";

interface Warehouse { id: string; name: string; code: string; center?: { name: string }; location?: string; }
interface Center { id: string; name: string; }

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", centerId: "", location: "" });

  function reload() {
    api.get("/warehouses").then((r) => setWarehouses(r.data));
    api.get("/centers").then((r) => setCenters(r.data));
  }
  useEffect(reload, []);

  async function save() {
    await api.post("/warehouses", form);
    setShow(false);
    setForm({ name: "", code: "", centerId: "", location: "" });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">المستودعات</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4" /> مستودع جديد</button>
      </div>
      <div className="card">
        <DataTable
          columns={[
            { header: "الاسم", render: (w: Warehouse) => w.name },
            { header: "الرمز", render: (w: Warehouse) => w.code },
            { header: "المركز", render: (w: Warehouse) => w.center?.name ?? "-" },
            { header: "الموقع", render: (w: Warehouse) => w.location ?? "-" },
          ]}
          rows={warehouses}
        />
      </div>
      {show && (
        <Modal title="مستودع جديد" onClose={() => setShow(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="الرمز" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <select className="input" value={form.centerId} onChange={(e) => setForm({ ...form, centerId: e.target.value })}>
              <option value="">اختر المركز</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
