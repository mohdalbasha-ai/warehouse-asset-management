/** يحوّل مصفوفة كائنات إلى نص CSV (مع دعم UTF-8 BOM ليعمل بشكل صحيح مع Excel والعربية) */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "\uFEFF";
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val == null ? "" : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return "\uFEFF" + lines.join("\n");
}
