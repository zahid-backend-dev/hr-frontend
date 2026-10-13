import { ArrowUpRight, Calculator, FileDown } from "lucide-react";
import { Navigate, NavLink } from "react-router-dom";
import { API_BASE } from "../api/client";
import { TruncateText } from "../components/TruncateText";
import { TablePagination } from "../components/TablePagination";
import { usePagination } from "../hooks/usePagination";

export function SalarySlipsListPage({ app }) {
  const {
    canViewSalarySection,
    canManagePayroll,
    salaryCalcForm,
    setSalaryCalcForm,
    generateSalarySlip,
    slips,
    deleteSlip,
  } = app;

  const pagination = usePagination(slips, 10);

  if (!canViewSalarySection) return <Navigate to="/dashboard" replace />;

  return (
    <section className="panel glass">
      <div className="page-head" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{canManagePayroll ? "All salary slips" : "My salary slips"}</h3>
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
            {canManagePayroll ? "Download or remove generated slips." : "Generate and download your own salary slips."}
          </p>
        </div>
        {canManagePayroll && (
          <NavLink to="/salary-slips/payroll" className="quick-action" style={{ textDecoration: "none", width: "auto", padding: "10px 14px" }}>
            <Calculator size={18} />
            <span>Payroll & reports</span>
            <ArrowUpRight size={16} />
          </NavLink>
        )}
      </div>
      {!canManagePayroll && (
        <div className="grid two" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Month *</label>
            <input
              type="month"
              value={salaryCalcForm.month}
              onChange={(e) => setSalaryCalcForm({ ...salaryCalcForm, month: e.target.value })}
              required
            />
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button type="button" onClick={generateSalarySlip} disabled={!salaryCalcForm.month}>
              Generate My Slip
            </button>
          </div>
        </div>
      )}
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              {canManagePayroll && <th>User</th>}
              <th>Title</th>
              <th>Month</th>
              <th>File</th>
              {canManagePayroll && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((slip) => (
              <tr key={slip.id}>
                {canManagePayroll && (
                  <td>
                    <TruncateText value={slip.fullName} max={28} />
                  </td>
                )}
                <td>
                  <TruncateText value={slip.title} max={40} />
                </td>
                <td>{slip.month}</td>
                <td>
                  <a
                    href={`${API_BASE}${slip.filePath}?v=${encodeURIComponent(slip.uploadedAt || "")}`}
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    Download PDF
                  </a>
                </td>
                {canManagePayroll && (
                  <td>
                    <button type="button" onClick={() => deleteSlip(slip.id)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination {...pagination} />
    </section>
  );
}
