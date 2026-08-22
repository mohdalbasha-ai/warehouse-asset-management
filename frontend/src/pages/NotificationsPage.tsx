import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Notification { id: string; type: string; message: string; priority: string; isRead: boolean; createdAt: string; }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function reload() { api.get("/notifications").then((r) => setNotifications(r.data)); }
  useEffect(reload, []);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    reload();
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">الإشعارات</h1>
        <button className="btn btn-secondary" onClick={markAllRead}>تحديد الكل كمقروء</button>
      </div>
      <div className="card divide-y">
        {notifications.map((n) => (
          <div key={n.id} className={`py-3 flex justify-between items-center ${n.isRead ? "opacity-60" : ""}`}>
            <div>
              <div className="text-sm">{n.message}</div>
              <div className="text-xs text-steel-500">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
            {!n.isRead && <button className="btn btn-secondary" onClick={() => markRead(n.id)}>تمت القراءة</button>}
          </div>
        ))}
        {notifications.length === 0 && <div className="text-center text-steel-500 py-8">لا توجد إشعارات</div>}
      </div>
    </div>
  );
}
