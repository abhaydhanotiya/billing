/** Minimal stroke icon set (24×24, currentColor). Keeps us dependency-free. */

const paths: Record<string, string> = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  bill: "M6 2h9l5 5v15H6zM15 2v5h5M9 13h6M9 17h6M9 9h3",
  plus: "M12 5v14M5 12h14",
  bed: "M3 7v12M3 13h18v6M21 13v6M7 13V9h8a4 4 0 0 1 4 4",
  food: "M5 2v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2M7 2v20M17 2c-2 0-3 2-3 5s1 5 3 5m0-10v20",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11",
  chart: "M3 3v18h18M8 17V10M13 17V7M18 17v-4",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7.5 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 14.5H3.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 5.2 8.5a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08A1.65 1.65 0 0 0 11 1.6V1.5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.5 1.51",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  print: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  back: "M19 12H5M12 19l-7-7 7-7",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  calendar: "M3 4h18v18H3zM3 9h18M8 2v4M16 2v4",
  image: "M3 3h18v18H3zM3 16l5-5 4 4 3-3 6 6M9 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  const d = paths[name] ?? "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
    </svg>
  );
}
