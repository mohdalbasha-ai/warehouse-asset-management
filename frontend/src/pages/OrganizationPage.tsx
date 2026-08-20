import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

interface Department { id: string; name: string; code: string; status: string; }
interface Center { id: string; name: string; code: string; department: { name: string }; status: string; }

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [centerForm, setCenterForm] = useState({ name: "", code: "", departmentId: "" });

  function reload() {
    api.get("/departments").then((r) => setDepartments(r.data));
    api.get("/centers").then((r) => setCenters(r.data)).catch(() => setCenters([]));
  }

  useEffect(reload, []);

  async function saveDept() {
    await api.post("/departments", deptForm);
    setShowDeptModal(false);
    setDeptForm({ name: "", code: "" });
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">المراكز والمديريات</h1>
        <button className="btn btn-primary" onClick={() => setShowDeptModal(true)}>+ مديرية جديدة</button>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">المديريات</h2>
        <DataTable
          columns={[
            { header: "الاسم", render: (d: Department) => d.name },
            { header: "الرمز", render: (d: Department) => d.code },
            { header: "الحالة", render: (d: Department) => <span className="badge badge-normal">{d.status}</span> },
          ]}
          rows={departments}
        />
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">المراكز</h2>
          <button className="btn btn-secondary" onClick={() => setShowCenterModal(true)}>+ مركز جديد</button>
        </div>
        <DataTable
          columns={[
            { header: "الاسم", render: (c: Center) => c.name },
            { header: "الرمز", render: (c: Center) => c.code },
            { header: "المديرية", render: (c: Center) => c.department?.name },
          ]}
          rows={centers}
        />
      </div>

      {showDeptModal && (
        <Modal title="مديرية جديدة" onClose={() => setShowDeptModal(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="الاسم" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
            <input className="input" placeholder="الرمز" value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} />
            <button className="btn btn-primary w-full" onClick={saveDept}>حفظ</button>
          </div>
        </Modal>
      )}

      {showCenterModal && (
        <Modal title="مركز جديد" onClose={() => setShowCenterModal(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="الاسم" value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} />
            <input className="input" placeholder="الرمز" value={centerForm.code} onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })} />
            <select className="input" value={centerForm.departmentId} onChange={(e) => setCenterForm({ ...centerForm, departmentId: e.target.value })}>
              <option value="">اختر المديرية</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button
              className="btn btn-primary w-full"
              onClick={async () => {
                await api.post("/centers", centerForm);
                setShowCenterModal(false);
                reload();
              }}
            >
              حفظ
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
