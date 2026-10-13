import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Cake,
  CircleUserRound,
  Clock3,
  FileDown,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { api } from "../api/client";

export function DashboardPage({ app }) {
  const {
    user,
    token,
    authHeaders,
    employees,
    leaves,
    slips,
    isManagement,
    canManageEmployees,
    canManageLeaves,
    canApplyLeave,
    isEmployee,
    canViewSalarySection,
    canManagePayroll,
    canViewExpensesSection,
    canSubmitExpenses,
    canViewAllExpenses,
    expenses,
    pendingExpensesCount,
    pendingLeavesCount,
    approvedLeavesCount,
    mySalaryRevisions,
  } = app;

  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const latestRevisions = (mySalaryRevisions || []).slice(0, 3);

  useEffect(() => {
    if (!token || !canManagePayroll) {
      setUpcomingBirthdays([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/employees/upcoming-birthdays?days=10", { headers: authHeaders });
        if (!cancelled) setUpcomingBirthdays(data.rows || []);
      } catch {
        if (!cancelled) setUpcomingBirthdays([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, canManagePayroll, authHeaders]);

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
        return type || "Update";
    }
  }

  function moneyText(value) {
    if (value == null || value === "") return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function birthdayWhen(daysUntil) {
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    return `In ${daysUntil} days`;
  }

  function birthdayDateLabel(value) {
    const raw = String(value || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  return (
    <div className="dashboard-page">
      {canManagePayroll && upcomingBirthdays.length > 0 && (
        <section className="panel glass dashboard-birthday-panel" role="status">
          <div className="dashboard-birthday-panel__head">
            <span className="dashboard-birthday-panel__icon" aria-hidden>
              <Cake size={20} />
            </span>
            <div>
              <h3>Upcoming birthdays</h3>
              <p>Employees with birthdays in the next 10 days (shown until their birthday).</p>
            </div>
          </div>
          <ul className="dashboard-birthday-list">
            {upcomingBirthdays.map((row) => (
              <li
                key={row.employeeUserId}
                className={`dashboard-birthday-item dashboard-birthday-item--${
                  row.daysUntil === 0 ? "today" : row.daysUntil === 1 ? "tomorrow" : row.daysUntil <= 3 ? "soon" : "later"
                }`}
              >
                <div className="dashboard-birthday-item__avatar" aria-hidden>
                  <Cake size={16} />
                </div>
                <div className="dashboard-birthday-item__body">
                  <strong>{row.fullName}</strong>
                  <small>
                    {row.employeeId || "—"}
                    {row.designation ? ` · ${row.designation}` : ""}
                  </small>
                </div>
                <div className="dashboard-birthday-item__meta">
                  <span className="dashboard-birthday-item__date">{birthdayDateLabel(row.nextBirthday)}</span>
                  <span className="dashboard-birthday-item__when">{birthdayWhen(row.daysUntil)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel glass dashboard-hero">
        <div>
          <p className="eyebrow">Operations Overview</p>
          <h3>Welcome back, {user.fullName}</h3>
          <p>
            {isManagement
              ? "Manage assigned operations from one place."
              : "Track your requests, documents, and work profile."}
            {isManagement && employees.length === 0 && (
              <> Add users under <strong>Employees → Add user</strong> to populate the dashboard.</>
            )}
          </p>
        </div>
        <div className="hero-chip">
          <Clock3 size={16} />
          <span>Today: {new Date().toLocaleDateString()}</span>
        </div>
      </section>

      <div className="stats">
        <article className="card metric-card">
          <div className="metric-head">
            <CircleUserRound size={18} />
            <span>{isManagement ? "People" : "Designation"}</span>
          </div>
          <strong>{isManagement ? employees.length : (user.designation || user.role).toUpperCase()}</strong>
          <small>{isManagement ? "Total users registered" : "Your current role title"}</small>
        </article>
        <article className="card metric-card">
          <div className="metric-head">
            <BriefcaseBusiness size={18} />
            <span>Leaves</span>
          </div>
          <strong>{leaves.length}</strong>
          <small>{pendingLeavesCount} pending approvals</small>
        </article>
        <article className="card metric-card">
          <div className="metric-head">
            <FileDown size={18} />
            <span>Salary Slips</span>
          </div>
          <strong>{slips.length}</strong>
          <small>Documents available</small>
        </article>
        <article className="card metric-card">
          <div className="metric-head">
            <ShieldCheck size={18} />
            <span>{isManagement ? "Access" : "Access Level"}</span>
          </div>
          <strong>{(user.designation || user.role).toUpperCase()}</strong>
          <small>{approvedLeavesCount} approved leaves</small>
        </article>
      </div>

      <section className="dashboard-grid">
        <article className="panel glass">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            {canManageEmployees && (
              <NavLink to="/employees/list" className="quick-action">
                <Users size={18} />
                <span>Manage Users</span>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
              {(canManageLeaves || canApplyLeave) && (
                <NavLink to={canManageLeaves ? "/leaves/all" : "/leaves"} className="quick-action">
                  <CalendarDays size={18} />
                  <span>{canManageLeaves ? "Review Leaves" : "Apply Leave"}</span>
                  <ArrowUpRight size={16} />
                </NavLink>
              )}
            {canViewSalarySection && (
              <NavLink to={canManagePayroll ? "/salary-slips/payroll" : "/salary-slips"} className="quick-action">
                <ReceiptText size={18} />
                <span>{canManagePayroll ? "Payroll & reports" : "Salary slips"}</span>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
            {canViewSalarySection && !canManagePayroll && (
              <NavLink to="/salary-slips/revisions" className="quick-action">
                <TrendingUp size={18} />
                <span>My promotions</span>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
            {canManagePayroll && (
              <NavLink to="/salary-slips" className="quick-action">
                <FileDown size={18} />
                <span>All slips</span>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
            {canSubmitExpenses && (
              <NavLink to="/expenses/add" className="quick-action">
                <Wallet size={18} />
                <span>Add expense</span>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
            {canViewExpensesSection && (
              <NavLink to="/expenses/list" className="quick-action">
                <Wallet size={18} />
                <span>{canViewAllExpenses ? "All expenses" : "My expenses"}</span>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
          </div>
        </article>

        <article className="panel glass">
          <h3>Activity Snapshot</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span>Pending Leaves</span>
              <strong>{pendingLeavesCount}</strong>
            </div>
            <div className="activity-item">
              <span>Approved Leaves</span>
              <strong>{approvedLeavesCount}</strong>
            </div>
            <div className="activity-item">
              <span>Uploaded Slips</span>
              <strong>{slips.length}</strong>
            </div>
            {!canManagePayroll && (
              <div className="activity-item">
                <span>Salary / promotions</span>
                <strong>{(mySalaryRevisions || []).length}</strong>
              </div>
            )}
            {canManageEmployees && (
              <div className="activity-item">
                <span>Registered Users</span>
                <strong>{employees.length}</strong>
              </div>
            )}
            {canViewExpensesSection && (
              <div className="activity-item">
                <span>{canViewAllExpenses ? "Pending Expenses" : "My Expenses"}</span>
                <strong>{canViewAllExpenses ? pendingExpensesCount : expenses.length}</strong>
              </div>
            )}
          </div>
        </article>
      </section>

      {!canManagePayroll && (
        <section className="panel glass dashboard-salary-panel">
          <div className="dashboard-salary-panel__head">
            <div>
              <h3>My salary & promotions</h3>
              <p>Recent salary increases and designation changes recorded for you.</p>
            </div>
            <NavLink to="/salary-slips/revisions" className="dashboard-salary-panel__link">
              View all
              <ArrowUpRight size={14} />
            </NavLink>
          </div>
          {latestRevisions.length === 0 ? (
            <p className="dashboard-salary-panel__empty">No salary increases or promotions yet.</p>
          ) : (
            <div className="dashboard-salary-list">
              {latestRevisions.map((row) => (
                <article key={row.id} className="dashboard-salary-item">
                  <div className="dashboard-salary-item__icon">
                    <TrendingUp size={16} />
                  </div>
                  <div className="dashboard-salary-item__body">
                    <strong>{changeTypeLabel(row.changeType)}</strong>
                    <small>
                      Effective {String(row.effectiveDate || "").slice(0, 10) || "—"}
                      {row.previousSalary != null || row.newSalary != null
                        ? ` · ${moneyText(row.previousSalary)} → ${moneyText(row.newSalary)}`
                        : ""}
                      {row.previousDesignation || row.newDesignation
                        ? ` · ${row.previousDesignation || "—"} → ${row.newDesignation || "—"}`
                        : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
