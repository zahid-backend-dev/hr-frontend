import { ArrowUpRight, FileDown } from "lucide-react";
import { Navigate, NavLink } from "react-router-dom";
import { FieldError } from "../components/FieldError";
import { TruncateText } from "../components/TruncateText";
import { TablePagination } from "../components/TablePagination";
import { usePagination } from "../hooks/usePagination";

export function SalaryPayrollPage({ app }) {
  const {
    canManagePayroll,
    employees,
    salaryCalcForm,
    setSalaryCalcForm,
    payrollFormErrors,
    setPayrollFormErrors,
    generatePayrollReport,
    savePayrollExtras,
    sendPayrollSummaryEmail,
    payrollLoading,
    payrollExtrasSaving,
    payrollPreview,
    monthlyReport,
  } = app;

  const reportRows = monthlyReport?.rows || [];
  const pagination = usePagination(reportRows, 10);
  const canEditExtras = Boolean(salaryCalcForm.employeeUserId && salaryCalcForm.month);
  const previewBonus = Number(payrollPreview?.bonusAmount || 0);

  if (!canManagePayroll) return <Navigate to="/dashboard" replace />;

  return (
    <section className="panel glass">
      <div className="page-head" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Payroll & reports</h3>
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
            View monthly payroll and generate slips when ready. Optionally add a bonus for a selected user and month
            (shown on their slip only when set).
          </p>
        </div>
        <NavLink to="/salary-slips" className="quick-action" style={{ textDecoration: "none", width: "auto", padding: "10px 14px" }}>
          <FileDown size={18} />
          <span>All slips</span>
          <ArrowUpRight size={16} />
        </NavLink>
      </div>
      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="field">
          <label>User (for slip &amp; single summary)</label>
          <select value={salaryCalcForm.employeeUserId} onChange={(e) => setSalaryCalcForm({ ...salaryCalcForm, employeeUserId: e.target.value })}>
            <option value="">Optional — leave empty for company report only</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} ({emp.employeeId})
              </option>
            ))}
          </select>
        </div>
        <div className={`field ${payrollFormErrors.month ? "field--invalid" : ""}`}>
          <label>Month *</label>
          <input
            type="month"
            value={salaryCalcForm.month}
            onChange={(e) => {
              setSalaryCalcForm({ ...salaryCalcForm, month: e.target.value });
              if (payrollFormErrors.month) setPayrollFormErrors((prev) => ({ ...prev, month: undefined }));
            }}
          />
          <FieldError message={payrollFormErrors.month} />
        </div>
        <div className="field">
          <label>Monthly Salary</label>
          <input type="number" min="1" step="0.01" value={salaryCalcForm.totalSalary} readOnly />
        </div>
        {canEditExtras && (
          <div className="field" style={{ alignSelf: "end" }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(salaryCalcForm.extrasEnabled)}
                onChange={(e) =>
                  setSalaryCalcForm({
                    ...salaryCalcForm,
                    extrasEnabled: e.target.checked,
                    extrasAmount: e.target.checked ? salaryCalcForm.extrasAmount : "",
                    extrasNote: e.target.checked ? salaryCalcForm.extrasNote : "",
                  })
                }
              />
              <span>Add bonus for this month</span>
            </label>
          </div>
        )}
        {canEditExtras && salaryCalcForm.extrasEnabled && (
          <>
            <div className="field">
              <label>Bonus amount *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={salaryCalcForm.extrasAmount}
                onChange={(e) => setSalaryCalcForm({ ...salaryCalcForm, extrasAmount: e.target.value })}
                placeholder="Amount"
              />
            </div>
            <div className="field">
              <label>Note (optional)</label>
              <input
                type="text"
                maxLength={200}
                value={salaryCalcForm.extrasNote}
                onChange={(e) => setSalaryCalcForm({ ...salaryCalcForm, extrasNote: e.target.value })}
                placeholder="Reason or note"
              />
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button
                type="button"
                className="payroll-btn"
                onClick={savePayrollExtras}
                disabled={payrollExtrasSaving || payrollLoading}
              >
                {payrollExtrasSaving ? "Saving…" : "Save bonus"}
              </button>
            </div>
          </>
        )}
        {canEditExtras && !salaryCalcForm.extrasEnabled && previewBonus > 0 && (
          <div className="field" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="payroll-btn"
              onClick={savePayrollExtras}
              disabled={payrollExtrasSaving || payrollLoading}
            >
              {payrollExtrasSaving ? "Saving…" : "Remove bonus"}
            </button>
          </div>
        )}
        <div className="field payroll-actions" style={{ alignSelf: "end" }}>
          <button
            type="button"
            className="payroll-btn payroll-btn--primary"
            onClick={generatePayrollReport}
            disabled={payrollLoading || !salaryCalcForm.month}
          >
            {payrollLoading ? "Working…" : "Generate report"}
          </button>
          <button
            type="button"
            className="payroll-btn payroll-btn--email"
            onClick={sendPayrollSummaryEmail}
            disabled={payrollLoading || !salaryCalcForm.month}
          >
            Send email
          </button>
        </div>
      </div>
      {salaryCalcForm.employeeUserId && payrollPreview && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th colSpan={2}>Selected user summary ({payrollPreview.month})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Employee</td>
                <td>
                  {payrollPreview.employee.fullName} ({payrollPreview.employee.employeeId})
                </td>
              </tr>
              <tr>
                <td>As of date</td>
                <td>{payrollPreview.asOfDate}</td>
              </tr>
              <tr>
                <td>Pay from</td>
                <td>
                  {payrollPreview.dutyStart}
                  {payrollPreview.joinedDate ? ` (joined ${String(payrollPreview.joinedDate).slice(0, 10)})` : ""}
                </td>
              </tr>
              <tr>
                <td>Billable days (this month)</td>
                <td>
                  {payrollPreview.eligibleDaysInMonth} / {payrollPreview.daysInMonth}
                </td>
              </tr>
              <tr>
                <td>Contract monthly salary</td>
                <td>{(payrollPreview.fullMonthSalary ?? payrollPreview.grossSalary).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Prorated gross (this month)</td>
                <td>{payrollPreview.grossSalary.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Deduction (unpaid leave, till date)</td>
                <td>{payrollPreview.unpaidLeaveDeductionTillDate.toFixed(2)}</td>
              </tr>
              {previewBonus > 0 && (
                <tr>
                  <td>Bonus</td>
                  <td>{previewBonus.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td>Salary payable (till date)</td>
                <td>{payrollPreview.netSalaryTillDate.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Projected net (end of month)</td>
                <td>{payrollPreview.netSalary.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {monthlyReport && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month</th>
                <th>As of</th>
                <th>Salary to pay</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((row) => (
                <tr key={row.employeeUserId}>
                  <td>
                    <TruncateText value={`${row.fullName} (${row.employeeId})`} max={36} />
                  </td>
                  <td>{row.month}</td>
                  <td>{row.asOfDate}</td>
                  <td>{Number(row.netSalaryTillDate).toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total ({monthlyReport.totalEmployees} employees)</strong>
                </td>
                <td>{monthlyReport.month}</td>
                <td>{monthlyReport.asOfDate}</td>
                <td>
                  <strong>{Number(monthlyReport.totals.netSalaryToPay).toFixed(2)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          {payrollLoading && <p style={{ marginTop: 10 }}>Loading report…</p>}
        </div>
      )}
      {monthlyReport && <TablePagination {...pagination} />}
    </section>
  );
}
