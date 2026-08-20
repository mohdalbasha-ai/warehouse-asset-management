import { useEffect, useState } from "react";
import { api } from "../api/client";
import Modal from "../components/Modal";

interface Permission { id: string; resource: string; action: string; }
interface Role { id: string; name: string; permissions: { permission: Permission }[]; }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", permissionIds: [] as string[] });

  function reload() {
    api.get("/roles").then((r) => setRoles(r.data));
    api.get("/roles/permissions/all").then((r) => setPermissions(r.data));
  }
  useEffect(reload, []);

  async function save() {
    await api.post("/roles", form);
    setShow(false);
    reload();
  }

  function togglePermission(id: string) {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id) ? f.permissionIds.filter((p) => p !== id) : [...f.permissionIds, id],
    }));
  }

  const resources = Array.from(new Set(permissions.map((p) => p.resource)));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">الأدوار والصلاحيات</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ دور جديد</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="card">
            <div className="font-semibold mb-2">{r.name}</div>
            <div className="text-xs text-gray-500">{r.permissions.length} صلاحية</div>
          </div>
        ))}
      </div>

      {show && (
        <Modal title="دور جديد" onClose={() => setShow(false)}>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <input className="input" placeholder="اسم الدور" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {resources.map((resource) => (
              <div key={resource} className="border rounded p-2">
                <div className="text-sm font-semibold mb-1">{resource}</div>
                <div className="flex flex-wrap gap-2">
                  {permissions.filter((p) => p.resource === resource).map((p) => (
                    <label key={p.id} className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={form.permissionIds.includes(p.id)} onChange={() => togglePermission(p.id)} />
                      {p.action}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
