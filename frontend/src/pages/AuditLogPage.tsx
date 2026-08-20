import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AuditLog { id: string; action: string; entity: string; entityId?: string; screen?: string; createdAt: string; }

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.get("/audit-log").then((r) => setLogs(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">سجل العمليات</h1>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>العملية</th><th>الكيان</th><th>المسار</th><th>التاريخ والوقت</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.action}</td>
                <td>{l.entity}</td>
                <td className="text-xs text-gray-500">{l.screen}</td>
                <td>{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-4">لا يوجد سجل</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
