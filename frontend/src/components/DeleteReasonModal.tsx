import { useState } from "react";
import Modal from "./Modal";
import { Trash2 } from "lucide-react";

/** نافذة تأكيد حذف تطلب سببًا إلزاميًا قبل تنفيذ الحذف (حذف ناعم/تعطيل في الخلفية) */
export default function DeleteReasonModal({
  title, itemLabel, onClose, onConfirm,
}: {
  title: string; itemLabel: string; onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (reason.trim().length < 3) {
      setError("سبب الحذف مطلوب (3 أحرف على الأقل)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(reason.trim());
    } catch (e: any) {
      setError(e.response?.data?.error ?? "تعذر الحذف");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-steel-500">
          أنت على وشك حذف <span className="font-medium text-ink-900">{itemLabel}</span>. الرجاء توضيح سبب الحذف.
        </p>
        {error && <div className="bg-danger-50 text-danger-600 text-sm rounded-lg px-3 py-2">{error}</div>}
        <div>
          <label className="field-label">سبب الحذف</label>
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </div>
        <button className="btn btn-danger w-full" onClick={submit} disabled={loading}>
          <Trash2 className="w-4 h-4" /> {loading ? "جارِ الحذف..." : "تأكيد الحذف"}
        </button>
      </div>
    </Modal>
  );
}
