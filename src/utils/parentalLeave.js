/** Maternity: married female. Paternity: married male. */
export function canRequestParentalLeaveType(leaveType, { gender, maritalStatus } = {}) {
  const type = String(leaveType || "").trim().toLowerCase();
  if (type !== "maternity" && type !== "paternity") return true;
  const g = String(gender || "").trim().toLowerCase();
  const m = String(maritalStatus || "").trim().toLowerCase();
  if (m !== "married") return false;
  if (type === "maternity") return g === "female";
  if (type === "paternity") return g === "male";
  return false;
}

export function parentalLeaveOptions(profile = {}) {
  const options = [
    { value: "casual", label: "Annual Leave" },
    { value: "sick", label: "Sick Leave" },
  ];
  if (canRequestParentalLeaveType("maternity", profile)) {
    options.push({ value: "maternity", label: "Maternity Leave" });
  }
  if (canRequestParentalLeaveType("paternity", profile)) {
    options.push({ value: "paternity", label: "Paternity Leave" });
  }
  return options;
}
