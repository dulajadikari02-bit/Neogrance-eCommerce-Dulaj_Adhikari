export default function SectionTitle({ icon: Icon, children }) {
  return (
    <h3 className="text-[11px] font-konexy tracking-[3px] uppercase text-white flex items-center gap-2 mb-6">
      {Icon && <Icon size={15} className="text-gray-500" />} {children}
    </h3>
  );
}
