import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { FieldError } from "../components/FieldError";
import { TruncateText } from "../components/TruncateText";
import { TablePagination } from "../components/TablePagination";
import { RowActionsMenu, leaveActionIcons } from "../components/RowActionsMenu";
import { HR_MAX_APPROVAL_DAYS } from "../constants/roles";
import { API_BASE, api } from "../api/client";
import { usePagination } from "../hooks/usePagination";
import { sanitizeGeneralText } from "../utils/formValidation";
import { countLeaveDays, formatLeaveDay, halfDaySessionLabel } from "../utils/leaveDateFormat";
import { canRequestParentalLeaveType, parentalLeaveOptions } from "../utils/parentalLeave";

const emptyAdminLeaveForm = {
  employeeUserId: "",
  startDate: "",
  endDate: "",
  leaveType: "casual",
  leaveDetails: "",
  status: "Approved",
  isHalfDay: false,
  halfDaySession: "first",
};

export function LeavesPage({ app }) {
  const {
    canManageLeaves,
    canApplyLeave,
    canManageBranding,
    leaveForm,
    setLeaveForm,
    leaveFormErrors,
    setLeaveFormErrors,
    applyLeave,
    leaves,
    employees,
    user,
    token,
    authHeaders,
    openLeaveDecisionModal,
    canApproveLeaves,
    showMessage,
    fetchAll,
  } = app;

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const canAdminLeaveCrud = Boolean(canManageBranding);
  const isTeamView = location.pathname.endsWith("/all");
  const isPersonalView = !isTeamView && canApplyLeave;
  const [filterEmployeeId, setFilterEmployeeId] = useState(() => searchParams.get("employee") || "");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLeaveType, setFilterLeaveType] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => {
    if (!isTeamView || !canManageLeaves) return;
    const fromUrl = searchParams.get("employee") || "";
    setFilterEmployeeId((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [isTeamView, canManageLeaves, searchParams]);

  function onFilterEmployeeChange(value) {
    setFilterEmployeeId(value);
    if (!isTeamView || !canManageLeaves) return;
    const next = new URLSearchParams(searchParams);
    if (value) next.set("employee", value);
    else next.delete("employee");
    setSearchParams(next, { replace: true });
  }

  const employeeOptions = useMemo(
    () => (employees || []).filter((emp) => emp.role !== "admin"),
    [employees]
  );

  const selfLeaveTypeOptions = useMemo(() => parentalLeaveOptions(user || {}), [user]);

  useEffect(() => {
    if (!leaveForm.leaveType) return;
    if (canRequestParentalLeaveType(leaveForm.leaveType, user || {})) return;
    setLeaveForm((prev) => ({ ...prev, leaveType: "casual" }));
  }, [user, leaveForm.leaveType, setLeaveForm]);

  const filteredLeaves = useMemo(() => {
    return [...(leaves || [])]
      .filter((leave) => {
        if (isPersonalView && Number(leave.employeeUserId) !== Number(user?.id)) return false;
        if (filterEmployeeId && String(leave.employeeUserId) !== String(filterEmployeeId)) return false;
        if (filterStatus && String(leave.status || "") !== filterStatus) return false;
        if (filterLeaveType) {
          const type = String(leave.leaveType || "").toLowerCase();
          if (type !== filterLeaveType) return false;
        }
        if (filterMonth) {
          const start = String(leave.startDate || "").slice(0, 7);
          const end = String(leave.endDate || "").slice(0, 7);
          if (start !== filterMonth && end !== filterMonth) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aStart = String(a.startDate || "").slice(0, 10);
        const bStart = String(b.startDate || "").slice(0, 10);
        if (aStart !== bStart) return bStart.localeCompare(aStart);
        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [leaves, filterEmployeeId, filterStatus, filterLeaveType, filterMonth, isPersonalView, user?.id]);

  const pagination = usePagination(filteredLeaves, 10);
  const hasActiveFilters = Boolean(filterEmployeeId || filterStatus || filterLeaveType || filterMonth);
  const [myBalance, setMyBalance] = useState(null);
  const [adminModal, setAdminModal] = useState({ open: false, mode: "create", leaveId: null });
  const [adminForm, setAdminForm] = useState(emptyAdminLeaveForm);
  const [adminErrors, setAdminErrors] = useState({});
  const [adminSaving, setAdminSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const adminSelectedEmployee = useMemo(
    () => employeeOptions.find((emp) => String(emp.id) === String(adminForm.employeeUserId)) || null,
    [employeeOptions, adminForm.employeeUserId]
  );

  const adminLeaveTypeOptions = useMemo(
    () => parentalLeaveOptions(adminSelectedEmployee || {}),
    [adminSelectedEmployee]
  );

  useEffect(() => {
    if (!adminForm.leaveType) return;
    if (canRequestParentalLeaveType(adminForm.leaveType, adminSelectedEmployee || {})) return;
    setAdminForm((prev) => ({ ...prev, leaveType: "casual" }));
  }, [adminSelectedEmployee, adminForm.leaveType]);

  useEffect(() => {
    if (!token || !canApplyLeave || canAdminLeaveCrud) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/leaves/balances", { headers: authHeaders });
        if (cancelled) return;
        const row =
          (data.rows || []).find((r) => Number(r.employeeUserId) === Number(user?.id)) ||
          (!canManageLeaves ? data.rows?.[0] : null) ||
          null;
        setMyBalance(row);
      } catch {
        if (!cancelled) setMyBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, canApplyLeave, canAdminLeaveCrud, authHeaders, user?.id, leaves, canManageLeaves]);

  function updateLeave(patch) {
    setLeaveForm({ ...leaveForm, ...patch });
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(leaveFormErrors).length) {
      setLeaveFormErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  function updateAdminForm(patch) {
    setAdminForm((prev) => ({ ...prev, ...patch }));
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(adminErrors).length) {
      setAdminErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  function openCreateLeaveModal() {
    setAdminForm({
      ...emptyAdminLeaveForm,
      employeeUserId: filterEmployeeId ? String(filterEmployeeId) : "",
    });
    setAdminErrors({});
    setAdminModal({ open: true, mode: "create", leaveId: null });
  }

  function openEditLeaveModal(leave) {
    setAdminForm({
      employeeUserId: String(leave.employeeUserId || ""),
      startDate: String(leave.startDate || "").slice(0, 10),
      endDate: String(leave.endDate || "").slice(0, 10),
      leaveType: ["casual", "sick", "maternity", "paternity"].includes(
        String(leave.leaveType || "").toLowerCase()
      )
        ? String(leave.leaveType).toLowerCase()
        : "casual",
      leaveDetails: leave.leaveDetails || "",
      status: leave.status || "Pending",
      isHalfDay: Boolean(leave.isHalfDay),
      halfDaySession: leave.halfDaySession === "second" ? "second" : "first",
    });
    setAdminErrors({});
    setAdminModal({ open: true, mode: "edit", leaveId: leave.id });
  }

  function closeAdminModal() {
    if (adminSaving) return;
    setAdminModal({ open: false, mode: "create", leaveId: null });
    setAdminErrors({});
  }

  function validateAdminForm() {
    const errors = {};
    if (!adminForm.employeeUserId) errors.employeeUserId = "Select an employee";
    if (!adminForm.startDate) errors.startDate = "Start date is required";
    if (!adminForm.endDate) errors.endDate = "End date is required";
    if (adminForm.startDate && adminForm.endDate && adminForm.endDate < adminForm.startDate) {
      errors.endDate = "End date must be on or after start date";
    }
    if (adminForm.isHalfDay && adminForm.startDate && adminForm.endDate && adminForm.startDate !== adminForm.endDate) {
      errors.isHalfDay = "Half-day leave must be for a single date";
    }
    if (adminForm.isHalfDay && !["first", "second"].includes(String(adminForm.halfDaySession || ""))) {
      errors.halfDaySession = "Select first half or second half";
    }
    if (!adminForm.leaveType) errors.leaveType = "Leave type is required";
    else if (!canRequestParentalLeaveType(adminForm.leaveType, adminSelectedEmployee || {})) {
      errors.leaveType = "This leave type is not available for the selected employee";
    }
    if (!["Pending", "Approved", "Rejected"].includes(adminForm.status)) {
      errors.status = "Select a status";
    }
    return errors;
  }

  async function submitAdminLeave(e) {
    e.preventDefault();
    const errors = validateAdminForm();
    if (Object.keys(errors).length) {
      setAdminErrors(errors);
      showMessage?.("Please fix the highlighted errors", "error");
      return;
    }
    setAdminSaving(true);
    try {
      const payload = {
        employeeUserId: Number(adminForm.employeeUserId),
        startDate: adminForm.startDate,
        endDate: adminForm.endDate,
        leaveType: adminForm.leaveType,
        leaveDetails: adminForm.leaveDetails?.trim() || "",
        status: adminForm.status,
        isHalfDay: Boolean(adminForm.isHalfDay),
        halfDaySession: adminForm.isHalfDay ? adminForm.halfDaySession || "first" : null,
      };
      if (adminModal.mode === "edit" && adminModal.leaveId) {
        await api.put(`/leaves/${adminModal.leaveId}`, payload, { headers: authHeaders });
        showMessage?.("Leave updated", "success");
      } else {
        await api.post("/leaves", payload, { headers: authHeaders });
        showMessage?.("Leave added for employee", "success");
      }
      setAdminModal({ open: false, mode: "create", leaveId: null });
      setAdminErrors({});
      fetchAll?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || "Could not save leave", "error");
    } finally {
      setAdminSaving(false);
    }
  }

  async function deleteLeave(leave) {
    const label = leave.fullName || leave.employeeId || `#${leave.id}`;
    if (!window.confirm(`Delete leave for ${label} (${formatLeaveDay(leave.startDate)} – ${formatLeaveDay(leave.endDate)})?`)) {
      return;
    }
    setDeletingId(leave.id);
    try {
      await api.delete(`/leaves/${leave.id}`, { headers: authHeaders });
      showMessage?.("Leave deleted", "success");
      fetchAll?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || "Could not delete leave", "error");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!adminModal.open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [adminModal.open]);

  if (!canManageLeaves && !canApplyLeave) return <Navigate to="/dashboard" replace />;
  if (isTeamView && !canManageLeaves) return <Navigate to="/leaves" replace />;
  if (!isTeamView && !canApplyLeave && canManageLeaves) return <Navigate to="/leaves/all" replace />;

  const leaveDays = (() => {
    if (!leaveForm.startDate || !leaveForm.endDate) return 0;
    return countLeaveDays(leaveForm.startDate, leaveForm.endDate, leaveForm.isHalfDay);
  })();

  const adminLeaveDays = countLeaveDays(adminForm.startDate, adminForm.endDate, adminForm.isHalfDay);
  const sameDayLeave = Boolean(leaveForm.startDate && leaveForm.endDate && leaveForm.startDate === leaveForm.endDate);
  const adminSameDay = Boolean(adminForm.startDate && adminForm.endDate && adminForm.startDate === adminForm.endDate);
  const requiresDoc = leaveForm.leaveType === "sick" && leaveDays > 2;
  const isDocFile = (name = "") => /\.(pdf|png|jpe?g)$/i.test(name);

  async function uploadSupportingDocForLeave(leaveId, file) {
    if (!file) return;
    if (!isDocFile(file.name)) {
      showMessage?.("Only PDF/JPG/PNG files are allowed", "error");
      return;
    }
    try {
      const body = new FormData();
      body.append("supportingDoc", file);
      await api.patch(`/leaves/${leaveId}/supporting-doc`, body, { headers: authHeaders });
      showMessage?.("Supporting document uploaded", "success");
      fetchAll?.();
    } catch (err) {
      showMessage?.(err.response?.data?.message || "Could not upload supporting document", "error");
    }
  }

  const showSelfApplyForm = isPersonalView;
  const showRequestsTable = isTeamView || isPersonalView;
  const showUserColumn = isTeamView && canManageLeaves;

  return (
    <section className="panel glass">
      <div className="page-head" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ margin: 0 }}>
          {isTeamView ? (canAdminLeaveCrud ? "Leave Requests" : "All leave requests") : "My leaves"}
        </h3>
        {isTeamView && canAdminLeaveCrud && (
          <button type="button" className="table-action-btn approve" onClick={openCreateLeaveModal}>
            <Plus size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Add leave
          </button>
        )}
      </div>

      {isTeamView && (
      <div className="leaves-filters">
        {canManageLeaves && (
          <div className="field">
            <label>Employee</label>
            <select value={filterEmployeeId} onChange={(e) => onFilterEmployeeChange(e.target.value)}>
              <option value="">All employees</option>
              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="field">
          <label>Leave type</label>
          <select value={filterLeaveType} onChange={(e) => setFilterLeaveType(e.target.value)}>
            <option value="">All types</option>
            <option value="casual">Annual</option>
            <option value="sick">Sick</option>
            <option value="maternity">Maternity</option>
            <option value="paternity">Paternity</option>
          </select>
        </div>
        <div className="field">
          <label>Month</label>
          <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="table-action-btn leaves-filters-clear"
            onClick={() => {
              onFilterEmployeeChange("");
              setFilterStatus("");
              setFilterLeaveType("");
              setFilterMonth("");
            }}
          >
            Clear
          </button>
        )}
      </div>
      )}

      {showSelfApplyForm && (
        <div id="leaves-self-apply">
          <h4 className="leaves-apply-heading">Apply for leave</h4>
          <form className="grid two leaves-apply-form" onSubmit={applyLeave} noValidate>
            <div className={leaveFormErrors.startDate ? "field--invalid" : ""}>
              <label>Start date *</label>
              <input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => {
                  const startDate = e.target.value;
                  updateLeave({
                    startDate,
                    isHalfDay: leaveForm.endDate && startDate === leaveForm.endDate ? leaveForm.isHalfDay : false,
                  });
                }}
              />
              <FieldError message={leaveFormErrors.startDate} />
            </div>
            <div className={leaveFormErrors.endDate ? "field--invalid" : ""}>
              <label>End date *</label>
              <input
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => {
                  const endDate = e.target.value;
                  updateLeave({
                    endDate,
                    isHalfDay: leaveForm.startDate && endDate === leaveForm.startDate ? leaveForm.isHalfDay : false,
                  });
                }}
              />
              <FieldError message={leaveFormErrors.endDate} />
            </div>
            <div className={leaveFormErrors.leaveType ? "field--invalid" : ""}>
              <label>Leave type *</label>
              <select value={leaveForm.leaveType} onChange={(e) => updateLeave({ leaveType: e.target.value })}>
                {selfLeaveTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <FieldError message={leaveFormErrors.leaveType} />
            </div>
            <div className={leaveFormErrors.isHalfDay || leaveFormErrors.halfDaySession ? "field--invalid" : ""}>
              <label>Duration</label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(leaveForm.isHalfDay)}
                  disabled={!sameDayLeave}
                  onChange={(e) =>
                    updateLeave({
                      isHalfDay: e.target.checked,
                      halfDaySession: e.target.checked ? leaveForm.halfDaySession || "first" : leaveForm.halfDaySession,
                    })
                  }
                />
                <span>Half day{sameDayLeave ? "" : " (same start & end date)"}</span>
              </label>
              {leaveForm.isHalfDay && sameDayLeave && (
                <select
                  value={leaveForm.halfDaySession || "first"}
                  onChange={(e) => updateLeave({ halfDaySession: e.target.value })}
                  style={{ marginTop: 8 }}
                >
                  <option value="first">First half</option>
                  <option value="second">Second half</option>
                </select>
              )}
              <FieldError message={leaveFormErrors.isHalfDay || leaveFormErrors.halfDaySession} />
              {leaveDays > 0 && (
                <small style={{ opacity: 0.85, display: "block", marginTop: 6 }}>
                  {leaveDays === 0.5
                    ? `0.5 day (${halfDaySessionLabel(leaveForm.halfDaySession) || "first half"})`
                    : `${leaveDays} day${leaveDays === 1 ? "" : "s"}`}
                </small>
              )}
            </div>
            <div>
              <label>Details (optional)</label>
              <input
                placeholder="Details (optional)"
                value={leaveForm.leaveDetails}
                maxLength={200}
                onChange={(e) => updateLeave({ leaveDetails: sanitizeGeneralText(e.target.value, { maxLength: 200 }) })}
              />
            </div>
            {requiresDoc && (
              <div className={leaveFormErrors.supportingDoc ? "field--invalid" : ""} style={{ gridColumn: "1 / -1" }}>
                <label>Doctor slip / report *</label>
                <label className="doc-upload-control">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => updateLeave({ supportingDoc: e.target.files?.[0] || null })}
                  />
                  <span className="doc-upload-btn">Choose report/slip</span>
                  <span className="doc-upload-name">{leaveForm.supportingDoc?.name || "No file chosen"}</span>
                </label>
                <FieldError message={leaveFormErrors.supportingDoc} />
                <small style={{ opacity: 0.85, display: "block", marginTop: 6 }}>
                  Required for sick leave over 2 days.
                </small>
              </div>
            )}
            {myBalance && (
              <p className="leave-balance-hint" style={{ gridColumn: "1 / -1" }}>
                Paid leaves left: Sick {myBalance.sickLeft} · Annual {myBalance.casualLeft}
              </p>
            )}
            <button type="submit">Submit Leave</button>
          </form>
        </div>
      )}

      {showRequestsTable && (
      <div className="table-wrap" style={{ marginTop: canAdminLeaveCrud || showSelfApplyForm ? 12 : undefined }}>
        <h4 className="leaves-apply-heading" style={{ marginTop: showSelfApplyForm ? 8 : 0 }}>
          {isPersonalView ? "My leave requests" : "Team leave requests"}
        </h4>
        <table className="data-table leaves-table">
          <thead>
            <tr>
              {showUserColumn && <th>User</th>}
              <th>Dates</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Doc</th>
              <th>Note</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((leave) => {
              const normalizedType = String(leave.leaveType || "").toLowerCase();
              const isSickLeave = normalizedType === "sick" || /sick/i.test(String(leave.reason || ""));
              const needsDoc = isSickLeave && !leave.supportingDocPath;
              const isOwnLeave = Number(leave.employeeUserId) === Number(user?.id);
              const showUploadAction = needsDoc && isOwnLeave;

              const totalLeaveDays = countLeaveDays(leave.startDate, leave.endDate, leave.isHalfDay);
              const isHrUser = user?.role === "hr";
              const exceedsHrLimit = isHrUser && totalLeaveDays > HR_MAX_APPROVAL_DAYS;
              const canDecideThisLeave =
                isTeamView && canApproveLeaves && !exceedsHrLimit && !canAdminLeaveCrud && !isOwnLeave;

              return (
                <tr key={leave.id}>
                  {showUserColumn && (
                    <td className="cell-text">
                      <TruncateText value={leave.fullName} max={18} />
                    </td>
                  )}
                  <td className="cell-dates cell-nowrap">
                    {formatLeaveDay(leave.startDate)} – {formatLeaveDay(leave.endDate)}
                    {leave.isHalfDay
                      ? ` (${halfDaySessionLabel(leave.halfDaySession) || "half"})`
                      : ""}
                  </td>
                  <td className="cell-days cell-nowrap">{totalLeaveDays || "—"}</td>
                  <td className="cell-text">
                    <TruncateText
                      value={
                        leave.leaveType
                          ? `${
                              (() => {
                                const t = String(leave.leaveType).toLowerCase();
                                if (t === "casual") return "Annual";
                                if (t === "sick") return "Sick";
                                if (t === "maternity") return "Maternity";
                                if (t === "paternity") return "Paternity";
                                return String(leave.leaveType).replace(/\b\w/g, (c) => c.toUpperCase());
                              })()
                            } Leave${leave.leaveDetails ? ` - ${leave.leaveDetails}` : ""}`
                          : `${leave.reason || ""}${leave.leaveDetails ? ` - ${leave.leaveDetails}` : ""}`
                      }
                      max={36}
                      empty="-"
                    />
                  </td>
                  <td className="cell-doc cell-nowrap">
                    {leave.supportingDocPath ? (
                      <a href={`${API_BASE}${leave.supportingDocPath}`} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : showUploadAction ? (
                      <label className="table-action-btn leaves-doc-upload-btn">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            e.target.value = "";
                            uploadSupportingDocForLeave(leave.id, file);
                          }}
                        />
                        Upload
                      </label>
                    ) : (
                      <span className="cell-empty">—</span>
                    )}
                  </td>
                  <td className="cell-text">
                    <TruncateText value={leave.adminNote} max={28} empty="—" />
                  </td>
                  <td className="cell-status">
                    <span className={`status-badge status-${String(leave.status || "pending").toLowerCase()}`}>
                      {leave.status || "Pending"}
                    </span>
                  </td>
                  <td className="cell-actions">
                    {canAdminLeaveCrud ? (
                      <RowActionsMenu
                        ariaLabel={`Actions for ${leave.fullName || "leave"}`}
                        items={[
                          leave.status === "Pending" && {
                            key: "approve",
                            label: "Approve",
                            tone: "success",
                            icon: leaveActionIcons.approve,
                            onClick: () => openLeaveDecisionModal(leave.id, "Approved"),
                          },
                          leave.status === "Pending" && {
                            key: "reject",
                            label: "Reject",
                            tone: "default",
                            icon: leaveActionIcons.reject,
                            onClick: () => openLeaveDecisionModal(leave.id, "Rejected"),
                          },
                          {
                            key: "edit",
                            label: "Edit",
                            icon: leaveActionIcons.edit,
                            onClick: () => openEditLeaveModal(leave),
                          },
                          {
                            key: "delete",
                            label: deletingId === leave.id ? "Deleting…" : "Delete",
                            tone: "danger",
                            icon: leaveActionIcons.delete,
                            disabled: deletingId === leave.id,
                            onClick: () => deleteLeave(leave),
                          },
                        ]}
                      />
                    ) : canDecideThisLeave && leave.status === "Pending" ? (
                      <RowActionsMenu
                        ariaLabel="Leave decision actions"
                        items={[
                          {
                            key: "approve",
                            label: "Approve",
                            tone: "success",
                            icon: leaveActionIcons.approve,
                            onClick: () => openLeaveDecisionModal(leave.id, "Approved"),
                          },
                          {
                            key: "reject",
                            label: "Reject",
                            tone: "default",
                            icon: leaveActionIcons.reject,
                            onClick: () => openLeaveDecisionModal(leave.id, "Rejected"),
                          },
                        ]}
                      />
                    ) : exceedsHrLimit && leave.status === "Pending" ? (
                      <span className="cell-note">Needs manager / admin</span>
                    ) : (
                      <span className="cell-empty">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      {showRequestsTable && <TablePagination {...pagination} />}

      {adminModal.open && (
        <div className="modal-overlay" onClick={closeAdminModal} role="dialog" aria-modal="true">
          <div className="modal-card leave-admin-modal" onClick={(e) => e.stopPropagation()}>
            <header className="leave-admin-modal__header">
              <div>
                <h4>{adminModal.mode === "edit" ? "Edit leave" : "Add leave for employee"}</h4>
                <p>
                  {adminModal.mode === "edit"
                    ? "Update dates, type, status, or employee."
                    : "Create leave on behalf of an employee (defaults to Approved)."}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeAdminModal} aria-label="Close" title="Close">
                <X size={16} />
              </button>
            </header>

            <form className="leave-admin-modal__form" onSubmit={submitAdminLeave} noValidate>
              <div className={`field ${adminErrors.employeeUserId ? "field--invalid" : ""}`}>
                <label>Employee *</label>
                <select
                  value={adminForm.employeeUserId}
                  onChange={(e) => updateAdminForm({ employeeUserId: e.target.value })}
                >
                  <option value="">Select employee</option>
                  {(employees || []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
                <FieldError message={adminErrors.employeeUserId} />
              </div>

              <div className="leave-admin-modal__row">
                <div className={`field ${adminErrors.startDate ? "field--invalid" : ""}`}>
                  <label>Start date *</label>
                  <input
                    type="date"
                    value={adminForm.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      updateAdminForm({
                        startDate,
                        isHalfDay: adminForm.endDate && startDate === adminForm.endDate ? adminForm.isHalfDay : false,
                      });
                    }}
                  />
                  <FieldError message={adminErrors.startDate} />
                </div>
                <div className={`field ${adminErrors.endDate ? "field--invalid" : ""}`}>
                  <label>End date *</label>
                  <input
                    type="date"
                    value={adminForm.endDate}
                    onChange={(e) => {
                      const endDate = e.target.value;
                      updateAdminForm({
                        endDate,
                        isHalfDay: adminForm.startDate && endDate === adminForm.startDate ? adminForm.isHalfDay : false,
                      });
                    }}
                  />
                  <FieldError message={adminErrors.endDate} />
                </div>
              </div>

              <div className={`field ${adminErrors.isHalfDay || adminErrors.halfDaySession ? "field--invalid" : ""}`}>
                <label>Duration</label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={Boolean(adminForm.isHalfDay)}
                    disabled={!adminSameDay}
                    onChange={(e) =>
                      updateAdminForm({
                        isHalfDay: e.target.checked,
                        halfDaySession: e.target.checked ? adminForm.halfDaySession || "first" : adminForm.halfDaySession,
                      })
                    }
                  />
                  <span>Half day{adminSameDay ? "" : " (same start & end date)"}</span>
                </label>
                {adminForm.isHalfDay && adminSameDay && (
                  <select
                    value={adminForm.halfDaySession || "first"}
                    onChange={(e) => updateAdminForm({ halfDaySession: e.target.value })}
                  >
                    <option value="first">First half</option>
                    <option value="second">Second half</option>
                  </select>
                )}
                <FieldError message={adminErrors.isHalfDay || adminErrors.halfDaySession} />
              </div>

              <div className="leave-admin-modal__row">
                <div className={`field ${adminErrors.leaveType ? "field--invalid" : ""}`}>
                  <label>Leave type *</label>
                  <select value={adminForm.leaveType} onChange={(e) => updateAdminForm({ leaveType: e.target.value })}>
                    {adminLeaveTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={adminErrors.leaveType} />
                </div>
                <div className={`field ${adminErrors.status ? "field--invalid" : ""}`}>
                  <label>Status *</label>
                  <select value={adminForm.status} onChange={(e) => updateAdminForm({ status: e.target.value })}>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <FieldError message={adminErrors.status} />
                </div>
              </div>

              <div className="field">
                <label>Details</label>
                <textarea
                  placeholder="Optional note about this leave"
                  value={adminForm.leaveDetails}
                  maxLength={200}
                  rows={3}
                  onChange={(e) =>
                    updateAdminForm({ leaveDetails: sanitizeGeneralText(e.target.value, { maxLength: 200 }) })
                  }
                />
              </div>

              {adminLeaveDays > 0 && (
                <p className="leave-admin-modal__duration">
                  Duration:{" "}
                  <strong>
                    {adminLeaveDays === 0.5
                      ? `0.5 day (${halfDaySessionLabel(adminForm.halfDaySession) || "first half"})`
                      : `${adminLeaveDays} day${adminLeaveDays === 1 ? "" : "s"}`}
                  </strong>
                </p>
              )}

              <div className="leave-admin-modal__footer">
                <button type="button" className="leave-admin-modal__btn leave-admin-modal__btn--ghost" onClick={closeAdminModal} disabled={adminSaving}>
                  Cancel
                </button>
                <button type="submit" className="leave-admin-modal__btn leave-admin-modal__btn--primary" disabled={adminSaving}>
                  {adminSaving ? "Saving…" : adminModal.mode === "edit" ? "Save changes" : "Add leave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
