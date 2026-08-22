import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import Modal from "../components/Modal";
import AttachmentsPanel from "../components/AttachmentsPanel";
import { Plus } from "lucide-react";

export default function ContractDetailPage() {
  const { id } = useParams();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ batchNumber: "", quantity: 1, agreedDate: "" });

  function reload() {
    api.get(`/contracts/${id}/deliveries`).then((r) => setDeliveries(r.data));
  }
  useEffect(reload, [id]);

  async function save() {
    await api.post(`/contracts/${id}/deliveries`, form);
    setShow(false);
    reload();
  }

  async function receive(deliveryId: string) {
    await api.post(`/contracts/deliveries/${deliveryId}/receive`, {});
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">دفعات التوريد الخاصة بالعقد</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4" /> دفعة جديدة</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>الدفعة</th><th>موعد التوريد</th><th>تاريخ الاستلام</th><th>أيام التأخير</th><th>الحالة</th></tr></thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td>{d.batchNumber}</td>
                <td>{new Date(d.agreedDate).toLocaleDateString()}</td>
                <td>{d.actualDate ? new Date(d.actualDate).toLocaleDateString() : "-"}</td>
                <td className={d.isDelayed ? "text-danger-600 font-bold" : ""}>{d.delayDays}</td>
                <td><span className="badge badge-normal">{d.computedStatus}</span></td>
              </tr>
            ))}
            {deliveries.length === 0 && <tr><td colSpan={5} className="text-center text-steel-500 py-4">لا توجد دفعات</td></tr>}
          </tbody>
        </table>
      </div>

      {id && <AttachmentsPanel entityType="contract" entityId={id} />}
    </div>
  );
}
