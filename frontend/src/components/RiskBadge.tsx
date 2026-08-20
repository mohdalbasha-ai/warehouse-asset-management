const LABELS: Record<string, string> = {
  NORMAL: "طبيعي", WARNING: "تحذير", DANGER: "خطر", SEVERE: "خطر شديد", EXPIRED: "منتهي",
};

export default function RiskBadge({ level }: { level: string }) {
  return <span className={`badge badge-${level.toLowerCase()}`}>{LABELS[level] ?? level}</span>;
}
