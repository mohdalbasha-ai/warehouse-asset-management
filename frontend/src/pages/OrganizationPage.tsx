import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import DeleteReasonModal from "../components/DeleteReasonModal";
import EmptyState from "../components/EmptyState";
import AssetTag from "../components/AssetTag";
import { Plus, Pencil, Trash2, Building2, Landmark, FolderTree, Boxes } from "lucide-react";

interface Lookup { id: string; name: string; code: string; status: string; createdByUserId?: string | null; }
interface Center extends Lookup { idara?: { name: string }; department?: { name: string }; qism?: { name: string }; }

type Tab = "centers" | "idarat" | "departments" | "aqsam";

const TABS: { key: Tab; label: string; icon: any; endpoint: string; singular: string }[] = [
  { key: "centers", label: "المراكز", icon: Building2, endpoint: "/centers", singular: "المركز" },
  { key: "idarat", label: "الإدارات", icon: Landmark, endpoint: "/idarat", singular: "الإدارة" },
  { key: "departments", label: "المديريات", icon: FolderTree, endpoint: "/departments", singular: "المديرية" },
  { key: "aqsam", label: "الأقسام", icon: Boxes, endpoint: "/aqsam", singular: "القسم" },
];

export default function OrganizationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("centers");
  const [centers, setCenters] = useState<Center[]>([]);
  const [idarat, setIdarat] = useState<Lookup[]>([]);
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [aqsam, setAqsam] = useState<Lookup[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Lookup | Center | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ tab: Tab; item: Lookup } | null>(null);
  const [error, setError] = useState("");

  const [lookupForm, setLookupForm] = useState({ name: "", code: "", notes: "" });
  const [centerForm, setCenterForm] = useState({ name: "", code: "", idaraId: "", departmentId: "", qismId: "", notes: "" });

  function reloadAll() {
    api.get("/centers").then((r) => setCenters(r.data));
    api.get("/idarat").then((r) => setIdarat(r.data));
    api.get("/departments").then((r) => setDepartments(r.data));
    api.get("/aqsam").then((r) => setAqsam(r.data));
  }
  useEffect(reloadAll, []);

  const currentTab = TABS.find((t) => t.key === tab)!;
  const currentRows: (Lookup | Center)[] = tab === "centers" ? centers : tab === "idarat" ? idarat : tab === "departments" ? departments : aqsam;

  function openCreate() {
    setError("");
    setLookupForm({ name: "", code: "", notes: "" });
    setCenterForm({ name: "", code: "", idaraId: "", departmentId: "", qismId: "", notes: "" });
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(item: Lookup | Center) {
    setError("");
    setEditTarget(item);
    if (tab === "centers") {
      const c = item as any;
      setCenterForm({
        name: c.name, code: c.code,
        idaraId: c.idara?.id ?? c.idaraId ?? "", departmentId: c.department?.id ?? c.departmentId ?? "",
        qismId: c.qism?.id ?? c.qismId ?? "", notes: c.notes ?? "",
      });
    } else {
      setLookupForm({ name: item.name, code: item.code, notes: (item as any).notes ?? "" });
    }
    setShowForm(true);
  }

  async function submitForm() {
    setError("");
    try {
      if (tab === "centers") {
        if (editTarget) await api.put(`/centers/${editTarget.id}`, centerForm);
        else await api.post("/centers", centerForm);
      } else {
        if (editTarget) await api.put(`${currentTab.endpoint}/${editTarget.id}`, lookupForm);
        else await api.post(currentTab.endpoint, lookupForm);
      }
      setShowForm(false);
      reloadAll();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "حدث خطأ أثناء الحفظ");
    }
  }

  async function confirmDelete(reason: string) {
    if (!deleteTarget) return;
    const endpoint = TABS.find((t) => t.key === deleteTarget.tab)!.endpoint;
    await api.delete(`${endpoint}/${deleteTarget.item.id}`, { data: { reason } });
    setDeleteTarget(null);
    reloadAll();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900">الهيكل التنظيمي</h1>
        <p className="text-sm text-steel-500">كل مركز يتكوّن من إدارة ومديرية وقسم — يُسجَّل منشئ كل عنصر تلقائيًا ({user?.fullName})</p>
      </div>

      <div className="flex gap-1 border-b border-steel-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.key ? "border-petrol-500 text-petrol-600" : "border-transparent text-steel-500 hover:text-ink-900"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> {currentTab.singular} جديد{tab === "aqsam" ? "" : "ة"}
        </button>
      </div>

      <div className="card">
        {currentRows.length === 0 ? (
          <EmptyState icon={currentTab.icon} title={`لا توجد بيانات في ${currentTab.label}`} hint="ابدأ بإضافة عنصر جديد" />
        ) : tab === "centers" ? (
          <DataTable
            columns={[
              { header: "اسم المركز", render: (c: any) => <span className="font-medium">{c.name}</span> },
              { header: "الرمز", render: (c: any) => <AssetTag>{c.code}</AssetTag> },
              { header: "الإدارة", render: (c: any) => c.idara?.name ?? "-" },
              { header: "المديرية", render: (c: any) => c.department?.name ?? "-" },
              { header: "القسم", render: (c: any) => c.qism?.name ?? "-" },
              {
                header: "", render: (c: any) => (
                  <div className="flex gap-1 justify-end">
                    <button className="btn-ghost p-1.5 rounded-lg" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></button>
                    <button className="btn-ghost p-1.5 rounded-lg text-danger-600" onClick={() => setDeleteTarget({ tab, item: c })}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            rows={currentRows as any}
          />
        ) : (
          <DataTable
            columns={[
              { header: "الاسم", render: (i: Lookup) => <span className="font-medium">{i.name}</span> },
              { header: "الرمز", render: (i: Lookup) => <AssetTag>{i.code}</AssetTag> },
              { header: "الحالة", render: (i: Lookup) => <span className="badge badge-normal">{i.status}</span> },
              {
                header: "", render: (i: Lookup) => (
                  <div className="flex gap-1 justify-end">
                    <button className="btn-ghost p-1.5 rounded-lg" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></button>
                    <button className="btn-ghost p-1.5 rounded-lg text-danger-600" onClick={() => setDeleteTarget({ tab, item: i })}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            rows={currentRows as Lookup[]}
          />
        )}
      </div>

      {showForm && (
        <Modal title={`${editTarget ? "تعديل" : "إضافة"} ${currentTab.singular}`} onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            {error && <div className="bg-danger-50 text-danger-600 text-sm rounded-lg px-3 py-2">{error}</div>}

            {tab === "centers" ? (
              <>
                <div>
                  <label className="field-label">اسم المركز</label>
                  <input className="input" value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">رمز المركز</label>
                  <input className="input" value={centerForm.code} onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">الإدارة</label>
                  <select className="input" value={centerForm.idaraId} onChange={(e) => setCenterForm({ ...centerForm, idaraId: e.target.value })}>
                    <option value="">اختر الإدارة</option>
                    {idarat.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">المديرية</label>
                  <select className="input" value={centerForm.departmentId} onChange={(e) => setCenterForm({ ...centerForm, departmentId: e.target.value })}>
                    <option value="">اختر المديرية</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">القسم</label>
                  <select className="input" value={centerForm.qismId} onChange={(e) => setCenterForm({ ...centerForm, qismId: e.target.value })}>
                    <option value="">اختر القسم</option>
                    {aqsam.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="field-label">الاسم</label>
                  <input className="input" value={lookupForm.name} onChange={(e) => setLookupForm({ ...lookupForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">الرمز</label>
                  <input className="input" value={lookupForm.code} onChange={(e) => setLookupForm({ ...lookupForm, code: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">ملاحظات</label>
                  <textarea className="input" rows={2} value={lookupForm.notes} onChange={(e) => setLookupForm({ ...lookupForm, notes: e.target.value })} />
                </div>
              </>
            )}

            <button className="btn btn-primary w-full" onClick={submitForm}>حفظ</button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <DeleteReasonModal
          title={`حذف ${TABS.find((t) => t.key === deleteTarget.tab)!.singular}`}
          itemLabel={deleteTarget.item.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
