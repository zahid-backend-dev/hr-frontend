import { Navigate } from "react-router-dom";
import { FieldError } from "../components/FieldError";
import { UploadCard } from "../components/UploadCard";
import { sanitizeGeneralText, sanitizeSalary } from "../utils/formValidation";

export function ExpensesAddPage({ app }) {
  const {
    canSubmitExpenses,
    expenseForm,
    setExpenseForm,
    expenseFormErrors,
    setExpenseFormErrors,
    submitExpense,
  } = app;

  if (!canSubmitExpenses) return <Navigate to="/expenses/list" replace />;

  function updateExpense(patch) {
    setExpenseForm({ ...expenseForm, ...patch });
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(expenseFormErrors).length) {
      setExpenseFormErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  return (
    <section className="panel glass">
      <h3>Add Expense</h3>
      <p>Submit an expense for admin approval. Receipt is optional.</p>

      <form className="grid two" onSubmit={submitExpense} noValidate>
        <div className={expenseFormErrors.title ? "field--invalid" : ""}>
          <label>Title *</label>
          <input
            placeholder="e.g. Team lunch, travel, supplies"
            value={expenseForm.title}
            maxLength={120}
            onChange={(e) => updateExpense({ title: sanitizeGeneralText(e.target.value, { maxLength: 120 }) })}
          />
          <FieldError message={expenseFormErrors.title} />
        </div>
        <div className={expenseFormErrors.amount ? "field--invalid" : ""}>
          <label>Amount *</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            maxLength={13}
            value={expenseForm.amount}
            onChange={(e) => updateExpense({ amount: sanitizeSalary(e.target.value) })}
          />
          <FieldError message={expenseFormErrors.amount} />
        </div>
        <div className={expenseFormErrors.expenseDate ? "field--invalid" : ""}>
          <label>Expense date *</label>
          <input
            type="date"
            value={expenseForm.expenseDate}
            onChange={(e) => updateExpense({ expenseDate: e.target.value })}
          />
          <FieldError message={expenseFormErrors.expenseDate} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Description (optional)</label>
          <textarea
            placeholder="Notes about this expense (optional)"
            value={expenseForm.description}
            maxLength={500}
            onChange={(e) => updateExpense({ description: sanitizeGeneralText(e.target.value, { maxLength: 500 }) })}
            rows={3}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <UploadCard
            label="Receipt (optional)"
            accept="image/*,.pdf"
            fileValue={expenseForm.receipt}
            onFileChange={(file) => updateExpense({ receipt: file })}
            isImage
          />
        </div>
        <button type="submit">Submit for Approval</button>
      </form>
    </section>
  );
}
