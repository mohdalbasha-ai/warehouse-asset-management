export default function StatCard({ label, value, tone = "normal" }: { label: string; value: number | string; tone?: "normal" | "warning" | "danger" }) {
  const toneClass =
    tone === "danger" ? "text-red-600" : tone === "warning" ? "text-yellow-600" : "text-primary-700";
  return (
    <div className="card">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
