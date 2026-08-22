import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { Plus } from "lucide-react";

interface Supplier { id: string; name: string; code: string; phone?: string; email?: string; }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", phone: "", email: "" });

  function reload() { api.get("/suppliers").then((r) => setSuppliers(r.data)); }
  useEffect(reload, []);

  async function save() {
    await api.post("/suppliers", form);
    setShow(false);
    setForm({ name: "", code: "", phone: "", email: "" });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">الموردون</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4" /> مورد جديد</button>
      </div>
      <div className="card">
        <DataTable
          columns={[
            { header: "الاسم", render: (s: Supplier) => s.name },
            { header: "الرمز", render: (s: Supplier) => s.code },
            { header: "الهاتف", render: (s: Supplier) => s.phone ?? "-" },
            { header: "البريد", render: (s: Supplier) => s.email ?? "-" },
          ]}
          rows={suppliers}
        />
      </div>
      {show && (
        <Modal title="مورد جديد" onClose={() => setShow(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="الرمز" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="input" placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
