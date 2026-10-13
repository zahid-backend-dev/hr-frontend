/** Letters, spaces, apostrophe, hyphen, period — no digits or symbols */
export const PERSON_NAME_REGEX = /^[a-zA-Z\s.'-]+$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;
export const MIN_PASSWORD_LENGTH = 6;

/** Max lengths for employee / user form fields */
export const FIELD_LIMITS = {
  fullName: 40,
  email: 80,
  password: 64,
  designation: 50,
  phone: 20,
  address: 200,
};

/** Strip digits and invalid characters as the user types */
export function sanitizePersonName(value, { maxLength = FIELD_LIMITS.fullName } = {}) {
  return String(value || "")
    .replace(/[^a-zA-Z\s.'-]/g, "")
    .slice(0, maxLength);
}

/** Digits, spaces, + and - only */
export function sanitizePhone(value, { maxLength = FIELD_LIMITS.phone } = {}) {
  return String(value || "")
    .replace(/[^0-9+\s-]/g, "")
    .slice(0, maxLength);
}

/** Positive decimal salary/amount — max integer digits (default 10) and up to 2 decimals */
export function sanitizeSalary(value, { maxIntegerDigits = 10, maxDecimals = 2 } = {}) {
  const cleaned = String(value || "").replace(/[^0-9.]/g, "");
  const hasDot = cleaned.includes(".");
  const parts = cleaned.split(".");
  const intPart = (parts[0] || "").slice(0, maxIntegerDigits);
  if (!hasDot) return intPart;
  const decPart = parts.slice(1).join("").slice(0, maxDecimals);
  return `${intPart}.${decPart}`;
}

/** General text: letters, numbers, spaces, basic punctuation */
export function sanitizeGeneralText(value, { maxLength } = {}) {
  const cleaned = String(value || "").replace(/[^a-zA-Z0-9\s.,'/-]/g, "");
  if (maxLength == null) return cleaned;
  return cleaned.slice(0, maxLength);
}

export function validatePersonName(value, { required = true, label = "Full Name", maxLength = FIELD_LIMITS.fullName } = {}) {
  const name = String(value || "").trim();
  if (!name) return required ? `${label} is required` : null;
  if (!PERSON_NAME_REGEX.test(name)) {
    return `${label} must not contain special characters or numbers`;
  }
  if (name.length < 2) return `${label} must be at least 2 characters`;
  if (name.length > maxLength) return `${label} cannot exceed ${maxLength} characters`;
  return null;
}

export function validateEmail(value, { required = true, maxLength = FIELD_LIMITS.email } = {}) {
  const email = String(value || "").trim();
  if (!email) return required ? "Email is required" : null;
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address";
  if (email.length > maxLength) return `Email cannot exceed ${maxLength} characters`;
  return null;
}

export function validatePassword(value, { required = false, maxLength = FIELD_LIMITS.password } = {}) {
  const pwd = String(value || "").trim();
  if (!pwd) return required ? "Password is required" : null;
  if (pwd.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (pwd.length > maxLength) return `Password cannot exceed ${maxLength} characters`;
  return null;
}

export function validatePhone(value, { required = false, maxLength = FIELD_LIMITS.phone } = {}) {
  const phone = String(value || "").trim();
  if (!phone) return required ? "Phone number is required" : null;
  if (!PHONE_REGEX.test(phone)) return "Enter a valid phone number";
  if (phone.length > maxLength) return `Phone number cannot exceed ${maxLength} characters`;
  return null;
}

export function validateRequiredText(value, label, { maxLength } = {}) {
  const text = String(value || "").trim();
  if (!text) return `${label} is required`;
  if (maxLength != null && text.length > maxLength) {
    return `${label} cannot exceed ${maxLength} characters`;
  }
  return null;
}

export function validateSalary(value, { required = false, maxIntegerDigits = 10, label = "Monthly salary" } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return required ? `${label} is required` : null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return `Enter a valid ${label.toLowerCase()}`;
  const integerDigits = String(raw).split(".")[0].replace(/\D/g, "").length;
  if (integerDigits > maxIntegerDigits) {
    return `${label} cannot exceed ${maxIntegerDigits} digits`;
  }
  return null;
}

export function validateLoginForm(form) {
  const errors = {};
  const emailError = validateEmail(form.email, { required: true });
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(form.password, { required: true });
  if (passwordError) errors.password = passwordError;
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAccountEmailForm(form, { currentEmail } = {}) {
  const errors = {};
  const email = String(form.email || "").trim();
  const emailError = validateEmail(email, { required: true });
  if (emailError) errors.email = emailError;

  const currentPassword = String(form.emailCurrentPassword || "").trim();
  if (!currentPassword) {
    errors.emailCurrentPassword = "Current password is required";
  }

  const emailChanged =
    email && String(currentEmail || "").trim().toLowerCase() !== email.toLowerCase();
  if (!emailChanged && !errors.email) {
    errors.email = "Enter a different email to update";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAccountPasswordForm(form) {
  const errors = {};
  const currentPassword = String(form.passwordCurrentPassword || "").trim();
  if (!currentPassword) {
    errors.passwordCurrentPassword = "Current password is required";
  }

  const newPassword = String(form.newPassword || "");
  const confirmPassword = String(form.confirmPassword || "");
  const passwordError = validatePassword(newPassword, { required: true });
  if (passwordError) errors.newPassword = passwordError;
  if (!errors.newPassword && newPassword !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLeaveForm(form) {
  const errors = {};
  if (!form.startDate) errors.startDate = "Start date is required";
  if (!form.endDate) errors.endDate = "End date is required";
  if (form.startDate && form.endDate) {
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      errors.endDate = "Enter valid dates";
    } else if (end < start) {
      errors.endDate = "End date cannot be before start date";
    } else if (form.isHalfDay && form.startDate !== form.endDate) {
      errors.isHalfDay = "Half-day leave must be for a single date";
    } else if (form.isHalfDay && !["first", "second"].includes(String(form.halfDaySession || ""))) {
      errors.halfDaySession = "Select first half or second half";
    }
  }
  const leaveType = String(form.leaveType || "").toLowerCase();
  if (!leaveType) errors.leaveType = "Leave type is required";

  let leaveDays = 0;
  if (form.startDate && form.endDate) {
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      leaveDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      if (form.isHalfDay && leaveDays === 1) leaveDays = 0.5;
    }
  }
  if (leaveType === "sick" && leaveDays > 2 && !form.supportingDoc) {
    errors.supportingDoc = "Doctor slip/report is required for sick leave over 2 days";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateReferenceForm(form) {
  const errors = {};
  const purpose = String(form.purpose || "").trim().toLowerCase();
  if (!purpose) errors.purpose = "Select bank account or visa";
  else if (purpose !== "bank" && purpose !== "visa") {
    errors.purpose = "Select bank account or visa";
  }

  const addressedTo = String(form.addressedTo || "").trim();
  if (!addressedTo) {
    errors.addressedTo = "To whom is required";
  } else if (addressedTo.length < 2) {
    errors.addressedTo = "Enter a valid recipient (to whom)";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePayrollSelection(form) {
  const errors = {};
  if (!form.month) errors.month = "Month is required";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateExpenseForm(form) {
  const errors = {};
  const title = String(form.title || "").trim();
  if (!title) errors.title = "Title is required";
  else if (title.length < 3) errors.title = "Title must be at least 3 characters";

  if (!form.expenseDate) errors.expenseDate = "Expense date is required";

  const amountError = validateSalary(form.amount, { required: true, label: "Amount" });
  if (amountError) errors.amount = amountError;
  return { valid: Object.keys(errors).length === 0, errors };
}
