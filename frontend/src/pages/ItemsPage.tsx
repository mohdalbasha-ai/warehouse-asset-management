import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { Plus } from "lucide-react";

interface Item { id: string; itemNumber: string; name: string; category: string; unit: string; minStock: number; }

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    itemNumber: "", name: "", category: "", unit: "", minStock: 0,
    requiresSerial: false, isDevice: false, isMaintainable: false, hasWarranty: false,
  });

  function reload() { api.get("/items").then((r) => setItems(r.data)); }
  useEffect(reload, []);

  async function save() {
    setError("");
    try {
      await api.post("/items", form);
      setShow(false);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "حدث خطأ");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">الأصناف</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4" /> صنف جديد</button>
      </div>
      <div className="card">
        <DataTable
          columns={[
            { header: "رقم الصنف", render: (i: Item) => i.itemNumber },
            { header: "الاسم", render: (i: Item) => i.name },
            { header: "التصنيف", render: (i: Item) => i.category },
            { header: "الوحدة", render: (i: Item) => i.unit },
            { header: "الحد الأدنى", render: (i: Item) => i.minStock },
          ]}
          rows={items}
        />
      </div>
      {show && (
        <Modal title="صنف جديد" onClose={() => setShow(false)}>
          <div className="space-y-3">
            {error && <div className="text-danger-600 text-sm">{error}</div>}
            <input className="input" placeholder="رقم الصنف" value={form.itemNumber} onChange={(e) => setForm({ ...form, itemNumber: e.target.value })} />
            <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="التصنيف" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input className="input" placeholder="الوحدة" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <input className="input" type="number" placeholder="الحد الأدنى" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.requiresSerial} onChange={(e) => setForm({ ...form, requiresSerial: e.target.checked })} />
              يحتاج Serial Number
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDevice} onChange={(e) => setForm({ ...form, isDevice: e.target.checked })} />
              يعتبر جهازًا
            </label>
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
