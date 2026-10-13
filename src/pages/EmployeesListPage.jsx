import { useEffect, useState } from "react";
import { Eye, FileText, IdCard, Pencil, Trash2, X } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { API_BASE, api } from "../api/client";
import { TruncateText } from "../components/TruncateText";
import { TablePagination } from "../components/TablePagination";
import { usePagination } from "../hooks/usePagination";

function moneyText(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function roleLabel(role) {
  return (role || "employee").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EmployeesListPage({ app }) {
  const {
    canManageEmployees,
    employees,
    token,
    authHeaders,
    showMessage,
    startEditEmployee,
    openDeleteEmployeeModal,
    openFilePreview,
  } = app;
  const navigate = useNavigate();
  const pagination = usePagination(employees, 10);
  const [balanceByUserId, setBalanceByUserId] = useState({});
  const [detailEmp, setDetailEmp] = useState(null);

  useEffect(() => {
    if (!token || !canManageEmployees) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/leaves/balances", { headers: authHeaders });
        if (cancelled) return;
        const map = {};
        for (const row of data.rows || []) {
          map[row.employeeUserId] = row;
        }
        setBalanceByUserId(map);
      } catch (err) {
        if (!cancelled) {
          showMessage?.(err.response?.data?.message || "Could not load leave balances", "error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, canManageEmployees, authHeaders, showMessage, employees]);

  useEffect(() => {
    if (!detailEmp) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailEmp]);

  if (!canManageEmployees) return <Navigate to="/dashboard" replace />;

  const detailBalance = detailEmp ? balanceByUserId[detailEmp.id] : null;

  return (
    <section className="panel glass">
      <div className="page-head">
        <h3>Users Directory</h3>
        <p>View all users and manage profiles with quick actions.</p>
      </div>
      <div className="table-wrap">
        <table className="data-table users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Designation</th>
              <th>Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((emp) => {
              return (
                <tr key={emp.id}>
                  <td className="cell-name-full">{emp.fullName || "—"}</td>
                  <td className="cell-email cell-text">
                    <TruncateText value={emp.email} max={28} />
                  </td>
                  <td className="cell-text">{roleLabel(emp.role)}</td>
                  <td className="cell-text">
                    <TruncateText value={emp.designation} max={18} empty="-" />
                  </td>
                  <td className="cell-num">{moneyText(emp.monthlySalary)}</td>
                  <td className="cell-actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn-action view"
                        title="View details"
                        aria-label="View details"
                        onClick={() => setDetailEmp(emp)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-action edit"
                        title="Edit user"
                        aria-label="Edit user"
                        onClick={() => {
                          startEditEmployee(emp);
                          navigate("/employees/add");
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-action delete"
                        title="Delete user"
                        aria-label="Delete user"
                        onClick={() => openDeleteEmployeeModal(emp)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TablePagination {...pagination} />

      {detailEmp && (
        <div className="modal-overlay" onClick={() => setDetailEmp(null)} role="dialog" aria-modal="true">
          <div className="modal-card employee-detail-modal" onClick={(e) => e.stopPropagation()}>
            <header className="leave-admin-modal__header">
              <div>
                <h4>{detailEmp.fullName}</h4>
                <p>
                  {detailEmp.employeeId} · {roleLabel(detailEmp.role)}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setDetailEmp(null)} aria-label="Close">
                <X size={16} />
              </button>
            </header>

            <div className="employee-detail-body">
              <div className="employee-detail-grid">
                <div>
                  <span className="employee-detail-label">Email</span>
                  <strong>{detailEmp.email || "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Designation</span>
                  <strong>{detailEmp.designation || "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Phone</span>
                  <strong>{detailEmp.phone || "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Joined</span>
                  <strong>{detailEmp.joinedDate ? String(detailEmp.joinedDate).slice(0, 10) : "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Monthly salary</span>
                  <strong>{moneyText(detailEmp.monthlySalary)}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">National ID</span>
                  <strong>{detailEmp.nationalId || "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Birthdate</span>
                  <strong>{detailEmp.birthdate ? String(detailEmp.birthdate).slice(0, 10) : "—"}</strong>
                </div>
                <div className="employee-detail-span">
                  <span className="employee-detail-label">Address</span>
                  <strong>{detailEmp.address || "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Sick leave left</span>
                  <strong>{detailBalance ? detailBalance.sickLeft : "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Annual leave left</span>
                  <strong>{detailBalance ? detailBalance.casualLeft : "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Maternity leave left</span>
                  <strong>{detailBalance ? detailBalance.maternityLeft : "—"}</strong>
                </div>
                <div>
                  <span className="employee-detail-label">Paternity leave left</span>
                  <strong>{detailBalance ? detailBalance.paternityLeft : "—"}</strong>
                </div>
              </div>

              <h5 className="employee-detail-section-title">Documents</h5>
              <div className="employee-detail-docs">
                {detailEmp.idFrontPath ? (
                  <button
                    type="button"
                    className="employee-doc-btn"
                    onClick={() =>
                      openFilePreview({
                        url: `${API_BASE}${detailEmp.idFrontPath}`,
                        title: `${detailEmp.fullName} — ID Card (Front)`,
                        subtitle: detailEmp.employeeId,
                      })
                    }
                  >
                    <IdCard size={16} />
                    <span>ID front</span>
                  </button>
                ) : null}
                {detailEmp.idBackPath ? (
                  <button
                    type="button"
                    className="employee-doc-btn"
                    onClick={() =>
                      openFilePreview({
                        url: `${API_BASE}${detailEmp.idBackPath}`,
                        title: `${detailEmp.fullName} — ID Card (Back)`,
                        subtitle: detailEmp.employeeId,
                      })
                    }
                  >
                    <IdCard size={16} />
                    <span>ID back</span>
                  </button>
                ) : null}
                {detailEmp.employmentLetterPath ? (
                  <button
                    type="button"
                    className="employee-doc-btn"
                    onClick={() =>
                      openFilePreview({
                        url: `${API_BASE}${detailEmp.employmentLetterPath}`,
                        title: `${detailEmp.fullName} — Employment Letter`,
                        subtitle: detailEmp.employeeId,
                      })
                    }
                  >
                    <FileText size={16} />
                    <span>Employment letter</span>
                  </button>
                ) : null}
                {!detailEmp.idFrontPath && !detailEmp.idBackPath && !detailEmp.employmentLetterPath && (
                  <p className="employee-detail-empty">No documents uploaded.</p>
                )}
              </div>

              <div className="leave-admin-modal__footer">
                <button type="button" className="leave-admin-modal__btn leave-admin-modal__btn--ghost" onClick={() => setDetailEmp(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="leave-admin-modal__btn leave-admin-modal__btn--primary"
                  onClick={() => {
                    startEditEmployee(detailEmp);
                    setDetailEmp(null);
                    navigate("/employees/add");
                  }}
                >
                  Edit user
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
