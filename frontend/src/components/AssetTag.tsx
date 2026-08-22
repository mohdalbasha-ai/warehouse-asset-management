/** يعرض رقم Serial/Asset/رمز على هيئة بطاقة تعريف فيزيائية (Signature element) */
export default function AssetTag({ children }: { children: React.ReactNode }) {
  return <span className="asset-tag">{children}</span>;
}
