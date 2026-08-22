import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Warehouse { id: string; name: string; }
interface Item { id: string; name: string; }

export default function StockTransfersPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    transferNumber: "", fromWarehouseId: "", toWarehouseId: "",
    lines: [{ itemId: "", quantity: 1, serialNumber: "" }],
  });

  function reloadPending() {
    // لا يوجد GET عام للمناقلات في الـ API الحالي، لذا نعرض فقط ما أُنشئ في هذه الجلسة
  }

  useEffect(() => {
    api.get("/warehouses").then((r) => setWarehouses(r.data));
    api.get("/items").then((r) => setItems(r.data));
  }, []);

  function updateLine(i: number, field: string, value: any) {
    const lines = [...form.lines];
    (lines[i] as any)[field] = value;
    setForm({ ...form, lines });
  }

  async function submit() {
    setError(""); setMessage("");
    try {
      const { data } = await api.post("/stock/transfers", form);
      setMessage(`تم إنشاء المناقلة رقم ${data.transferNumber} — بانتظار تأكيد الاستلام في المستودع الوجهة.`);
      setPending((p) => [data, ...p]);
      setForm({ transferNumber: "", fromWarehouseId: "", toWarehouseId: "", lines: [{ itemId: "", quantity: 1, serialNumber: "" }] });
    } catch (e: any) {
      setError(e.response?.data?.error ?? "حدث خطأ أثناء المناقلة");
    }
  }

  async function confirmReceive(id: string) {
    await api.post(`/stock/transfers/${id}/receive`, {});
    setPending((p) => p.map((t) => (t.id === id ? { ...t, status: "RECEIVED" } : t)));
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-xl font-bold text-ink-900">المناقلات بين المستودعات</h1>
      {message && <div className="bg-success-50 text-success-600 p-3 rounded text-sm">{message}</div>}
      {error && <div className="bg-danger-50 text-danger-600 p-3 rounded text-sm">{error}</div>}

      <div className="card space-y-3">
        <input className="input" placeholder="رقم المناقلة" value={form.transferNumber} onChange={(e) => setForm({ ...form, transferNumber: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={form.fromWarehouseId} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
            <option value="">من مستودع</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select className="input" value={form.toWarehouseId} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
            <option value="">إلى مستودع</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

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

        <button className="btn btn-primary w-full" onClick={submit}>إنشاء المناقلة</button>
      </div>

      {pending.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">مناقلات هذه الجلسة</h2>
          {pending.map((t) => (
            <div key={t.id} className="flex justify-between items-center border-t py-2 text-sm">
              <span>{t.transferNumber} — {t.status}</span>
              {t.status !== "RECEIVED" && (
                <button className="btn btn-secondary" onClick={() => confirmReceive(t.id)}>تأكيد الاستلام</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
