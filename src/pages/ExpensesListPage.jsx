import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, X } from "lucide-react";
import { API_BASE, api } from "../api/client";
import { TruncateText } from "../components/TruncateText";
import { TablePagination } from "../components/TablePagination";
import { RowActionsMenu, leaveActionIcons } from "../components/RowActionsMenu";
import { usePagination } from "../hooks/usePagination";
import { formatExpenseAmount } from "../utils/expenseFormat";
import { formatLeaveDay } from "../utils/leaveDateFormat";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ExpensesListPage({ app }) {
  const {
    canViewExpensesSection,
    canViewAllExpenses,
    canApproveExpenses,
    expenses,
    updateExpenseStatus,
    pendingExpensesCount,
    openFilePreview,
    showMessage,
    authHeaders,
  } = app;

  const pagination = usePagination(expenses, 10);
  const [decision, setDecision] = useState({ open: false, id: null, status: "Approved", note: "", title: "" });
  const [saving, setSaving] = useState(false);
  const [reportMonth, setReportMonth] = useState(currentMonthValue);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const approvedTotal = expenses
    .filter((item) => item.status === "Approved")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const monthExpenseCount = useMemo(
    () => expenses.filter((item) => String(item.expenseDate || "").startsWith(reportMonth)).length,
    [expenses, reportMonth]
  );

  if (!canViewExpensesSection) return <Navigate to="/dashboard" replace />;

  const colCount = (canViewAllExpenses ? 1 : 0) + 6 + (canApproveExpenses ? 1 : 0);

  function openDecision(item, status) {
    setDecision({
      open: true,
      id: item.id,
      status,
      note: "",
      title: item.title || "Expense",
    });
  }

  function closeDecision() {
    if (saving) return;
    setDecision({ open: false, id: null, status: "Approved", note: "", title: "" });
  }

  async function submitDecision() {
    if (!decision.id) return;
    const note = String(decision.note || "").trim();
    if (!note) {
      showMessage?.("Please add a note before approving or rejecting", "error");
      return;
    }
    setSaving(true);
    try {
      await updateExpenseStatus(decision.id, decision.status, note);
      setDecision({ open: false, id: null, status: "Approved", note: "", title: "" });
    } catch (_err) {
      // updateExpenseStatus already shows messages
    } finally {
      setSaving(false);
    }
  }

  async function downloadMonthlyReport() {
    if (!reportMonth) {
      showMessage?.("Select a month first", "error");
      return;
    }
    setDownloadingReport(true);
    try {
      const res = await api.get("/expenses/monthly-report", {
        headers: authHeaders,
        params: { month: reportMonth },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-report-${reportMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showMessage?.(`Downloaded expenses report for ${reportMonth}`, "success");
    } catch (err) {
      let message = "Could not download expenses report";
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed?.message) message = parsed.message;
        } catch (_e) {
          // keep default
        }
      } else if (data?.message) {
        message = data.message;
      }
      showMessage?.(message, "error");
    } finally {
      setDownloadingReport(false);
    }
  }

  return (
    <section className="panel glass">
      <div
        className="page-head"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{canViewAllExpenses ? "All Expenses" : "My Expenses"}</h3>
          {canViewAllExpenses ? (
            <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
              {pendingExpensesCount} pending
              {expenses.length > 0 ? ` · ${formatExpenseAmount(approvedTotal)} approved total` : ""}
            </p>
          ) : (
            <p style={{ margin: "6px 0 0", opacity: 0.85 }}>Track status and admin notes for your submitted expenses.</p>
          )}
        </div>
        {canViewAllExpenses && (
          <div className="expenses-report-bar">
            <label className="expenses-report-label">
              Month
              <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            </label>
            <button
              type="button"
              className="table-action-btn approve expenses-report-btn"
              onClick={downloadMonthlyReport}
              disabled={downloadingReport || !reportMonth}
            >
              <Download size={14} />
              {downloadingReport ? "Downloading…" : `Download report${monthExpenseCount ? ` (${monthExpenseCount})` : ""}`}
            </button>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className={`data-table expenses-table ${canViewAllExpenses ? "is-admin" : "is-self"}`}>
          <thead>
            <tr>
              {canViewAllExpenses && <th>Submitted by</th>}
              <th>Title</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Note</th>
              <th>Receipt</th>
              {canApproveExpenses && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={colCount}>No expenses yet.</td>
              </tr>
            ) : (
              pagination.pageItems.map((item) => {
                const receiptUrl = item.receiptPath ? `${API_BASE}${item.receiptPath}` : "";
                return (
                  <tr key={item.id}>
                    {canViewAllExpenses && (
                      <td className="cell-text">
                        <TruncateText
                          value={`${item.fullName || ""}${item.employeeId ? ` (${item.employeeId})` : ""}`}
                          max={22}
                          empty="—"
                        />
                      </td>
                    )}
                    <td className="cell-text">
                      <TruncateText value={item.title} max={28} />
                    </td>
                    <td className="cell-amount cell-nowrap">{formatExpenseAmount(item.amount)}</td>
                    <td className="cell-nowrap">{formatLeaveDay(item.expenseDate)}</td>
                    <td className="cell-status">
                      <span className={`status-badge status-${String(item.status || "pending").toLowerCase()}`}>
                        {item.status || "Pending"}
                      </span>
                    </td>
                    <td className="cell-text">
                      <TruncateText value={item.adminNote} max={24} empty="—" />
                    </td>
                    <td className="cell-doc cell-nowrap">
                      {receiptUrl ? (
                        <button
                          type="button"
                          className="linkish-btn"
                          onClick={() =>
                            openFilePreview({
                              url: receiptUrl,
                              title: item.title,
                              subtitle: canViewAllExpenses ? item.fullName : "Receipt",
                            })
                          }
                        >
                          View
                        </button>
                      ) : (
                        <span className="cell-empty">—</span>
                      )}
                    </td>
                    {canApproveExpenses && (
                      <td className="cell-actions">
                        {item.status === "Pending" ? (
                          <RowActionsMenu
                            ariaLabel={`Actions for ${item.title || "expense"}`}
                            items={[
                              {
                                key: "approve",
                                label: "Approve",
                                tone: "success",
                                icon: leaveActionIcons.approve,
                                onClick: () => openDecision(item, "Approved"),
                              },
                              {
                                key: "reject",
                                label: "Reject",
                                tone: "danger",
                                icon: leaveActionIcons.reject,
                                onClick: () => openDecision(item, "Rejected"),
                              },
                            ]}
                          />
                        ) : (
                          <span className="cell-empty">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination {...pagination} />

      {decision.open && (
        <div className="modal-overlay" onClick={closeDecision} role="dialog" aria-modal="true">
          <div className="modal-card decision-modal" onClick={(e) => e.stopPropagation()}>
            <header className="decision-modal-header">
              <div className="decision-modal-titles">
                <h4>{decision.status === "Approved" ? "Approve expense" : "Reject expense"}</h4>
                <p>
                  <TruncateText value={decision.title} max={48} /> — add a note before confirming.
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeDecision} aria-label="Close" title="Close">
                <X size={16} />
              </button>
            </header>
            <textarea
              className="note-input"
              placeholder={
                decision.status === "Approved" ? "e.g., Approved. Reimburse next payroll." : "e.g., Missing receipt details."
              }
              value={decision.note}
              maxLength={500}
              onChange={(e) => setDecision((prev) => ({ ...prev, note: e.target.value.slice(0, 500) }))}
              rows={4}
            />
            <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="table-action-btn reject" onClick={closeDecision} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className={`table-action-btn ${decision.status === "Approved" ? "approve" : "reject-strong"}`}
                onClick={submitDecision}
                disabled={saving}
              >
                {saving ? "Saving…" : decision.status === "Approved" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
