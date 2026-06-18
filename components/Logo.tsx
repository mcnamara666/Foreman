export default function Logo({ size = 30 }: { size?: number }) {
  // Bespoke "system node" mark: a hexagonal ops node with a green
  // signal core that traces a sign-off check. Line-style, no tile.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 2.6 27 9v14L16 29.4 5 23V9z"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 16.4 14.4 20.6 22 12.2"
        stroke="var(--acc)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="1.7" fill="var(--acc)" opacity="0.85">
        <animate attributeName="opacity" values="0.85;0.3;0.85" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
