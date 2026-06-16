export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* signed-off stamp */}
      <rect x="2" y="2" width="28" height="28" rx="9" fill="var(--lime)" />
      <path d="M9 16.5l4.4 4.4L23 11.2" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
