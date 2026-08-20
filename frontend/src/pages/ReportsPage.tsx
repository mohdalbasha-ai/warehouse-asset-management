const REPORTS = [
  { key: "inventory", label: "تقرير المخزون" },
  { key: "devices", label: "تقرير الأجهزة" },
  { key: "contracts", label: "تقرير العقود" },
  { key: "deliveries-delayed", label: "تقرير التوريدات المتأخرة" },
  { key: "maintenance", label: "تقرير الصيانة" },
];

export default function ReportsPage() {
  function download(key: string) {
    const token = localStorage.getItem("accessToken");
    // نستخدم fetch مباشرة لتحميل ملف CSV مع رأس التفويض
    fetch(`/api/reports/${key}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${key}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">التقارير</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div key={r.key} className="card flex flex-col justify-between">
            <div className="font-semibold mb-3">{r.label}</div>
            <button className="btn btn-primary" onClick={() => download(r.key)}>تصدير CSV</button>
          </div>
        ))}
      </div>
    </div>
  );
}
