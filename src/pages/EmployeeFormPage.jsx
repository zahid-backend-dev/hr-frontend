import { Navigate } from "react-router-dom";
import { FieldError } from "../components/FieldError";
import { UploadCard } from "../components/UploadCard";
import {
  sanitizeGeneralText,
  sanitizePersonName,
  sanitizePhone,
  sanitizeSalary,
} from "../utils/formValidation";

export function EmployeeFormPage({ app }) {
  const {
    canManageEmployees,
    editingEmployeeId,
    employeeForm,
    setEmployeeForm,
    employeeFormErrors,
    setEmployeeFormErrors,
    saveEmployee,
    savingEmployee,
  } = app;

  if (!canManageEmployees) return <Navigate to="/dashboard" replace />;

  function updateForm(patch) {
    setEmployeeForm({ ...employeeForm, ...patch });
    const nextKeys = Object.keys(patch);
    if (nextKeys.length && Object.keys(employeeFormErrors).length) {
      setEmployeeFormErrors((prev) => {
        const next = { ...prev };
        nextKeys.forEach((key) => delete next[key]);
        return next;
      });
    }
  }

  return (
    <section className="panel glass">
      <div className="page-head">
        <h3>{editingEmployeeId ? "Edit User Profile" : "Create New User"}</h3>
        <p>All fields are required. Complete profile details and attach documents.</p>
      </div>

      <form className="grid" onSubmit={saveEmployee} noValidate>
        <div className="form-section">
          <h4>Personal Details</h4>
          <div className="two">
            <div className={`field ${employeeFormErrors.fullName ? "field--invalid" : ""}`}>
              <label>Full Name *</label>
              <input
                value={employeeForm.fullName}
                maxLength={40}
                onChange={(e) => updateForm({ fullName: sanitizePersonName(e.target.value, { maxLength: 40 }) })}
                autoComplete="name"
                inputMode="text"
              />
              <FieldError message={employeeFormErrors.fullName} />
            </div>
            <div className={`field ${employeeFormErrors.email ? "field--invalid" : ""}`}>
              <label>Email Address *</label>
              <input
                type="email"
                value={employeeForm.email}
                maxLength={80}
                onChange={(e) => updateForm({ email: e.target.value.trim().slice(0, 80) })}
                autoComplete="email"
              />
              <FieldError message={employeeFormErrors.email} />
            </div>
            <div className={`field ${employeeFormErrors.password ? "field--invalid" : ""}`}>
              <label>Password {editingEmployeeId ? "(optional — leave blank to keep current)" : "*"}</label>
              <input
                type="password"
                value={employeeForm.password}
                maxLength={64}
                onChange={(e) => updateForm({ password: e.target.value.slice(0, 64) })}
                autoComplete="new-password"
              />
              <FieldError message={employeeFormErrors.password} />
            </div>
            <div className={`field ${employeeFormErrors.birthdate ? "field--invalid" : ""}`}>
              <label>Birth Date *</label>
              <input type="date" value={employeeForm.birthdate} onChange={(e) => updateForm({ birthdate: e.target.value })} />
              <FieldError message={employeeFormErrors.birthdate} />
            </div>
            <div className={`field ${employeeFormErrors.designation ? "field--invalid" : ""}`}>
              <label>Designation *</label>
              <input
                value={employeeForm.designation}
                maxLength={50}
                onChange={(e) =>
                  updateForm({ designation: sanitizeGeneralText(e.target.value, { maxLength: 50 }) })
                }
              />
              <FieldError message={employeeFormErrors.designation} />
            </div>
            <div className="field">
              <label>Role *</label>
              <select value={employeeForm.role} onChange={(e) => updateForm({ role: e.target.value })}>
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="manager">Manager</option>
                <option value="general_manager">General Manager</option>
              </select>
            </div>
            <div className={`field ${employeeFormErrors.phone ? "field--invalid" : ""}`}>
              <label>Phone Number *</label>
              <input
                value={employeeForm.phone}
                maxLength={20}
                onChange={(e) => updateForm({ phone: sanitizePhone(e.target.value, { maxLength: 20 }) })}
                inputMode="tel"
              />
              <FieldError message={employeeFormErrors.phone} />
            </div>
            <div className={`field ${employeeFormErrors.joinedDate ? "field--invalid" : ""}`}>
              <label>Joined Date *</label>
              <input type="date" value={employeeForm.joinedDate} onChange={(e) => updateForm({ joinedDate: e.target.value })} />
              <FieldError message={employeeFormErrors.joinedDate} />
            </div>
            <div className={`field ${employeeFormErrors.monthlySalary ? "field--invalid" : ""}`}>
              <label>Monthly Salary *</label>
              <input
                type="text"
                inputMode="decimal"
                maxLength={13}
                value={employeeForm.monthlySalary}
                onChange={(e) => updateForm({ monthlySalary: sanitizeSalary(e.target.value, { maxIntegerDigits: 10 }) })}
              />
              <FieldError message={employeeFormErrors.monthlySalary} />
            </div>
            <div className={`field ${employeeFormErrors.nationalId ? "field--invalid" : ""}`}>
              <label>National ID *</label>
              <input
                value={employeeForm.nationalId}
                maxLength={40}
                onChange={(e) =>
                  updateForm({ nationalId: sanitizeGeneralText(e.target.value, { maxLength: 40 }) })
                }
                autoComplete="off"
              />
              <FieldError message={employeeFormErrors.nationalId} />
            </div>
            <div className={`field ${employeeFormErrors.gender ? "field--invalid" : ""}`}>
              <label>Gender *</label>
              <select value={employeeForm.gender} onChange={(e) => updateForm({ gender: e.target.value })}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <FieldError message={employeeFormErrors.gender} />
            </div>
            <div className={`field ${employeeFormErrors.maritalStatus ? "field--invalid" : ""}`}>
              <label>Marital status *</label>
              <select
                value={employeeForm.maritalStatus}
                onChange={(e) => updateForm({ maritalStatus: e.target.value })}
              >
                <option value="">Select status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
              </select>
              <FieldError message={employeeFormErrors.maritalStatus} />
            </div>
            <div className={`field address-field ${employeeFormErrors.address ? "field--invalid" : ""}`}>
              <label>Address *</label>
              <textarea
                value={employeeForm.address}
                maxLength={200}
                onChange={(e) => updateForm({ address: e.target.value.slice(0, 200) })}
                rows={3}
              />
              <FieldError message={employeeFormErrors.address} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Documents *</h4>
          <div className="three">
            <UploadCard
              label="ID Front"
              required
              accept="image/*,.pdf"
              fileValue={employeeForm.idFront}
              onFileChange={(file) => updateForm({ idFront: file })}
              isImage
              error={employeeFormErrors.idFront}
            />
            <UploadCard
              label="ID Back"
              required
              accept="image/*,.pdf"
              fileValue={employeeForm.idBack}
              onFileChange={(file) => updateForm({ idBack: file })}
              isImage
              error={employeeFormErrors.idBack}
            />
            <UploadCard
              label="Employment Letter (PDF)"
              required
              accept="application/pdf"
              fileValue={employeeForm.employmentLetter}
              onFileChange={(file) => updateForm({ employmentLetter: file })}
              error={employeeFormErrors.employmentLetter}
            />
          </div>
        </div>

        <button type="submit" disabled={savingEmployee}>
          {savingEmployee ? "Saving…" : editingEmployeeId ? "Update User" : "Create User"}
        </button>
      </form>
    </section>
  );
}
