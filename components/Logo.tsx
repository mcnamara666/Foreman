export default function Logo({ size = 30 }: { size?: number }) {
  // Bespoke construction mark: a foreman's hard hat with a
  // sign-off check stamped across the brim. Solid, stencil-flat.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* hard hat shell */}
      <path d="M5 21a11 11 0 0 1 22 0z" fill="var(--acc)" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
      {/* centre ridge */}
      <path d="M16 9.6v3.4M13 13c0-2 6-2 6 0" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
      {/* brim */}
      <rect x="3" y="20.8" width="26" height="3.4" rx="1.3" fill="var(--acc)" stroke="var(--ink)" strokeWidth="1.6" />
      {/* sign-off check on the brim */}
      <path d="M11 22.5l2.1 2.1L19 18.8" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
