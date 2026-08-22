import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Warehouse { id: string; name: string; }
interface Item { id: string; name: string; }
interface Employee { id: string; fullName: string; }

export default function StockIssuePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    issueNumber: "", warehouseId: "", recipientEmployeeId: "", reason: "",
    lines: [{ itemId: "", quantity: 1, serialNumber: "" }],
  });

  useEffect(() => {
    api.get("/warehouses").then((r) => setWarehouses(r.data));
    api.get("/items").then((r) => setItems(r.data));
    api.get("/employees").then((r) => setEmployees(r.data));
  }, []);

  function updateLine(i: number, field: string, value: any) {
    const lines = [...form.lines];
    (lines[i] as any)[field] = value;
    setForm({ ...form, lines });
  }

  async function submit() {
    setError(""); setMessage("");
    try {
      await api.post("/stock/issues", form);
      setMessage("تم تسجيل الصرف بنجاح وتحديث الرصيد.");
      setForm({ issueNumber: "", warehouseId: "", recipientEmployeeId: "", reason: "", lines: [{ itemId: "", quantity: 1, serialNumber: "" }] });
    } catch (e: any) {
      setError(e.response?.data?.error ?? "حدث خطأ أثناء الصرف — تحقق من الرصيد المتاح");
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-xl font-bold text-ink-900">الصرف</h1>
      {message && <div className="bg-success-50 text-success-600 p-3 rounded text-sm">{message}</div>}
      {error && <div className="bg-danger-50 text-danger-600 p-3 rounded text-sm">{error}</div>}

      <div className="card space-y-3">
        <input className="input" placeholder="رقم سند الصرف" value={form.issueNumber} onChange={(e) => setForm({ ...form, issueNumber: e.target.value })} />
        <select className="input" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
          <option value="">اختر المستودع</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="input" value={form.recipientEmployeeId} onChange={(e) => setForm({ ...form, recipientEmployeeId: e.target.value })}>
          <option value="">الجهة المستلمة</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </select>
        <input className="input" placeholder="سبب الصرف" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />

        <div className="space-y-2">
          <div className="font-semibold text-sm">الأصناف</div>
          {form.lines.map((line, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <select className="input" value={line.itemId} onChange={(e) => updateLine(i, "itemId", e.target.value)}>
                <option value="">الصنف</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              </select>
              <input className="input" type="number" placeholder="الكمية" value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} />
              <input className="input" placeholder="Serial (إن وجد)" value={line.serialNumber} onChange={(e) => updateLine(i, "serialNumber", e.target.value)} />
            </div>
          ))}
          <button className="btn btn-secondary" onClick={() => setForm({ ...form, lines: [...form.lines, { itemId: "", quantity: 1, serialNumber: "" }] })}>
            + إضافة صنف
          </button>
        </div>

        <button className="btn btn-primary w-full" onClick={submit}>تسجيل الصرف</button>
      </div>
    </div>
  );
}
