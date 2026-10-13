import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate } from "react-router-dom";
import { Plus, RefreshCw, X } from "lucide-react";
import { FieldError } from "../components/FieldError";
import { TruncateText } from "../components/TruncateText";
import { TablePagination } from "../components/TablePagination";
import { RowActionsMenu, leaveActionIcons } from "../components/RowActionsMenu";
import { API_BASE } from "../api/client";
import { usePagination } from "../hooks/usePagination";
import { sanitizeGeneralText } from "../utils/formValidation";

const emptyAdminForm = {
  employeeUserId: "",
  purpose: "",
  details: "",
  addressedTo: "",
  status: "Approved",
  adminNote: "",
};

export function ReferenceLettersPage({ app }) {
  const {
    canViewLettersSection,
    canManageLetters,
    canApplyReferenceLetter,
    referenceForm,
    setReferenceForm,
    referenceFormErrors,
    setReferenceFormErrors,
    applyReferenceLetter,
    referenceLetters,
    employees,
    updateReferenceStatus,
    generateReferenceLetter,
    deleteReferenceLetter,
    createAdminReferenceLetter,
    showMessage,
  } = app;

  const pagination = usePagination(referenceLetters, 10);
  const [decision, setDecision] = useState({ open: false, id: null, status: "Approved", note: "", title: "" });
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminErrors, setAdminErrors] = useState({});
  const [adminSaving, setAdminSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  if (!canViewLettersSection) return <Navigate to="/dashboard" replace />;

  const employeeOptions = (employees || []).filter((emp) => emp.role !== "admin");

  function updateReference(patch) {
    setReferenceForm({ ...referenceForm, ...patch });
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(referenceFormErrors).length) {
      setReferenceFormErrors((prev) => {
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

  function openCreateModal() {
    setAdminForm(emptyAdminForm);
    setAdminErrors({});
    setAdminModal(true);
  }

  function closeAdminModal() {
    if (adminSaving) return;
    setAdminModal(false);
    setAdminErrors({});
  }

  function openDecision(item, status) {
    setDecision({
      open: true,
      id: item.id,
      status,
      note: "",
      title: item.purpose || "Reference letter",
    });
  }

  function closeDecision() {
    if (decisionSaving) return;
    setDecision({ open: false, id: null, status: "Approved", note: "", title: "" });
  }

  async function submitDecision() {
    if (!decision.id) return;
    setDecisionSaving(true);
    try {
      await updateReferenceStatus(decision.id, decision.status, decision.note);
      setDecision({ open: false, id: null, status: "Approved", note: "", title: "" });
    } catch (_err) {
      // Message shown in hook.
    } finally {
      setDecisionSaving(false);
    }
  }

  function validateAdminForm() {
    const errors = {};
    if (!adminForm.employeeUserId) errors.employeeUserId = "Select an employee";
    const purpose = String(adminForm.purpose || "").trim().toLowerCase();
    if (!purpose) errors.purpose = "Select bank account or visa";
    else if (purpose !== "bank" && purpose !== "visa") {
      errors.purpose = "Select bank account or visa";
    }
    const addressedTo = String(adminForm.addressedTo || "").trim();
    if (!addressedTo) {
      errors.addressedTo = "To whom is required";
    } else if (addressedTo.length < 2) {
      errors.addressedTo = "Enter a valid recipient (to whom)";
    }
    if (!["Pending", "Approved", "Rejected"].includes(adminForm.status)) {
      errors.status = "Select a status";
    }
    if (adminForm.status !== "Pending" && !String(adminForm.adminNote || "").trim()) {
      errors.adminNote = "Admin note is required when status is Approved or Rejected";
    }
    return errors;
  }

  async function submitAdminForm(e) {
    e.preventDefault();
    const errors = validateAdminForm();
    if (Object.keys(errors).length) {
      setAdminErrors(errors);
      showMessage?.("Please fix the highlighted errors", "error");
      return;
    }
    setAdminSaving(true);
    try {
      await createAdminReferenceLetter({
        employeeUserId: Number(adminForm.employeeUserId),
        purpose: adminForm.purpose.trim(),
        details: adminForm.details?.trim() || "",
        addressedTo: adminForm.addressedTo?.trim() || "",
        status: adminForm.status,
        adminNote: adminForm.adminNote?.trim() || "",
      });
      setAdminModal(false);
      setAdminForm(emptyAdminForm);
      setAdminErrors({});
    } catch (_err) {
      // Message shown in hook.
    } finally {
      setAdminSaving(false);
    }
  }

  async function handleGenerate(item) {
    setActionBusyId(item.id);
    try {
      await generateReferenceLetter(item.id, Boolean(item.filePath));
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDelete(item) {
    const label = item.fullName || item.employeeId || `#${item.id}`;
    if (!window.confirm(`Delete reference letter request for ${label}?`)) return;
    setActionBusyId(item.id);
    try {
      await deleteReferenceLetter(item.id);
    } finally {
      setActionBusyId(null);
    }
  }

  function buildActionItems(item) {
    if (!canManageLetters) return [];

    const busy = actionBusyId === item.id;
    const items = [];

    if (item.status === "Pending") {
      items.push(
        {
          key: "approve",
          label: "Approve",
          tone: "success",
          icon: leaveActionIcons.approve,
          disabled: busy,
          onClick: () => openDecision(item, "Approved"),
        },
        {
          key: "reject",
          label: "Reject",
          tone: "default",
          icon: leaveActionIcons.reject,
          disabled: busy,
          onClick: () => openDecision(item, "Rejected"),
        }
      );
    }

    if (item.status === "Approved") {
      items.push({
        key: item.filePath ? "regenerate" : "generate",
        label: item.filePath ? "Regenerate PDF" : "Generate PDF",
        tone: "default",
        icon: <RefreshCw size={14} />,
        disabled: busy,
        onClick: () => handleGenerate(item),
      });
    }

    items.push({
      key: "delete",
      label: "Delete",
      tone: "danger",
      icon: leaveActionIcons.delete,
      disabled: busy,
      onClick: () => handleDelete(item),
    });

    return items;
  }

  return (
    <section className="panel glass">
      <div
        className="page-head"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <h3 style={{ margin: 0 }}>{canManageLetters ? "Reference Letter Requests" : "Apply for Reference Letter"}</h3>
        {canManageLetters && (
          <button type="button" className="table-action-btn approve" onClick={openCreateModal}>
            <Plus size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Add request
          </button>
        )}
      </div>

      {canApplyReferenceLetter && !canManageLetters && (
        <form className="grid two reference-apply-form" onSubmit={applyReferenceLetter} noValidate style={{ marginTop: 12 }}>
          <div className={referenceFormErrors.purpose ? "field--invalid" : ""}>
            <label>Purpose *</label>
            <select
              value={referenceForm.purpose}
              onChange={(e) =>
                updateReference({
                  purpose: e.target.value,
                })
              }
            >
              <option value="">Select purpose</option>
              <option value="bank">Bank account</option>
              <option value="visa">Visa</option>
            </select>
            <FieldError message={referenceFormErrors.purpose} />
          </div>
          <div className={referenceFormErrors.addressedTo ? "field--invalid" : ""}>
            <label>To whom *</label>
            <input
              placeholder="e.g. UBL, UAE Embassy, To Whom It May Concern"
              value={referenceForm.addressedTo}
              maxLength={120}
              onChange={(e) => updateReference({ addressedTo: sanitizeGeneralText(e.target.value, { maxLength: 120 }) })}
            />
            <FieldError message={referenceFormErrors.addressedTo} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Details (optional)</label>
            <textarea
              placeholder="Details to mention (optional)"
              value={referenceForm.details}
              maxLength={500}
              onChange={(e) => updateReference({ details: sanitizeGeneralText(e.target.value, { maxLength: 500 }) })}
              rows={3}
            />
          </div>
          <button type="submit">Submit Request</button>
        </form>
      )}

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead>
            <tr>
              {canManageLetters && <th>User</th>}
              <th>Purpose</th>
              <th>To whom</th>
              <th>Status</th>
              <th>Admin Note</th>
              <th>Letter</th>
              {canManageLetters && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((item) => (
              <tr key={item.id}>
                {canManageLetters && (
                  <td>
                    <TruncateText value={item.fullName} max={24} />
                  </td>
                )}
                <td>
                  <TruncateText
                    value={
                      String(item.purpose || "").toLowerCase() === "bank"
                        ? "Bank account"
                        : String(item.purpose || "").toLowerCase() === "visa"
                          ? "Visa"
                          : `${item.purpose || ""}${item.details ? ` - ${item.details}` : ""}`
                    }
                    max={48}
                    empty="-"
                  />
                </td>
                <td>
                  <TruncateText value={item.addressedTo} max={28} empty="-" />
                </td>
                <td>{item.status}</td>
                <td>
                  <TruncateText value={item.adminNote} max={40} empty="-" />
                </td>
                <td>
                  {item.filePath ? (
                    <a
                      href={`${API_BASE}${item.filePath}?v=${encodeURIComponent(item.generatedAt || "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                {canManageLetters && (
                  <td className="action-cell">
                    <RowActionsMenu ariaLabel="Reference letter actions" items={buildActionItems(item)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination {...pagination} />

      {decision.open && (
        <div className="modal-overlay" onClick={closeDecision} role="dialog" aria-modal="true">
          <div className="modal-card decision-modal" onClick={(e) => e.stopPropagation()}>
            <header className="decision-modal-header">
              <div className="decision-modal-titles">
                <h4>{decision.status === "Approved" ? "Approve request" : "Reject request"}</h4>
                <p>{decision.title}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeDecision} aria-label="Close" title="Close">
                <X size={16} />
              </button>
            </header>
            <div className="decision-modal-body">
              <label>Admin note *</label>
              <textarea
                placeholder="Note for the employee / record"
                value={decision.note}
                maxLength={500}
                rows={4}
                onChange={(e) => setDecision((prev) => ({ ...prev, note: e.target.value.slice(0, 500) }))}
              />
            </div>
            <footer className="decision-modal-footer">
              <button type="button" onClick={closeDecision} disabled={decisionSaving}>
                Cancel
              </button>
              <button type="button" className="table-action-btn approve" onClick={submitDecision} disabled={decisionSaving}>
                {decisionSaving ? "Saving..." : decision.status === "Approved" ? "Approve" : "Reject"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {adminModal &&
        createPortal(
          <div className="modal-overlay modal-overlay--centered" onClick={closeAdminModal} role="dialog" aria-modal="true">
            <div className="modal-card leave-admin-modal reference-admin-modal" onClick={(e) => e.stopPropagation()}>
              <header className="leave-admin-modal__header">
                <div>
                  <h4>Add reference letter request</h4>
                  <p>Create a request on behalf of an employee.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={closeAdminModal} aria-label="Close" title="Close">
                  <X size={16} />
                </button>
              </header>

              <form className="leave-admin-modal__form" onSubmit={submitAdminForm} noValidate>
                <div className={`field ${adminErrors.employeeUserId ? "field--invalid" : ""}`}>
                  <label>Employee *</label>
                  <select
                    value={adminForm.employeeUserId}
                    onChange={(e) => updateAdminForm({ employeeUserId: e.target.value })}
                  >
                    <option value="">Select employee</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                  <FieldError message={adminErrors.employeeUserId} />
                </div>

                <div className="leave-admin-modal__row">
                  <div className={`field ${adminErrors.purpose ? "field--invalid" : ""}`}>
                    <label>Purpose *</label>
                    <select
                      value={adminForm.purpose}
                      onChange={(e) => updateAdminForm({ purpose: e.target.value })}
                    >
                      <option value="">Select purpose</option>
                      <option value="bank">Bank account</option>
                      <option value="visa">Visa</option>
                    </select>
                    <FieldError message={adminErrors.purpose} />
                  </div>
                  <div className={`field ${adminErrors.addressedTo ? "field--invalid" : ""}`}>
                    <label>To whom *</label>
                    <input
                      value={adminForm.addressedTo}
                      maxLength={120}
                      placeholder="e.g. UBL, UAE Embassy, To Whom It May Concern"
                      onChange={(e) =>
                        updateAdminForm({ addressedTo: sanitizeGeneralText(e.target.value, { maxLength: 120 }) })
                      }
                    />
                    <FieldError message={adminErrors.addressedTo} />
                  </div>
                </div>

                <div className="field">
                  <label>Details (optional)</label>
                  <textarea
                    value={adminForm.details}
                    maxLength={500}
                    rows={3}
                    placeholder="Extra context for the letter (optional)"
                    onChange={(e) => updateAdminForm({ details: sanitizeGeneralText(e.target.value, { maxLength: 500 }) })}
                  />
                </div>

                <div className="leave-admin-modal__row">
                  <div className={`field ${adminErrors.status ? "field--invalid" : ""}`}>
                    <label>Status *</label>
                    <select value={adminForm.status} onChange={(e) => updateAdminForm({ status: e.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <FieldError message={adminErrors.status} />
                  </div>
                  <div className={`field ${adminErrors.adminNote ? "field--invalid" : ""}`}>
                    <label>{adminForm.status === "Pending" ? "Admin note (optional)" : "Admin note *"}</label>
                    <input
                      value={adminForm.adminNote}
                      maxLength={500}
                      onChange={(e) =>
                        updateAdminForm({ adminNote: sanitizeGeneralText(e.target.value, { maxLength: 500 }) })
                      }
                    />
                    <FieldError message={adminErrors.adminNote} />
                  </div>
                </div>

                <div className="leave-admin-modal__footer">
                  <button
                    type="button"
                    className="leave-admin-modal__btn leave-admin-modal__btn--ghost"
                    onClick={closeAdminModal}
                    disabled={adminSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="leave-admin-modal__btn leave-admin-modal__btn--primary" disabled={adminSaving}>
                    {adminSaving ? "Saving…" : "Create request"}
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
