import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);

  function reload() { api.get("/contracts/deliveries/all").then((r) => setDeliveries(r.data)); }
  useEffect(reload, []);

  async function receive(id: string) {
    await api.post(`/contracts/deliveries/${id}/receive`, {});
    reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink-900">دفعات التوريد</h1>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>العقد</th><th>المورد</th><th>الدفعة</th><th>موعد التوريد</th><th>أيام التأخير</th><th>الحالة</th><th></th></tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td>{d.contract?.contractNumber}</td>
                <td>{d.contract?.supplier?.name}</td>
                <td>{d.batchNumber}</td>
                <td>{new Date(d.agreedDate).toLocaleDateString()}</td>
                <td className={d.isDelayed ? "text-danger-600 font-bold" : ""}>{d.delayDays}</td>
                <td><span className="badge badge-normal">{d.computedStatus}</span></td>
                <td>{!d.actualDate && <button className="btn btn-secondary" onClick={() => receive(d.id)}>تسجيل الاستلام</button>}</td>
              </tr>
            ))}
            {deliveries.length === 0 && <tr><td colSpan={7} className="text-center text-steel-500 py-4">لا توجد دفعات توريد</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
