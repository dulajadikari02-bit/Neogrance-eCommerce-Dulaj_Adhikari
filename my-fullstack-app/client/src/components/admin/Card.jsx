export default function Card({ children, className = '' }) {
  return <div className={`bg-[#0a0a0a] border border-gray-900 rounded-xl ${className}`}>{children}</div>;
}
