import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Warehouse { id: string; name: string; }
interface Item { id: string; name: string; itemNumber: string; requiresSerial: boolean; }
interface Supplier { id: string; name: string; }

export default function StockReceivePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    receiptNumber: "", warehouseId: "", supplierId: "",
    lines: [{ itemId: "", quantity: 1, serialNumber: "", unitPrice: 0 }],
  });

  useEffect(() => {
    api.get("/warehouses").then((r) => setWarehouses(r.data));
    api.get("/items").then((r) => setItems(r.data));
    api.get("/suppliers").then((r) => setSuppliers(r.data));
  }, []);

  function updateLine(i: number, field: string, value: any) {
    const lines = [...form.lines];
    (lines[i] as any)[field] = value;
    setForm({ ...form, lines });
  }

  function addLine() {
    setForm({ ...form, lines: [...form.lines, { itemId: "", quantity: 1, serialNumber: "", unitPrice: 0 }] });
  }

  async function submit() {
    setError(""); setMessage("");
    try {
      await api.post("/stock/receipts", form);
      setMessage("تم تسجيل التوريد بنجاح وتحديث الرصيد.");
      setForm({ receiptNumber: "", warehouseId: "", supplierId: "", lines: [{ itemId: "", quantity: 1, serialNumber: "", unitPrice: 0 }] });
    } catch (e: any) {
      setError(e.response?.data?.error ?? "حدث خطأ أثناء التوريد");
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">الاستلام (التوريد)</h1>
      {message && <div className="bg-green-50 text-green-700 p-3 rounded text-sm">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

      <div className="card space-y-3">
        <input className="input" placeholder="رقم سند التوريد" value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} />
        <select className="input" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
          <option value="">اختر المستودع</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
          <option value="">اختر المورد (اختياري)</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div className="space-y-2">
          <div className="font-semibold text-sm">الأصناف</div>
          {form.lines.map((line, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <select className="input" value={line.itemId} onChange={(e) => updateLine(i, "itemId", e.target.value)}>
                <option value="">الصنف</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
              </select>
              <input className="input" type="number" placeholder="الكمية" value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} />
              <input className="input" placeholder="Serial (إن وجد)" value={line.serialNumber} onChange={(e) => updateLine(i, "serialNumber", e.target.value)} />
              <input className="input" type="number" placeholder="سعر الوحدة" value={line.unitPrice} onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))} />
            </div>
          ))}
          <button className="btn btn-secondary" onClick={addLine}>+ إضافة صنف</button>
        </div>

        <button className="btn btn-primary w-full" onClick={submit}>تسجيل التوريد</button>
      </div>
    </div>
  );
}
