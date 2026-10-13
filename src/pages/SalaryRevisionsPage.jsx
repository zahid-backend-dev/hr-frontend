import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate } from "react-router-dom";
import { Plus, TrendingUp, X } from "lucide-react";
import { api } from "../api/client";
import { FieldError } from "../components/FieldError";
import { TruncateText } from "../components/TruncateText";
import { TablePagination } from "../components/TablePagination";
import { usePagination } from "../hooks/usePagination";
import { sanitizeGeneralText } from "../utils/formValidation";

const emptyForm = {
  employeeUserId: "",
  changeType: "salary_increase",
  increment: "",
  newDesignation: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
  note: "",
};

function changeTypeLabel(type) {
  switch (String(type || "")) {
    case "salary_increase":
      return "Salary increase";
    case "promotion":
      return "Promotion";
    case "both":
      return "Promotion + salary";
    case "adjustment":
      return "Salary adjustment";
    default:
      return type || "—";
  }
}

function moneyText(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SalaryRevisionsPage({ app }) {
  const {
    canManagePayroll,
    canViewSalarySection,
    employees,
    authHeaders,
    showMessage,
    fetchAll,
    mySalaryRevisions,
  } = app;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isAdminView = Boolean(canManagePayroll);

  const employeeOptions = useMemo(
    () => (employees || []).filter((emp) => emp.role !== "admin"),
    [employees]
  );

  const filteredRows = useMemo(() => {
    const source = isAdminView ? rows : rows.length ? rows : mySalaryRevisions || [];
    if (!isAdminView || !filterEmployeeId) return source;
    return source.filter((row) => String(row.employeeUserId) === String(filterEmployeeId));
  }, [rows, mySalaryRevisions, filterEmployeeId, isAdminView]);

  const pagination = usePagination(filteredRows, 10);

  async function loadRevisions() {
    setLoading(true);
    try {
      const { data } = await api.get("/salary-revisions", { headers: authHeaders });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      showMessage?.(err.response?.data?.message || "Could not load salary revisions", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canViewSalarySection) return;
    if (isAdminView) {
      loadRevisions();
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/salary-revisions/me", { headers: authHeaders });
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setRows(Array.isArray(mySalaryRevisions) ? mySalaryRevisions : []);
          showMessage?.(err.response?.data?.message || "Could not load your salary revisions", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminView, canViewSalarySection, authHeaders]);

  if (!canViewSalarySection) return <Navigate to="/dashboard" replace />;

  const selectedEmployee = employeeOptions.find((emp) => String(emp.id) === String(form.employeeUserId));
  const affectsSalary = form.changeType === "salary_increase" || form.changeType === "both" || form.changeType === "adjustment";
  const affectsDesignation = form.changeType === "promotion" || form.changeType === "both";
  const currentSalary = Number(selectedEmployee?.monthlySalary);
  const incrementValue = Number(form.increment);
  const calculatedSalary =
    affectsSalary && Number.isFinite(currentSalary) && Number.isFinite(incrementValue)
      ? Math.round((currentSalary + incrementValue) * 100) / 100
      : null;

  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(errors).length) {
      setErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  function openModal() {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setErrors({});
  }

  function validate() {
    const next = {};
    if (!form.employeeUserId) next.employeeUserId = "Select an employee";
    if (!form.changeType) next.changeType = "Select a change type";
    if (!form.effectiveDate) next.effectiveDate = "Effective date is required";
    if (affectsSalary) {
      const increment = Number(form.increment);
      if (!Number.isFinite(increment)) next.increment = "Enter a valid increment amount";
      else if (form.changeType === "adjustment" && increment === 0) next.increment = "Increment cannot be zero";
      else if (form.changeType !== "adjustment" && increment <= 0) next.increment = "Increment must be greater than zero";
      else if (!Number.isFinite(currentSalary) || currentSalary <= 0) {
        next.employeeUserId = "Selected employee has no current salary";
      } else if (currentSalary + increment <= 0) {
        next.increment = "Resulting salary must be greater than zero";
      }
    }
    if (affectsDesignation && !String(form.newDesignation || "").trim()) {
      next.newDesignation = "Enter the new designation";
    }
    return next;
  }

  async function submitRevision(e) {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      showMessage?.("Please fix the highlighted errors", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post(
        "/salary-revisions",
        {
          employeeUserId: Number(form.employeeUserId),
          changeType: form.changeType,
          increment: affectsSalary ? Number(form.increment) : undefined,
          newDesignation: affectsDesignation ? form.newDesignation.trim() : undefined,
          effectiveDate: form.effectiveDate,
          note: form.note?.trim() || "",
        },
        { headers: authHeaders }
      );
      showMessage?.("Salary revision saved and current profile updated", "success");
      setModalOpen(false);
      setForm(emptyForm);
      await loadRevisions();
      fetchAll?.({ silent: true });
    } catch (err) {
      showMessage?.(err.response?.data?.message || "Could not save salary revision", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel glass">
      <div
        className="page-head"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{isAdminView ? "Salary & promotions" : "My promotions"}</h3>
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
            {isAdminView
              ? "Record salary increases and promotions. Current employee salary and designation update immediately, and a full history is kept."
              : "Your salary increases and promotions. Updates also appear as a notification at the top of the app."}
          </p>
        </div>
        {isAdminView && (
          <button type="button" className="table-action-btn approve" onClick={openModal}>
            <Plus size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Add revision
          </button>
        )}
      </div>

      {isAdminView && (
        <div className="field" style={{ maxWidth: 320, marginTop: 14 }}>
          <label>Filter by employee</label>
          <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)}>
            <option value="">All employees</option>
            {employeeOptions.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} ({emp.employeeId})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Effective</th>
              {isAdminView && <th>Employee</th>}
              <th>Type</th>
              <th>Salary</th>
              <th>Designation</th>
              {isAdminView && <th>Recorded by</th>}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdminView ? 7 : 5}>Loading…</td>
              </tr>
            ) : pagination.pageItems.length === 0 ? (
              <tr>
                <td colSpan={isAdminView ? 7 : 5}>
                  {isAdminView ? "No salary revisions yet." : "No salary increases or promotions recorded for you yet."}
                </td>
              </tr>
            ) : (
              pagination.pageItems.map((row) => (
                <tr key={row.id}>
                  <td className="cell-nowrap">{row.effectiveDate || "—"}</td>
                  {isAdminView && (
                    <td>
                      <TruncateText value={`${row.fullName || "—"} (${row.employeeId || "—"})`} max={28} />
                    </td>
                  )}
                  <td className="cell-nowrap">{changeTypeLabel(row.changeType)}</td>
                  <td className="cell-nowrap">
                    {moneyText(row.previousSalary)} → <strong>{moneyText(row.newSalary)}</strong>
                  </td>
                  <td>
                    <TruncateText
                      value={
                        row.previousDesignation || row.newDesignation
                          ? `${row.previousDesignation || "—"} → ${row.newDesignation || "—"}`
                          : "—"
                      }
                      max={32}
                      empty="—"
                    />
                  </td>
                  {isAdminView && (
                    <td>
                      <TruncateText value={row.createdByName} max={18} empty="—" />
                    </td>
                  )}
                  <td className="cell-nowrap">
                    <button type="button" className="table-action-btn" onClick={() => setDetailRow(row)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination {...pagination} />

      {detailRow &&
        createPortal(
          <div className="modal-overlay" onClick={() => setDetailRow(null)} role="dialog" aria-modal="true">
            <div className="modal-card leave-admin-modal" onClick={(e) => e.stopPropagation()}>
              <header className="leave-admin-modal__header">
                <div>
                  <h4>
                    <TrendingUp size={16} style={{ marginRight: 8, verticalAlign: "-2px" }} />
                    Revision details
                  </h4>
                  <p>{changeTypeLabel(detailRow.changeType)} · effective {detailRow.effectiveDate || "—"}</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setDetailRow(null)} aria-label="Close">
                  <X size={16} />
                </button>
              </header>
              <div className="leave-admin-modal__form salary-revision-detail">
                {isAdminView && (
                  <div className="salary-revision-detail__row">
                    <span>Employee</span>
                    <strong>
                      {detailRow.fullName || "—"}
                      {detailRow.employeeId ? ` (${detailRow.employeeId})` : ""}
                    </strong>
                  </div>
                )}
                <div className="salary-revision-detail__row">
                  <span>Type</span>
                  <strong>{changeTypeLabel(detailRow.changeType)}</strong>
                </div>
                <div className="salary-revision-detail__row">
                  <span>Effective date</span>
                  <strong>{detailRow.effectiveDate || "—"}</strong>
                </div>
                <div className="salary-revision-detail__row">
                  <span>Salary</span>
                  <strong>
                    {moneyText(detailRow.previousSalary)} → {moneyText(detailRow.newSalary)}
                  </strong>
                </div>
                <div className="salary-revision-detail__row">
                  <span>Designation</span>
                  <strong>
                    {detailRow.previousDesignation || "—"} → {detailRow.newDesignation || "—"}
                  </strong>
                </div>
                {isAdminView && (
                  <div className="salary-revision-detail__row">
                    <span>Recorded by</span>
                    <strong>{detailRow.createdByName || "—"}</strong>
                  </div>
                )}
                <div className="salary-revision-detail__row">
                  <span>Recorded at</span>
                  <strong>
                    {detailRow.createdAt
                      ? new Date(detailRow.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </strong>
                </div>
                <div className="salary-revision-detail__note">
                  <span>Note</span>
                  <p>{detailRow.note?.trim() ? detailRow.note : "No note added."}</p>
                </div>
                <div className="leave-admin-modal__footer">
                  <button
                    type="button"
                    className="leave-admin-modal__btn leave-admin-modal__btn--primary"
                    onClick={() => setDetailRow(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {isAdminView &&
        modalOpen &&
        createPortal(
          <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
            <div className="modal-card leave-admin-modal" onClick={(e) => e.stopPropagation()}>
              <header className="leave-admin-modal__header">
                <div>
                  <h4>
                    <TrendingUp size={16} style={{ marginRight: 8, verticalAlign: "-2px" }} />
                    Add salary revision
                  </h4>
                  <p>Updates the employee’s current salary/designation and stores a permanent record.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close">
                  <X size={16} />
                </button>
              </header>

              <form className="leave-admin-modal__form" onSubmit={submitRevision} noValidate>
              <div className={`field ${errors.employeeUserId ? "field--invalid" : ""}`}>
                <label>Employee *</label>
                <select value={form.employeeUserId} onChange={(e) => updateForm({ employeeUserId: e.target.value })}>
                  <option value="">Select employee</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId}) — {moneyText(emp.monthlySalary)}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.employeeUserId} />
                {selectedEmployee && (
                  <p className="leave-admin-modal__duration" style={{ marginTop: 8 }}>
                    Current: <strong>{moneyText(selectedEmployee.monthlySalary)}</strong>
                    {selectedEmployee.designation ? ` · ${selectedEmployee.designation}` : ""}
                  </p>
                )}
              </div>

              <div className="leave-admin-modal__row">
                <div className={`field ${errors.changeType ? "field--invalid" : ""}`}>
                  <label>Change type *</label>
                  <select value={form.changeType} onChange={(e) => updateForm({ changeType: e.target.value })}>
                    <option value="salary_increase">Salary increase</option>
                    <option value="promotion">Promotion (designation)</option>
                    <option value="both">Promotion + salary</option>
                    <option value="adjustment">Salary adjustment</option>
                  </select>
                  <FieldError message={errors.changeType} />
                </div>
                <div className={`field ${errors.effectiveDate ? "field--invalid" : ""}`}>
                  <label>Effective date *</label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => updateForm({ effectiveDate: e.target.value })}
                  />
                  <FieldError message={errors.effectiveDate} />
                </div>
              </div>

              {affectsSalary && (
                <div className={`field ${errors.increment ? "field--invalid" : ""}`}>
                  <label>Increment amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.increment}
                    onChange={(e) => updateForm({ increment: e.target.value })}
                    placeholder="e.g. 5000"
                  />
                  <FieldError message={errors.increment} />
                  {calculatedSalary != null && (
                    <p className="leave-admin-modal__duration" style={{ marginTop: 8 }}>
                      New salary: <strong>{moneyText(currentSalary)}</strong> + {moneyText(incrementValue)} ={" "}
                      <strong>{moneyText(calculatedSalary)}</strong>
                    </p>
                  )}
                </div>
              )}

              {affectsDesignation && (
                <div className={`field ${errors.newDesignation ? "field--invalid" : ""}`}>
                  <label>New designation *</label>
                  <input
                    value={form.newDesignation}
                    maxLength={80}
                    onChange={(e) =>
                      updateForm({ newDesignation: sanitizeGeneralText(e.target.value, { maxLength: 80 }) })
                    }
                    placeholder="e.g. Senior Engineer"
                  />
                  <FieldError message={errors.newDesignation} />
                </div>
              )}

              <div className="field">
                <label>Note</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.note}
                  placeholder="Optional reason / approval reference"
                  onChange={(e) => updateForm({ note: sanitizeGeneralText(e.target.value, { maxLength: 500 }) })}
                />
              </div>

              <div className="leave-admin-modal__footer">
                <button type="button" className="leave-admin-modal__btn leave-admin-modal__btn--ghost" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="leave-admin-modal__btn leave-admin-modal__btn--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save revision"}
                </button>
              </div>
            </form>
          </div>
        </div>,
          document.body
        )}
    </section>
  );
}
