/** Truncate long strings for tables/modals: "Some long te…" */
export function truncateText(value, max = 40) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  const cut = Math.max(1, max - 1);
  return `${text.slice(0, cut).trimEnd()}…`;
}
