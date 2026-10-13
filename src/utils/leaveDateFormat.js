const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parse YYYY-MM-DD (or ISO) as local calendar date. */
function parseDateOnly(value) {
  const raw = String(value || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Format as "1 aug". */
export function formatLeaveDay(value) {
  const date = parseDateOnly(value);
  if (!date) return String(value || "—");
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** Inclusive day count between start and end. Half-day only when single calendar day. */
export function countLeaveDays(startDate, endDate, isHalfDay = false) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || end < start) return 0;
  const full = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (isHalfDay) return full === 1 ? 0.5 : 0;
  return full;
}

export function halfDaySessionLabel(session) {
  const s = String(session || "").toLowerCase();
  if (s === "first") return "first half";
  if (s === "second") return "second half";
  return null;
}

/** e.g. "1 aug to 3 aug · 3 days" or "1 aug · 0.5 day (first half)" */
export function formatLeaveDateRange(startDate, endDate, isHalfDay = false, halfDaySession = null) {
  const days = countLeaveDays(startDate, endDate, isHalfDay);
  const range = `${formatLeaveDay(startDate)} to ${formatLeaveDay(endDate)}`;
  if (!days) return range;
  const session = halfDaySessionLabel(halfDaySession);
  const label =
    days === 0.5
      ? `0.5 day${session ? ` (${session})` : ""}`
      : `${days} day${days === 1 ? "" : "s"}`;
  return `${range} · ${label}`;
}
