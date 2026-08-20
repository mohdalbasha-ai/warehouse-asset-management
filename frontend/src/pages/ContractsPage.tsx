import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import RiskBadge from "../components/RiskBadge";
import Modal from "../components/Modal";

interface Contract {
  id: string; contractNumber: string; name: string; type: string; status: string;
  endDate: string; daysRemaining: number; riskLevel: string; supplier: { name: string };
}
interface Supplier { id: string; name: string; }

const TYPE_LABELS: Record<string, string> = {
  SUPPLY: "توريد", MAINTENANCE: "صيانة", SUPPLY_AND_MAINTENANCE: "توريد وصيانة",
  SERVICES: "خدمات", TECHNICAL_SUPPORT: "دعم فني", WARRANTY: "ضمان", OTHER: "أخرى",
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ contractNumber: "", name: "", type: "SUPPLY", supplierId: "", startDate: "", endDate: "", value: 0 });

  function reload() {
    api.get("/contracts").then((r) => setContracts(r.data));
    api.get("/suppliers").then((r) => setSuppliers(r.data));
  }
  useEffect(reload, []);

  async function save() {
    await api.post("/contracts", form);
    setShow(false);
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">العقود</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ عقد جديد</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>رقم العقد</th><th>الاسم</th><th>النوع</th><th>المورد</th><th>تاريخ النهاية</th><th>الأيام المتبقية</th><th>الحالة</th></tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id}>
                <td><Link className="text-primary-600 underline" to={`/contracts/${c.id}`}>{c.contractNumber}</Link></td>
                <td>{c.name}</td>
                <td>{TYPE_LABELS[c.type] ?? c.type}</td>
                <td>{c.supplier?.name}</td>
                <td>{new Date(c.endDate).toLocaleDateString()}</td>
                <td>{c.daysRemaining}</td>
                <td><RiskBadge level={c.riskLevel} /></td>
              </tr>
            ))}
            {contracts.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-4">لا توجد عقود</td></tr>}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="عقد جديد" onClose={() => setShow(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="رقم العقد" value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} />
            <input className="input" placeholder="اسم العقد" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">اختر المورد</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <input className="input" type="number" placeholder="القيمة" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
