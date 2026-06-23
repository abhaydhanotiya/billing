/** Colored pill for room / invoice / stay status. */

const STYLES: Record<string, { bg: string; fg: string; label?: string }> = {
  // Room
  VACANT: { bg: "var(--ok-soft)", fg: "var(--st-vacant)" },
  OCCUPIED: { bg: "var(--danger-soft)", fg: "var(--st-occupied)" },
  RESERVED: { bg: "var(--info-soft)", fg: "var(--st-reserved)" },
  CLEANING: { bg: "var(--warn-soft)", fg: "var(--st-cleaning)" },
  MAINTENANCE: { bg: "var(--paper-sunk)", fg: "var(--st-maintenance)" },
  // Invoice
  DRAFT: { bg: "var(--paper-sunk)", fg: "var(--muted)" },
  FINALIZED: { bg: "var(--ok-soft)", fg: "var(--ok)" },
  VOID: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  // Stay
  CHECKED_IN: { bg: "var(--ok-soft)", fg: "var(--ok)", label: "Checked in" },
  CHECKED_OUT: { bg: "var(--paper-sunk)", fg: "var(--muted)", label: "Checked out" },
  CANCELLED: { bg: "var(--danger-soft)", fg: "var(--danger)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? { bg: "var(--paper-sunk)", fg: "var(--muted)" };
  const label = s.label ?? status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className="badge" style={{ background: s.bg, color: s.fg }}>
      {label}
    </span>
  );
}
