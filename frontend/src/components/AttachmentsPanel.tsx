import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Paperclip, Download, Trash2, Upload } from "lucide-react";

interface Attachment { id: string; fileName: string; fileType: string; uploadedAt: string; }

const ENTITY_LABELS: Record<string, string> = {
  contract: "العقد", delivery: "الدفعة", device: "الجهاز", assignment: "حركة التسليم",
  receipt: "سند التوريد", issue: "سند الصرف", maintenanceRequest: "طلب الصيانة",
};

/** لوحة مرفقات قابلة لإعادة الاستخدام — تُربط بأي كيان يدعم المرفقات في الـ Backend */
export default function AttachmentsPanel({ entityType, entityId }: { entityType: keyof typeof ENTITY_LABELS; entityId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function reload() {
    api.get("/attachments", { params: { entityType, entityId } }).then((r) => setAttachments(r.data)).catch(() => {});
  }
  useEffect(reload, [entityType, entityId]);

  async function handleUpload(file: File) {
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);
    try {
      await api.post("/attachments", formData, { headers: { "Content-Type": "multipart/form-data" } });
      reload();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "تعذر رفع الملف");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function download(id: string, name: string) {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`/api/attachments/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  async function remove(id: string) {
    await api.delete(`/attachments/${id}`);
    reload();
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display font-semibold text-ink-900 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-petrol-600" /> المرفقات
        </h2>
        <label className="btn btn-secondary cursor-pointer">
          <Upload className="w-4 h-4" /> {uploading ? "جارِ الرفع..." : "رفع ملف"}
          <input
            ref={fileInput} type="file" className="hidden" disabled={uploading}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      </div>

      {error && <div className="bg-danger-50 text-danger-600 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}

      {attachments.length === 0 ? (
        <div className="text-sm text-steel-500 text-center py-4">لا توجد مرفقات بعد</div>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between border border-steel-200 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-3.5 h-3.5 text-steel-500 shrink-0" />
                <span className="truncate">{a.fileName}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="btn-ghost p-1.5 rounded-lg" onClick={() => download(a.id, a.fileName)}><Download className="w-4 h-4" /></button>
                <button className="btn-ghost p-1.5 rounded-lg text-danger-600" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
