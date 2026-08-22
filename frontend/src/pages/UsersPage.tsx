import { useEffect, useState } from "react";
import { api } from "../api/client";
import Modal from "../components/Modal";
import { Plus } from "lucide-react";

interface User { id: string; fullName: string; username: string; email: string; roles: { role: { name: string } }[]; status: string; }
interface Role { id: string; name: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", roleIds: [] as string[] });

  function reload() {
    api.get("/users").then((r) => setUsers(r.data));
    api.get("/roles").then((r) => setRoles(r.data));
  }
  useEffect(reload, []);

  async function save() {
    setError("");
    try {
      await api.post("/users", form);
      setShow(false);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "حدث خطأ");
    }
  }

  function toggleRole(id: string) {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter((r) => r !== id) : [...f.roleIds, id],
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold text-ink-900">المستخدمون</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4" /> مستخدم جديد</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>البريد</th><th>الأدوار</th><th>الحالة</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.roles.map((r) => r.role.name).join(", ")}</td>
                <td><span className="badge badge-normal">{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="مستخدم جديد" onClose={() => setShow(false)}>
          <div className="space-y-3">
            {error && <div className="text-danger-600 text-sm">{error}</div>}
            <input className="input" placeholder="الاسم الكامل" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="input" placeholder="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className="input" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input" type="password" placeholder="كلمة المرور (8 أحرف على الأقل)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <div>
              <div className="text-sm font-semibold mb-1">الأدوار</div>
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                  {r.name}
                </label>
              ))}
            </div>
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
