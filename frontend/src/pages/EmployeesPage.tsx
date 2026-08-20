import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

interface Employee { id: string; fullName: string; employeeNumber: string; department: { name: string }; center: { name: string }; }
interface Department { id: string; name: string; }
interface Center { id: string; name: string; departmentId: string; }

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ fullName: "", employeeNumber: "", departmentId: "", centerId: "" });
  const [transferForm, setTransferForm] = useState({ toDepartmentId: "", toCenterId: "", reason: "" });

  function reload() {
    api.get("/employees").then((r) => setEmployees(r.data));
    api.get("/departments").then((r) => setDepartments(r.data));
    api.get("/centers").then((r) => setCenters(r.data));
  }
  useEffect(reload, []);

  async function save() {
    await api.post("/employees", form);
    setShowAdd(false);
    setForm({ fullName: "", employeeNumber: "", departmentId: "", centerId: "" });
    reload();
  }

  async function submitTransfer() {
    if (!transferTarget) return;
    await api.post(`/employees/${transferTarget.id}/transfer`, transferForm);
    setTransferTarget(null);
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">الموظفين</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ موظف جديد</button>
      </div>

      <div className="card">
        <DataTable
          columns={[
            { header: "الاسم", render: (e: Employee) => e.fullName },
            { header: "الرقم الوظيفي", render: (e: Employee) => e.employeeNumber },
            { header: "المديرية", render: (e: Employee) => e.department?.name },
            { header: "المركز", render: (e: Employee) => e.center?.name },
            {
              header: "",
              render: (e: Employee) => (
                <button className="btn btn-secondary" onClick={() => setTransferTarget(e)}>نقل</button>
              ),
            },
          ]}
          rows={employees}
        />
      </div>

      {showAdd && (
        <Modal title="موظف جديد" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="الاسم الكامل" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="input" placeholder="الرقم الوظيفي" value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">اختر المديرية</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="input" value={form.centerId} onChange={(e) => setForm({ ...form, centerId: e.target.value })}>
              <option value="">اختر المركز</option>
              {centers.filter((c) => c.departmentId === form.departmentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn btn-primary w-full" onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}

      {transferTarget && (
        <Modal title={`نقل الموظف: ${transferTarget.fullName}`} onClose={() => setTransferTarget(null)}>
          <div className="space-y-3">
            <select className="input" value={transferForm.toDepartmentId} onChange={(e) => setTransferForm({ ...transferForm, toDepartmentId: e.target.value })}>
              <option value="">المديرية الجديدة</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="input" value={transferForm.toCenterId} onChange={(e) => setTransferForm({ ...transferForm, toCenterId: e.target.value })}>
              <option value="">المركز الجديد</option>
              {centers.filter((c) => c.departmentId === transferForm.toDepartmentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="سبب النقل" value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} />
            <button className="btn btn-primary w-full" onClick={submitTransfer}>تأكيد النقل</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
