import { AlertTriangle, Download, ExternalLink, FileText, Image, ShieldCheck, Trash2, X } from "lucide-react";
import { TruncateText, truncateText } from "./TruncateText";

export function LeaveDecisionModal({ app }) {
  const { leaveDecisionModal, setLeaveDecisionModal, closeLeaveDecisionModal, submitLeaveDecisionFromModal } = app;
  if (!leaveDecisionModal.open) return null;

  return (
    <div className="modal-overlay" onClick={closeLeaveDecisionModal} role="dialog" aria-modal="true">
      <div className="modal-card decision-modal" onClick={(e) => e.stopPropagation()}>
        <header className="decision-modal-header">
          <span className={`decision-modal-icon ${leaveDecisionModal.status === "Approved" ? "is-approve" : "is-reject"}`}>
            {leaveDecisionModal.status === "Approved" ? <ShieldCheck size={20} /> : <X size={20} />}
          </span>
          <div className="decision-modal-titles">
            <h4>{leaveDecisionModal.status === "Approved" ? "Approve leave" : "Reject leave"}</h4>
            <p>
              {leaveDecisionModal.status === "Approved"
                ? "Add an optional note for the employee before approving."
                : "Let the employee know why this request is being rejected."}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={closeLeaveDecisionModal} aria-label="Close" title="Close">
            <X size={16} />
          </button>
        </header>
        <textarea
          className="note-input"
          placeholder={
            leaveDecisionModal.status === "Approved" ? "e.g., Approved. Enjoy your leave." : "e.g., Please reschedule, deadline week."
          }
          value={leaveDecisionModal.note}
          maxLength={500}
          onChange={(e) => setLeaveDecisionModal((prev) => ({ ...prev, note: e.target.value.slice(0, 500) }))}
          rows={4}
        />
        <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="table-action-btn reject" onClick={closeLeaveDecisionModal}>
            Cancel
          </button>
          <button
            type="button"
            className={`table-action-btn ${leaveDecisionModal.status === "Approved" ? "approve" : "reject-strong"}`}
            onClick={submitLeaveDecisionFromModal}
          >
            {leaveDecisionModal.status === "Approved" ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FilePreviewModal({ app }) {
  const { filePreview, closeFilePreview } = app;
  if (!filePreview.open) return null;

  const title = filePreview.title || (filePreview.type === "pdf" ? "Document" : "Image preview");

  return (
    <div className="file-preview-overlay" onClick={closeFilePreview} role="dialog" aria-modal="true">
      <div className="file-preview-card" onClick={(e) => e.stopPropagation()}>
        <header className="file-preview-header">
          <div className="file-preview-heading">
            <span className="file-preview-icon-wrap">{filePreview.type === "pdf" ? <FileText size={18} /> : <Image size={18} />}</span>
            <div className="file-preview-titles">
              <h4 title={title}>
                <TruncateText value={title} max={48} />
              </h4>
              {filePreview.subtitle && (
                <span className="file-preview-subtitle" title={filePreview.subtitle}>
                  <TruncateText value={filePreview.subtitle} max={36} />
                </span>
              )}
            </div>
          </div>
          <div className="file-preview-actions">
            <a className="file-preview-action" href={filePreview.url} target="_blank" rel="noreferrer" title="Open in new tab" aria-label="Open in new tab">
              <ExternalLink size={16} />
            </a>
            <a className="file-preview-action" href={filePreview.url} download title="Download" aria-label="Download">
              <Download size={16} />
            </a>
            <button type="button" className="file-preview-action close" onClick={closeFilePreview} title="Close" aria-label="Close preview">
              <X size={16} />
            </button>
          </div>
        </header>
        <div className={`file-preview-body ${filePreview.type === "pdf" ? "is-pdf" : "is-image"}`}>
          {filePreview.type === "pdf" ? (
            <iframe key={filePreview.url} src={filePreview.url} title={title} className="file-preview-frame" />
          ) : (
            <img src={filePreview.url} alt={title} className="file-preview-image" />
          )}
        </div>
      </div>
    </div>
  );
}

export function DeleteEmployeeModal({ app }) {
  const { deleteEmployeeModal, closeDeleteEmployeeModal, confirmDeleteEmployee, deletingEmployee } = app;
  if (!deleteEmployeeModal.open) return null;

  const displayName = deleteEmployeeModal.fullName || "this user";
  const code = deleteEmployeeModal.employeeCode;
  const shortName = truncateText(displayName, 40);

  return (
    <div className="modal-overlay" onClick={closeDeleteEmployeeModal} role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
      <div className="modal-card decision-modal" onClick={(e) => e.stopPropagation()}>
        <header className="decision-modal-header">
          <span className="decision-modal-icon is-delete">
            <AlertTriangle size={20} />
          </span>
          <div className="decision-modal-titles">
            <h4 id="delete-user-title">Delete user?</h4>
            <p>
              You are about to permanently remove <strong title={displayName}>{shortName}</strong>
              {code ? ` (${code})` : ""}. Their leaves, salary slips, and reference letters will also be deleted.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeDeleteEmployeeModal}
            disabled={deletingEmployee}
            aria-label="Close"
            title="Close"
          >
            <X size={16} />
          </button>
        </header>
        <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="table-action-btn reject" onClick={closeDeleteEmployeeModal} disabled={deletingEmployee}>
            Cancel
          </button>
          <button type="button" className="table-action-btn reject-strong" onClick={confirmDeleteEmployee} disabled={deletingEmployee}>
            <Trash2 size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {deletingEmployee ? "Deleting…" : "Delete user"}
          </button>
        </div>
      </div>
    </div>
  );
}
