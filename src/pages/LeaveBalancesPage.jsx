import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { TablePagination } from "../components/TablePagination";
import { usePagination } from "../hooks/usePagination";

function UsedCell({ used, quota }) {
  const value = Number(used) || 0;
  const limit = Number(quota) || 0;
  const over = value > limit;
  return (
    <td className={over ? "leave-used-over" : undefined} title={over ? `Used ${value} of ${limit} allotted` : undefined}>
      {value}
    </td>
  );
}

function LeftCell({ value }) {
  const left = Number(value) || 0;
  const over = left < 0;
  return (
    <td className={over ? "leave-used-over" : undefined}>
      <strong>{left}</strong>
    </td>
  );
}

const emptyEditForm = {
  sickUsed: 0,
  sickLeft: 0,
  casualUsed: 0,
  casualLeft: 0,
};

function parseDayField(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 365) {
    return { error: `${label} must be a whole or half day from 0 to 365` };
  }
  const normalized = Math.round(n * 2) / 2;
  if (Math.abs(n - normalized) > 1e-9) {
    return { error: `${label} must be a whole or half day (e.g. 1 or 0.5)` };
  }
  return { value: normalized };
}

export function LeaveBalancesPage({ app }) {
  const { canManageLeaves, canApplyLeave, canManageBranding, token, authHeaders, showMessage, user } = app;
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState({ year: new Date().getFullYear(), rows: [] });
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const pagination = usePagination(payload.rows || [], 10);
  const canAdminEdit = Boolean(canManageBranding);

  const myBalanceRow = (payload.rows || []).find((r) => Number(r.employeeUserId) === Number(user?.id));

  async function loadBalances() {
    setLoading(true);
    try {
      const { data } = await api.get("/leaves/balances", { headers: authHeaders });
      setPayload(data);
    } catch (err) {
      showMessage?.(err.response?.data?.message || "Could not load leave balances", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || (!canManageLeaves && !canApplyLeave)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/leaves/balances", { headers: authHeaders });
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) {
          showMessage?.(err.response?.data?.message || "Could not load leave balances", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, canManageLeaves, canApplyLeave, authHeaders, showMessage]);

  useEffect(() => {
    if (!editRow) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editRow]);

  if (!canManageLeaves && !canApplyLeave) return <Navigate to="/dashboard" replace />;

  function openEdit(row) {
    setEditRow(row);
    setEditForm({
      sickUsed: row.sickUsed,
      sickLeft: row.sickLeft,
      casualUsed: row.casualUsed,
      casualLeft: row.casualLeft,
    });
  }

  function closeEdit() {
    if (saving) return;
    setEditRow(null);
  }

  function updateEditForm(patch) {
    setEditForm((prev) => ({ ...prev, ...patch }));
  }

  async function saveOverride(e) {
    e.preventDefault();
    if (!editRow) return;
    const fields = [
      parseDayField(editForm.sickUsed, "Sick used"),
      parseDayField(editForm.sickLeft, "Sick left"),
      parseDayField(editForm.casualUsed, "Annual used"),
      parseDayField(editForm.casualLeft, "Annual left"),
    ];
    const firstError = fields.find((f) => f.error);
    if (firstError) {
      showMessage?.(firstError.error, "error");
      return;
    }
    const [sickUsed, sickLeft, casualUsed, casualLeft] = fields.map((f) => f.value);
    setSaving(true);
    try {
      const { data } = await api.put(
        `/leaves/balances/${editRow.employeeUserId}`,
        { year: payload.year, sickUsed, sickLeft, casualUsed, casualLeft },
        { headers: authHeaders }
      );
      showMessage?.(data?.message || "Leave balance updated", "success");
      setEditRow(null);
      await loadBalances();
    } catch (err) {
      showMessage?.(err.response?.data?.message || "Could not update leave balance", "error");
    } finally {
      setSaving(false);
    }
  }

  // Admin: name + 4 used/left (+ actions). Self: 2 quotas + 4 used/left.
  const colSpan = canManageLeaves ? (canAdminEdit ? 6 : 5) : 6;

  return (
    <section className="panel glass">
      <div className="page-head">
        <h3>{canManageLeaves ? "Leave balances" : "My leave balance"}</h3>
        {canManageLeaves ? (
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
            Sick/annual prorated by join month. Over-quota used and negative remaining are shown in red.
            {canAdminEdit ? " Admins can change used and remaining sick/annual days per user." : ""} Maternity (
            {payload.maternityQuota ?? 30}) and paternity ({payload.paternityQuota ?? 7}) are available when
            requesting leave.
          </p>
        ) : (
          <p>
            Year {payload.year}: {payload.annualSick ?? 15} sick + {payload.annualCasual ?? 20} annual
            (prorated if mid-year join). Maternity ({payload.maternityQuota ?? 30}) and paternity (
            {payload.paternityQuota ?? 7}) paid days are available when requesting leave. Approved leaves
            already used are deducted.
          </p>
        )}
      </div>

      {canManageLeaves && canApplyLeave && myBalanceRow && (
        <div className="leave-my-balance-card" style={{ marginBottom: 14 }}>
          <h4 style={{ margin: "0 0 6px" }}>My leave balance</h4>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Sick {myBalanceRow.sickLeft} left ({myBalanceRow.sickUsed} used) · Annual {myBalanceRow.casualLeft} left (
            {myBalanceRow.casualUsed} used)
          </p>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table leave-balances-table">
          <thead>
            <tr>
              {canManageLeaves && <th>Name</th>}
              {!canManageLeaves && <th>Sick quota</th>}
              <th>Sick used</th>
              <th>Sick left</th>
              {!canManageLeaves && <th>Annual quota</th>}
              <th>Annual used</th>
              <th>Annual left</th>
              {canAdminEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan}>Loading…</td>
              </tr>
            ) : pagination.pageItems.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>No employees found.</td>
              </tr>
            ) : (
              pagination.pageItems.map((row) => (
                <tr key={row.employeeUserId}>
                  {canManageLeaves && (
                    <td className="cell-name-full">
                      <span>{row.fullName || "—"}</span>
                    </td>
                  )}
                  {!canManageLeaves && <td>{row.sickQuota}</td>}
                  <UsedCell used={row.sickUsed} quota={row.sickQuota} />
                  <LeftCell value={row.sickLeft} />
                  {!canManageLeaves && <td>{row.casualQuota}</td>}
                  <UsedCell used={row.casualUsed} quota={row.casualQuota} />
                  <LeftCell value={row.casualLeft} />
                  {canAdminEdit && (
                    <td className="cell-actions">
                      <button type="button" className="table-action-btn" onClick={() => openEdit(row)}>
                        Change
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination {...pagination} />

      {editRow && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeEdit}>
          <div className="modal-card leave-admin-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <header className="leave-admin-modal__header">
              <div>
                <h4>Change leave balance — {editRow.fullName}</h4>
                <p>Year {payload.year}. Update used and remaining sick/annual days (whole or half days, e.g. 0.5).</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeEdit} aria-label="Close" disabled={saving}>
                <X size={16} />
              </button>
            </header>
            <form className="leave-admin-modal__form" onSubmit={saveOverride}>
              <div className="leave-admin-modal__row">
                <div className="field">
                  <label>Sick used</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={editForm.sickUsed}
                    onChange={(e) => updateEditForm({ sickUsed: e.target.value === "" ? "" : Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Sick left</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={editForm.sickLeft}
                    onChange={(e) => updateEditForm({ sickLeft: e.target.value === "" ? "" : Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="leave-admin-modal__row">
                <div className="field">
                  <label>Annual used</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={editForm.casualUsed}
                    onChange={(e) => updateEditForm({ casualUsed: e.target.value === "" ? "" : Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Annual left</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={editForm.casualLeft}
                    onChange={(e) => updateEditForm({ casualLeft: e.target.value === "" ? "" : Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="leave-admin-modal__footer">
                <button type="button" className="leave-admin-modal__btn leave-admin-modal__btn--ghost" onClick={closeEdit} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="leave-admin-modal__btn leave-admin-modal__btn--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
