/** ReboundAI's mark: a line that dips (the failed payment) then rebounds sharply
 * upward into an arrowhead (the recovery) - not a generic trend-up glyph, the dip is
 * the point. Pure stroke so it stays crisp at the 20px size it renders at in the nav. */
export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 14 L9 19 L20 6" />
      <path d="M13 6 H20 V13" />
    </svg>
  );
}
