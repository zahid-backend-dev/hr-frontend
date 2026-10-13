import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, API_BASE } from "../api/client";
import { validateEmployeeForm } from "../utils/employeeValidation";
import {
  validateLeaveForm,
  validateLoginForm,
  validateAccountEmailForm,
  validateAccountPasswordForm,
  validatePayrollSelection,
  validateReferenceForm,
  validateExpenseForm,
} from "../utils/formValidation";
import {
  MANAGEMENT_ROLES,
  EMPLOYEE_MANAGEMENT_ROLES,
  LEAVE_MANAGEMENT_ROLES,
  LEAVE_APPROVER_ROLES,
  LEAVE_APPLICANT_ROLES,
  PAYROLL_MANAGEMENT_ROLES,
  LETTER_MANAGEMENT_ROLES,
  LETTER_APPLICANT_ROLES,
  EXPENSE_SUBMIT_ROLES,
  EXPENSE_VIEW_ROLES,
  EXPENSE_APPROVE_ROLES,
  BRANDING_MANAGEMENT_ROLES,
} from "../constants/roles";

function brandingAssetUrl(storedPath, updatedAt) {
  if (!storedPath) return null;
  const version = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : "";
  return `${API_BASE}${storedPath}${version}`;
}

export function useHrPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [branding, setBranding] = useState({ logoPath: null, faviconPath: null, updatedAt: null });
  const [brandingForm, setBrandingForm] = useState({ logo: null, favicon: null });
  const [brandingFormErrors, setBrandingFormErrors] = useState({});
  const [savingBranding, setSavingBranding] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailError, setTestEmailError] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [mailStatus, setMailStatus] = useState(null);
  const [hrEmail, setHrEmail] = useState("");
  const [hrEmailError, setHrEmailError] = useState("");
  const [adminNotificationEmail, setAdminNotificationEmail] = useState("");
  const [adminNotificationEmailError, setAdminNotificationEmailError] = useState("");
  const [savingNotificationEmails, setSavingNotificationEmails] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [slips, setSlips] = useState([]);
  const [mySalaryRevisions, setMySalaryRevisions] = useState([]);
  const [salaryRevisionBannerDismissedId, setSalaryRevisionBannerDismissedId] = useState(null);
  const [referenceLetters, setReferenceLetters] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeFormErrors, setEmployeeFormErrors] = useState({});
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  function showMessage(text, variant = "info") {
    setMessage(text);
    setMessageVariant(variant);
  }

  function salaryRevisionDismissKey(userId) {
    return `basirah:salary-revision-dismissed:${userId}`;
  }

  function formatSalaryRevisionNotice(revision) {
    if (!revision) return "";
    const type = String(revision.changeType || "");
    const effective = String(revision.effectiveDate || "").slice(0, 10);
    const money = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };
    const parts = [];
    if (type === "promotion" || type === "both") {
      parts.push(`promoted to ${revision.newDesignation || "a new role"}`);
    }
    if (type === "salary_increase" || type === "both" || type === "adjustment") {
      const prev = money(revision.previousSalary);
      const next = money(revision.newSalary);
      if (prev != null && next != null) parts.push(`salary updated from ${prev} to ${next}`);
      else parts.push("salary updated");
    }
    if (!parts.length) parts.push("a salary / promotion update");
    return `You have been ${parts.join(" and ")}${effective ? ` (effective ${effective})` : ""}.`;
  }

  const latestSalaryRevision = mySalaryRevisions[0] || null;
  const salaryRevisionNotice =
    latestSalaryRevision && Number(latestSalaryRevision.id) !== Number(salaryRevisionBannerDismissedId)
      ? {
          id: latestSalaryRevision.id,
          text: formatSalaryRevisionNotice(latestSalaryRevision),
          changeType: latestSalaryRevision.changeType,
        }
      : null;

  function dismissSalaryRevisionNotice() {
    if (!user?.id || !latestSalaryRevision?.id) return;
    const id = String(latestSalaryRevision.id);
    localStorage.setItem(salaryRevisionDismissKey(user.id), id);
    setSalaryRevisionBannerDismissedId(Number(id));
  }

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginFormErrors, setLoginFormErrors] = useState({});
  const [accountForm, setAccountForm] = useState({
    email: "",
    emailCurrentPassword: "",
    passwordCurrentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountFormErrors, setAccountFormErrors] = useState({});
  const [savingAccount, setSavingAccount] = useState(false);
  const [leaveFormErrors, setLeaveFormErrors] = useState({});
  const [referenceFormErrors, setReferenceFormErrors] = useState({});
  const [expenseFormErrors, setExpenseFormErrors] = useState({});
  const [payrollFormErrors, setPayrollFormErrors] = useState({});
  const [employeeForm, setEmployeeForm] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    password: "",
    birthdate: "",
    designation: "",
    role: "employee",
    phone: "",
    address: "",
    joinedDate: "",
    monthlySalary: "",
    nationalId: "",
    gender: "",
    maritalStatus: "",
    idFront: null,
    idBack: null,
    employmentLetter: null,
  });
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    leaveType: "casual",
    leaveDetails: "",
    supportingDoc: null,
    isHalfDay: false,
    halfDaySession: "first",
  });
  const [leaveNotes, setLeaveNotes] = useState({});
  const [leaveDocFiles, setLeaveDocFiles] = useState({});
  const [leaveDecisionModal, setLeaveDecisionModal] = useState({
    open: false,
    leaveId: null,
    status: "Approved",
    note: "",
  });
  const [filePreview, setFilePreview] = useState({
    open: false,
    url: "",
    type: "image",
    title: "",
    subtitle: "",
  });
  const [deleteEmployeeModal, setDeleteEmployeeModal] = useState({
    open: false,
    employeeId: null,
    fullName: "",
    employeeCode: "",
  });
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [referenceForm, setReferenceForm] = useState({ purpose: "", details: "", addressedTo: "" });
  const [expenseNotes, setExpenseNotes] = useState({});
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    expenseDate: "",
    description: "",
    receipt: null,
  });
  const [referenceNotes, setReferenceNotes] = useState({});
  const [salaryCalcForm, setSalaryCalcForm] = useState({
    employeeUserId: "",
    month: "",
    totalSalary: "",
    extrasEnabled: false,
    extrasAmount: "",
    extrasNote: "",
  });
  const [payrollPreview, setPayrollPreview] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollExtrasSaving, setPayrollExtrasSaving] = useState(false);

  const currentMonthValue = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const isManagement = MANAGEMENT_ROLES.includes(user?.role);
  const isEmployee = user?.role === "employee";
  const canManageEmployees = EMPLOYEE_MANAGEMENT_ROLES.includes(user?.role);
  const canManageLeaves = LEAVE_MANAGEMENT_ROLES.includes(user?.role);
  const canApproveLeaves = LEAVE_APPROVER_ROLES.includes(user?.role);
  const canManagePayroll = PAYROLL_MANAGEMENT_ROLES.includes(user?.role);
  const canManageLetters = LETTER_MANAGEMENT_ROLES.includes(user?.role);
  const canApplyReferenceLetter = LETTER_APPLICANT_ROLES.includes(user?.role);
  const canViewSalarySection = Boolean(user);
  const canViewLettersSection = canApplyReferenceLetter || canManageLetters;
  const canApplyLeave = LEAVE_APPLICANT_ROLES.includes(user?.role);
  const canSubmitExpenses = EXPENSE_SUBMIT_ROLES.includes(user?.role);
  const canViewAllExpenses = EXPENSE_VIEW_ROLES.includes(user?.role);
  const canApproveExpenses = EXPENSE_APPROVE_ROLES.includes(user?.role);
  const canViewExpensesSection = canSubmitExpenses || canViewAllExpenses;
  const canManageBranding = BRANDING_MANAGEMENT_ROLES.includes(user?.role);

  const brandLogoUrl = brandingAssetUrl(branding.logoPath, branding.updatedAt) || "/logo.png";
  const brandFaviconUrl = brandingAssetUrl(branding.faviconPath, branding.updatedAt) || "/favicon.svg";

  async function refreshBranding() {
    try {
      const { data } = await api.get("/branding");
      setBranding({
        logoPath: data?.logoPath || null,
        faviconPath: data?.faviconPath || null,
        updatedAt: data?.updatedAt || null,
      });
    } catch (_err) {
      // Keep defaults if branding endpoint is unavailable.
    }
  }

  useEffect(() => {
    refreshBranding();
  }, []);

  useEffect(() => {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = brandFaviconUrl;
    if (brandFaviconUrl.endsWith(".svg") || brandFaviconUrl.includes(".svg?")) {
      link.type = "image/svg+xml";
    } else if (brandFaviconUrl.includes(".ico")) {
      link.type = "image/x-icon";
    } else {
      link.removeAttribute("type");
    }
  }, [brandFaviconUrl]);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          setToken("");
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setEmployees([]);
          setLeaves([]);
          setSlips([]);
          setMySalaryRevisions([]);
          setSalaryRevisionBannerDismissedId(null);
          setReferenceLetters([]);
          setExpenses([]);
          showMessage("Session expired. Please login again.", "error");
          navigate("/", { replace: true });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) {
      setSalaryRevisionBannerDismissedId(null);
      return;
    }
    const raw = localStorage.getItem(salaryRevisionDismissKey(user.id));
    const id = Number(raw);
    setSalaryRevisionBannerDismissedId(Number.isFinite(id) && id > 0 ? id : null);
  }, [user?.id]);

  async function login(e) {
    e.preventDefault();
    const validation = validateLoginForm(loginForm);
    if (!validation.valid) {
      setLoginFormErrors(validation.errors);
      showMessage("Please fix the highlighted errors", "error");
      return;
    }
    setLoginFormErrors({});
    try {
      const { data } = await api.post("/auth/login", loginForm);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMessage(`Welcome ${data.user.fullName}`);
    } catch (err) {
      showMessage(err.response?.data?.message || "Login failed", "error");
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setEmployees([]);
    setLeaves([]);
    setSlips([]);
    setMySalaryRevisions([]);
    setSalaryRevisionBannerDismissedId(null);
    setReferenceLetters([]);
    setExpenses([]);
    setPayrollPreview(null);
    setMonthlyReport(null);
    setAccountForm({
      email: "",
      emailCurrentPassword: "",
      passwordCurrentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setAccountFormErrors({});
    setMessage("Logged out successfully");
    navigate("/", { replace: true });
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled || !data) return;
        setUser((prev) => {
          const next = { ...(prev || {}), ...data };
          localStorage.setItem("user", JSON.stringify(next));
          return next;
        });
      } catch {
        /* session interceptor handles 401 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!user?.email) return;
    setAccountForm((prev) => ({
      ...prev,
      email: user.email,
      emailCurrentPassword: "",
      passwordCurrentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
    setAccountFormErrors({});
  }, [user?.id, user?.email]);

  function applyAccountUserUpdate(data) {
    const nextUser = { ...user, ...data };
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
  }

  async function updateAccountEmail(e) {
    e.preventDefault();
    const validation = validateAccountEmailForm(accountForm, { currentEmail: user?.email });
    if (!validation.valid) {
      setAccountFormErrors(validation.errors);
      showMessage("Please fix the highlighted errors", "error");
      return;
    }
    setAccountFormErrors({});
    setSavingAccount(true);
    try {
      const nextEmail = String(accountForm.email || "").trim().toLowerCase();
      const { data } = await api.patch("/auth/me", {
        currentPassword: accountForm.emailCurrentPassword,
        email: nextEmail,
      });
      applyAccountUserUpdate(data);
      setAccountForm((prev) => ({
        ...prev,
        email: data.email || nextEmail,
        emailCurrentPassword: "",
      }));
      showMessage("Email updated successfully", "success");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        const mapped = { ...apiErrors };
        if (mapped.currentPassword) {
          mapped.emailCurrentPassword = mapped.currentPassword;
          delete mapped.currentPassword;
        }
        setAccountFormErrors(mapped);
      }
      showMessage(err.response?.data?.message || "Could not update email", "error");
    } finally {
      setSavingAccount(false);
    }
  }

  async function updateAccountPassword(e) {
    e.preventDefault();
    const validation = validateAccountPasswordForm(accountForm);
    if (!validation.valid) {
      setAccountFormErrors(validation.errors);
      showMessage("Please fix the highlighted errors", "error");
      return;
    }
    setAccountFormErrors({});
    setSavingAccount(true);
    try {
      const { data } = await api.patch("/auth/me", {
        currentPassword: accountForm.passwordCurrentPassword,
        newPassword: accountForm.newPassword,
      });
      applyAccountUserUpdate(data);
      setAccountForm((prev) => ({
        ...prev,
        passwordCurrentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      showMessage("Password updated successfully", "success");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        const mapped = { ...apiErrors };
        if (mapped.currentPassword) {
          mapped.passwordCurrentPassword = mapped.currentPassword;
          delete mapped.currentPassword;
        }
        setAccountFormErrors(mapped);
      }
      showMessage(err.response?.data?.message || "Could not update password", "error");
    } finally {
      setSavingAccount(false);
    }
  }

  async function updateBranding(e) {
    e.preventDefault();
    if (!canManageBranding) return;
    if (!brandingForm.logo && !brandingForm.favicon) {
      setBrandingFormErrors({ logo: "Choose a logo and/or favicon to upload" });
      showMessage("Please choose a logo or favicon", "error");
      return;
    }
    setBrandingFormErrors({});
    setSavingBranding(true);
    try {
      const body = new FormData();
      if (brandingForm.logo) body.append("logo", brandingForm.logo);
      if (brandingForm.favicon) body.append("favicon", brandingForm.favicon);
      const { data } = await api.put("/branding", body);
      setBranding({
        logoPath: data?.logoPath || null,
        faviconPath: data?.faviconPath || null,
        updatedAt: data?.updatedAt || null,
      });
      setBrandingForm({ logo: null, favicon: null });
      showMessage("Branding updated successfully", "success");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        setBrandingFormErrors(apiErrors);
      }
      showMessage(err.response?.data?.message || "Could not update branding", "error");
    } finally {
      setSavingBranding(false);
    }
  }

  async function refreshMailStatus() {
    if (!canManageBranding) return;
    try {
      const { data } = await api.get("/mail/status");
      setMailStatus(data);
      setHrEmail(data?.hrEmail || "");
      setAdminNotificationEmail(data?.adminNotificationEmail || data?.defaultRecipient || "");
      setTestEmailTo((prev) => prev || data?.defaultRecipient || user?.email || "");
    } catch (_err) {
      setMailStatus(null);
    }
  }

  useEffect(() => {
    if (!canManageBranding) return;
    refreshMailStatus();
  }, [canManageBranding, user?.email]);

  async function updateNotificationEmails(e) {
    e.preventDefault();
    if (!canManageBranding) return;
    const nextAdmin = String(adminNotificationEmail || "").trim();
    const nextHr = String(hrEmail || "").trim();
    const errors = {};
    if (nextAdmin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextAdmin)) {
      errors.adminNotificationEmail = "Enter a valid email address";
    }
    if (nextHr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextHr)) {
      errors.hrEmail = "Enter a valid email address";
    }
    setAdminNotificationEmailError(errors.adminNotificationEmail || "");
    setHrEmailError(errors.hrEmail || "");
    if (Object.keys(errors).length) {
      showMessage("Enter valid notification emails", "error");
      return;
    }
    setSavingNotificationEmails(true);
    try {
      const { data } = await api.put("/mail/notification-emails", {
        adminNotificationEmail: nextAdmin,
        hrEmail: nextHr,
      });
      setAdminNotificationEmail(data?.effectiveAdminNotificationEmail || data?.adminNotificationEmail || "");
      setHrEmail(data?.hrEmail || "");
      setMailStatus((prev) =>
        prev
          ? {
              ...prev,
              adminNotificationEmail: data?.effectiveAdminNotificationEmail || data?.adminNotificationEmail || "",
              defaultRecipient: data?.effectiveAdminNotificationEmail || data?.adminNotificationEmail || "",
              hrEmail: data?.hrEmail || "",
            }
          : prev
      );
      showMessage(data?.message || "Notification emails updated", "success");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.adminNotificationEmail) setAdminNotificationEmailError(apiErrors.adminNotificationEmail);
      if (apiErrors?.hrEmail) setHrEmailError(apiErrors.hrEmail);
      showMessage(err.response?.data?.message || "Could not update notification emails", "error");
    } finally {
      setSavingNotificationEmails(false);
    }
  }

  async function sendTestEmail(e) {
    e.preventDefault();
    if (!canManageBranding) return;
    const to = String(testEmailTo || "").trim();
    if (!to) {
      setTestEmailError("Recipient email is required");
      showMessage("Enter a recipient email", "error");
      return;
    }
    setTestEmailError("");
    setSendingTestEmail(true);
    try {
      const { data } = await api.post("/mail/test", { to });
      showMessage(data?.message || `Test email sent to ${to}`, "success");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.to) setTestEmailError(apiErrors.to);
      showMessage(err.response?.data?.message || "Could not send test email", "error");
    } finally {
      setSendingTestEmail(false);
    }
  }

  async function refreshEmployees() {
    if (!token || !canManageEmployees) return;
    const { data } = await api.get("/employees", { headers: authHeaders });
    setEmployees(data);
  }

  async function fetchAll({ silent = false } = {}) {
    if (!token) return;
    try {
      const requests = [];
      if (canManageEmployees) {
        requests.push(api.get("/employees", { headers: authHeaders }).then((res) => setEmployees(res.data)));
      } else {
        setEmployees([]);
      }
      if (canManageLeaves || canApplyLeave) {
        requests.push(api.get("/leaves", { headers: authHeaders }).then((res) => setLeaves(res.data)));
      } else {
        setLeaves([]);
      }
      if (canViewSalarySection) {
        requests.push(api.get("/salary-slips", { headers: authHeaders }).then((res) => setSlips(res.data)));
        if (user?.role && user.role !== "admin") {
          requests.push(
            api
              .get("/salary-revisions/me", { headers: authHeaders })
              .then((res) => setMySalaryRevisions(Array.isArray(res.data) ? res.data : []))
              .catch(() => setMySalaryRevisions([]))
          );
        } else {
          setMySalaryRevisions([]);
        }
      } else {
        setSlips([]);
        setMySalaryRevisions([]);
      }
      if (canViewLettersSection) {
        requests.push(api.get("/reference-letters", { headers: authHeaders }).then((res) => setReferenceLetters(res.data)));
      } else {
        setReferenceLetters([]);
      }
      if (canViewExpensesSection) {
        requests.push(api.get("/expenses", { headers: authHeaders }).then((res) => setExpenses(res.data)));
      } else {
        setExpenses([]);
      }
      await Promise.all(requests);
    } catch (err) {
      if (err.response?.status === 401) return;
      if (!silent) {
        const isNetwork = !err.response && (err.code === "ERR_NETWORK" || err.message === "Network Error");
        showMessage(
          isNetwork
            ? "Cannot reach the API. Start the backend: cd server && npm run dev (port 5001)"
            : err.response?.data?.message || "Failed loading data",
          "error"
        );
      }
    }
  }

  useEffect(() => {
    fetchAll();
  }, [token, user?.role, canManageEmployees, canManageLeaves, canApplyLeave, canViewSalarySection, canViewLettersSection, canViewExpensesSection]);

  useEffect(() => {
    if (!filePreview.open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") closeFilePreview();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [filePreview.open]);

  useEffect(() => {
    if (!leaveDecisionModal.open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") closeLeaveDecisionModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [leaveDecisionModal.open]);

  useEffect(() => {
    if (!deleteEmployeeModal.open) return undefined;
    function onKey(e) {
      if (e.key === "Escape" && !deletingEmployee) closeDeleteEmployeeModal();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [deleteEmployeeModal.open, deletingEmployee]);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timeoutId);
  }, [message]);

  async function saveEmployee(e) {
    e.preventDefault();
    if (savingEmployee) return;

    const wasEditing = Boolean(editingEmployeeId);
    const editingEmployee = wasEditing ? employees.find((emp) => emp.id === editingEmployeeId) : null;
    const validation = validateEmployeeForm(employeeForm, {
      isEdit: wasEditing,
      hasIdFront: Boolean(employeeForm.idFront || editingEmployee?.idFrontPath),
      hasIdBack: Boolean(employeeForm.idBack || editingEmployee?.idBackPath),
      hasEmploymentLetter: Boolean(employeeForm.employmentLetter || editingEmployee?.employmentLetterPath),
    });

    if (!validation.valid) {
      setEmployeeFormErrors(validation.errors);
      showMessage("Please fix the highlighted errors before saving", "error");
      return;
    }

    setEmployeeFormErrors({});
    setSavingEmployee(true);
    try {
      const body = new FormData();
      if (wasEditing) {
        body.append("employeeId", employeeForm.employeeId);
      }
      body.append("fullName", employeeForm.fullName.trim());
      body.append("email", employeeForm.email.trim());
      if (!wasEditing || employeeForm.password) {
        body.append("password", employeeForm.password);
      }
      body.append("birthdate", employeeForm.birthdate);
      body.append("designation", employeeForm.designation);
      body.append("role", employeeForm.role);
      body.append("phone", employeeForm.phone);
      body.append("address", employeeForm.address);
      body.append("joinedDate", employeeForm.joinedDate);
      body.append("monthlySalary", employeeForm.monthlySalary);
      body.append("nationalId", employeeForm.nationalId.trim());
      body.append("gender", employeeForm.gender);
      body.append("maritalStatus", employeeForm.maritalStatus);
      if (employeeForm.idFront) body.append("idFront", employeeForm.idFront);
      if (employeeForm.idBack) body.append("idBack", employeeForm.idBack);
      if (employeeForm.employmentLetter) body.append("employmentLetter", employeeForm.employmentLetter);

      if (wasEditing) {
        await api.put(`/employees/${editingEmployeeId}`, body, { headers: authHeaders });
      } else {
        await api.post("/employees", body, { headers: authHeaders });
      }

      setEditingEmployeeId(null);
      setEmployeeForm({
        employeeId: "",
        fullName: "",
        email: "",
        password: "",
        birthdate: "",
        designation: "",
        role: "employee",
        phone: "",
        address: "",
        joinedDate: "",
        monthlySalary: "",
        nationalId: "",
        gender: "",
        maritalStatus: "",
        idFront: null,
        idBack: null,
        employmentLetter: null,
      });

      await refreshEmployees();
      showMessage(wasEditing ? "User updated successfully" : "User added successfully", "success");
      navigate("/employees/list");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        setEmployeeFormErrors(apiErrors);
      }
      const apiMessage = err.response?.data?.message;
      showMessage(apiMessage || err.message || "Could not save user", "error");
    } finally {
      setSavingEmployee(false);
    }
  }

  function startEditEmployee(emp) {
    setEditingEmployeeId(emp.id);
    setEmployeeFormErrors({});
    setEmployeeForm({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      password: "",
      birthdate: emp.birthdate || "",
      designation: emp.designation || "",
      role: emp.role || "employee",
      phone: emp.phone || "",
      address: emp.address || "",
      joinedDate: emp.joinedDate || "",
      monthlySalary: emp.monthlySalary || "",
      nationalId: emp.nationalId || "",
      gender: emp.gender || "",
      maritalStatus: emp.maritalStatus || "",
      idFront: null,
      idBack: null,
      employmentLetter: null,
    });
  }

  function openDeleteEmployeeModal(emp) {
    setDeleteEmployeeModal({
      open: true,
      employeeId: emp.id,
      fullName: emp.fullName || "",
      employeeCode: emp.employeeId || "",
    });
  }

  function closeDeleteEmployeeModal() {
    if (deletingEmployee) return;
    setDeleteEmployeeModal({ open: false, employeeId: null, fullName: "", employeeCode: "" });
  }

  async function confirmDeleteEmployee() {
    const id = deleteEmployeeModal.employeeId;
    if (!id || deletingEmployee) return;

    setDeletingEmployee(true);
    try {
      await api.delete(`/employees/${id}`, { headers: authHeaders });
      if (Number(editingEmployeeId) === Number(id)) {
        setEditingEmployeeId(null);
        setEmployeeForm({
          employeeId: "",
          fullName: "",
          email: "",
          password: "",
          birthdate: "",
          designation: "",
          role: "employee",
          phone: "",
          address: "",
          joinedDate: "",
          monthlySalary: "",
          nationalId: "",
          gender: "",
          maritalStatus: "",
          idFront: null,
          idBack: null,
          employmentLetter: null,
        });
        setEmployeeFormErrors({});
      }
      setDeleteEmployeeModal({ open: false, employeeId: null, fullName: "", employeeCode: "" });
      await refreshEmployees();
      fetchAll({ silent: true });
      showMessage("User deleted successfully", "success");
    } catch (err) {
      showMessage(err.response?.data?.message || "Could not delete user", "error");
    } finally {
      setDeletingEmployee(false);
    }
  }

  async function applyLeave(e) {
    e.preventDefault();
    const validation = validateLeaveForm(leaveForm);
    if (!validation.valid) {
      setLeaveFormErrors(validation.errors);
      showMessage("Please fix the highlighted errors before submitting", "error");
      return;
    }
    setLeaveFormErrors({});
    try {
      const body = new FormData();
      body.append("startDate", leaveForm.startDate);
      body.append("endDate", leaveForm.endDate);
      body.append("leaveType", leaveForm.leaveType);
      body.append("isHalfDay", leaveForm.isHalfDay ? "true" : "false");
      if (leaveForm.isHalfDay && leaveForm.halfDaySession) {
        body.append("halfDaySession", leaveForm.halfDaySession);
      }
      if (leaveForm.leaveDetails?.trim()) body.append("leaveDetails", leaveForm.leaveDetails.trim());
      if (leaveForm.supportingDoc) body.append("supportingDoc", leaveForm.supportingDoc);
      await api.post("/leaves", body, { headers: authHeaders });
      setLeaveForm({
        startDate: "",
        endDate: "",
        leaveType: "casual",
        leaveDetails: "",
        supportingDoc: null,
        isHalfDay: false,
        halfDaySession: "first",
      });
      setMessage("Leave request submitted");
      fetchAll();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not apply leave");
    }
  }

  async function uploadLeaveSupportingDoc(leaveId) {
    const file = leaveDocFiles[leaveId];
    if (!file) {
      setMessage("Please choose a report/slip file first");
      return;
    }
    try {
      const body = new FormData();
      body.append("supportingDoc", file);
      await api.patch(`/leaves/${leaveId}/supporting-doc`, body, { headers: authHeaders });
      setLeaveDocFiles((prev) => ({ ...prev, [leaveId]: null }));
      setMessage("Supporting document uploaded");
      fetchAll();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not upload supporting document");
    }
  }

  async function updateLeaveStatus(id, status, noteOverride) {
    const note = String(noteOverride ?? leaveNotes[id] ?? "").trim();
    if (!note) {
      setMessage("Please add a note before approving or rejecting leave");
      return;
    }
    await api.patch(`/leaves/${id}/status`, { status, note }, { headers: authHeaders });
    setLeaveNotes((prev) => ({ ...prev, [id]: "" }));
    setMessage(`Leave ${status.toLowerCase()}`);
    fetchAll();
  }

  function openLeaveDecisionModal(leaveId, status) {
    setLeaveDecisionModal({ open: true, leaveId, status, note: "" });
  }

  function closeLeaveDecisionModal() {
    setLeaveDecisionModal({ open: false, leaveId: null, status: "Approved", note: "" });
  }

  async function submitLeaveDecisionFromModal() {
    if (!leaveDecisionModal.leaveId) return;
    await updateLeaveStatus(leaveDecisionModal.leaveId, leaveDecisionModal.status, leaveDecisionModal.note);
    closeLeaveDecisionModal();
  }

  function openFilePreview({ url, title = "", subtitle = "" }) {
    if (!url) return;
    const lower = url.toLowerCase().split("?")[0];
    const isPdf = lower.endsWith(".pdf");
    setFilePreview({
      open: true,
      url,
      type: isPdf ? "pdf" : "image",
      title,
      subtitle,
    });
  }

  function closeFilePreview() {
    setFilePreview({ open: false, url: "", type: "image", title: "", subtitle: "" });
  }

  async function submitExpense(e) {
    e.preventDefault();
    const validation = validateExpenseForm(expenseForm);
    if (!validation.valid) {
      setExpenseFormErrors(validation.errors);
      showMessage("Please fix the highlighted errors before submitting", "error");
      return;
    }
    setExpenseFormErrors({});
    try {
      const body = new FormData();
      body.append("title", expenseForm.title.trim());
      body.append("amount", expenseForm.amount.trim());
      body.append("expenseDate", expenseForm.expenseDate);
      if (expenseForm.description?.trim()) body.append("description", expenseForm.description.trim());
      if (expenseForm.receipt) body.append("receipt", expenseForm.receipt);
      await api.post("/expenses", body, { headers: authHeaders });
      setExpenseForm({ title: "", amount: "", expenseDate: "", description: "", receipt: null });
      showMessage("Expense submitted for approval");
      await fetchAll();
      navigate("/expenses/list");
    } catch (err) {
      showMessage(err.response?.data?.message || "Could not submit expense", "error");
    }
  }

  async function updateExpenseStatus(id, status, noteOverride) {
    const note = String(noteOverride ?? expenseNotes[id] ?? "").trim();
    if (!note) {
      showMessage("Please add a note before approving or rejecting the expense", "error");
      return;
    }
    try {
      await api.patch(`/expenses/${id}/status`, { status, note }, { headers: authHeaders });
      setExpenseNotes((prev) => ({ ...prev, [id]: "" }));
      showMessage(`Expense ${status.toLowerCase()}`);
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || "Could not update expense", "error");
      throw err;
    }
  }

  async function applyReferenceLetter(e) {
    e.preventDefault();
    const validation = validateReferenceForm(referenceForm);
    if (!validation.valid) {
      setReferenceFormErrors(validation.errors);
      showMessage("Please fix the highlighted errors before submitting", "error");
      return;
    }
    setReferenceFormErrors({});
    try {
      await api.post("/reference-letters", referenceForm, { headers: authHeaders });
      setReferenceForm({ purpose: "", details: "", addressedTo: "" });
      setMessage("Reference letter request submitted");
      fetchAll();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not submit request");
    }
  }

  async function updateReferenceStatus(id, status, noteOverride) {
    const note = String(noteOverride ?? referenceNotes[id] ?? "").trim();
    if (!note) {
      showMessage("Please add a note before approving/rejecting request", "error");
      return;
    }
    try {
      await api.patch(`/reference-letters/${id}/status`, { status, note }, { headers: authHeaders });
      setReferenceNotes((prev) => ({ ...prev, [id]: "" }));
      showMessage(`Reference letter ${status.toLowerCase()}`, "success");
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || "Could not update reference letter request", "error");
      throw err;
    }
  }

  async function generateReferenceLetter(id, hadFile = false) {
    try {
      await api.post(`/reference-letters/${id}/generate`, {}, { headers: authHeaders });
      showMessage(hadFile ? "Reference letter regenerated" : "Reference letter generated", "success");
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || "Could not generate reference letter", "error");
      throw err;
    }
  }

  async function deleteReferenceLetter(id) {
    try {
      await api.delete(`/reference-letters/${id}`, { headers: authHeaders });
      showMessage("Reference letter request deleted", "success");
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || "Could not delete reference letter request", "error");
      throw err;
    }
  }

  async function createAdminReferenceLetter(payload) {
    try {
      await api.post("/reference-letters", payload, { headers: authHeaders });
      showMessage("Reference letter request created", "success");
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || "Could not create reference letter request", "error");
      throw err;
    }
  }

  async function fetchSalaryReportData() {
    const today = new Date().toISOString().slice(0, 10);
    const reportRes = await api.get("/payroll/monthly-report", {
      headers: authHeaders,
      params: { month: salaryCalcForm.month, asOfDate: today },
    });
    setMonthlyReport(reportRes.data);
    if (salaryCalcForm.employeeUserId) {
      const previewRes = await api.get("/payroll/preview", {
        headers: authHeaders,
        params: { employeeUserId: salaryCalcForm.employeeUserId, month: salaryCalcForm.month, asOfDate: today },
      });
      setPayrollPreview(previewRes.data);
    } else {
      setPayrollPreview(null);
    }
  }

  function applyExtrasToForm(extra) {
    const bonus = Number(extra?.bonusAmount || 0);
    const enabled = bonus > 0;
    setSalaryCalcForm((prev) => ({
      ...prev,
      extrasEnabled: enabled,
      extrasAmount: enabled ? String(bonus) : "",
      extrasNote: extra?.note || "",
    }));
  }

  async function savePayrollExtras() {
    if (!canManagePayroll) return;
    if (!salaryCalcForm.employeeUserId || !salaryCalcForm.month) {
      showMessage("Select user and month to save bonus", "error");
      return;
    }

    let bonusAmount = 0;
    let note = null;

    if (salaryCalcForm.extrasEnabled) {
      const amount = Number(salaryCalcForm.extrasAmount || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Enter a bonus amount greater than 0", "error");
        return;
      }
      bonusAmount = Number(amount.toFixed(2));
      note = String(salaryCalcForm.extrasNote || "").trim().slice(0, 200) || null;
    }

    setPayrollExtrasSaving(true);
    try {
      const { data } = await api.put(
        "/payroll/extras",
        {
          employeeUserId: Number(salaryCalcForm.employeeUserId),
          month: salaryCalcForm.month,
          bonusAmount,
          giftAmount: 0,
          note,
        },
        { headers: authHeaders }
      );
      showMessage(data?.message || "Bonus saved", "success");
      applyExtrasToForm(data?.extra);
      await fetchSalaryReportData();
    } catch (err) {
      if (err.response?.status === 401) return;
      showMessage(err.response?.data?.message || "Could not save bonus", "error");
    } finally {
      setPayrollExtrasSaving(false);
    }
  }

  async function loadSalaryReport() {
    if (!canManagePayroll) return;
    const validation = validatePayrollSelection(salaryCalcForm);
    if (!validation.valid) {
      setPayrollFormErrors(validation.errors);
      showMessage("Please select a month", "error");
      return;
    }
    setPayrollFormErrors({});
    setPayrollLoading(true);
    try {
      await fetchSalaryReportData();
    } catch (err) {
      if (err.response?.status === 401) return;
      setMessage(err.response?.data?.message || "Could not load salary report");
    } finally {
      setPayrollLoading(false);
    }
  }

  async function generateSalarySlip() {
    if (!salaryCalcForm.month) {
      setMessage("Select month first");
      return;
    }
    if (canManagePayroll && !salaryCalcForm.employeeUserId) {
      setMessage("Select user and month, then generate slip");
      return;
    }
    try {
      const payload = canManagePayroll
        ? { employeeUserId: salaryCalcForm.employeeUserId, month: salaryCalcForm.month }
        : { month: salaryCalcForm.month };
      const { data } = await api.post("/salary-slips/generate", payload, { headers: authHeaders });
      const slip = data?.slip;
      setMessage("Salary slip generated successfully");
      if (slip?.filePath) {
        openFilePreview({
          url: `${API_BASE}${slip.filePath}?v=${encodeURIComponent(slip.uploadedAt || "")}`,
          title: slip.title || "Salary slip",
          subtitle: slip.month || salaryCalcForm.month,
        });
      }
      await fetchAll();
      return slip;
    } catch (err) {
      const responseData = err.response?.data;
      if (typeof responseData === "string" && responseData.includes("<!DOCTYPE html>")) {
        setMessage("Backend is not updated. Please restart server and try again.");
        return null;
      }
      setMessage(responseData?.message || err.message || "Could not generate salary slip");
      return null;
    }
  }

  async function generatePayrollReport() {
    if (!canManagePayroll) return;
    const validation = validatePayrollSelection(salaryCalcForm);
    if (!validation.valid) {
      setPayrollFormErrors(validation.errors);
      showMessage("Please select a month", "error");
      return;
    }
    setPayrollFormErrors({});
    setPayrollLoading(true);
    try {
      await fetchSalaryReportData();
      if (salaryCalcForm.employeeUserId) {
        await generateSalarySlip();
      } else {
        showMessage("Payroll report loaded", "success");
      }
    } catch (err) {
      if (err.response?.status === 401) return;
      showMessage(err.response?.data?.message || "Could not generate payroll report", "error");
    } finally {
      setPayrollLoading(false);
    }
  }

  async function sendPayrollSummaryEmail() {
    if (!canManagePayroll) return;
    if (!salaryCalcForm.month) {
      setPayrollFormErrors({ month: "Month is required" });
      showMessage("Please select a month", "error");
      return;
    }
    setPayrollFormErrors({});
    setPayrollLoading(true);
    try {
      const asOfDate = `${salaryCalcForm.month}-25`;
      const res = await api.post(
        "/payroll/email-monthly-summary",
        { month: salaryCalcForm.month, asOfDate, force: true },
        { headers: authHeaders }
      );
      showMessage(
        `Payroll summary emailed to ${Array.isArray(res.data.to) ? res.data.to.join(", ") : res.data.to} (${res.data.totalEmployees} employees)`,
        "success"
      );
    } catch (err) {
      if (err.response?.status === 401) return;
      showMessage(err.response?.data?.message || "Could not send payroll summary email", "error");
    } finally {
      setPayrollLoading(false);
    }
  }

  useEffect(() => {
    if (!salaryCalcForm.employeeUserId) return;
    const selected = employees.find((emp) => String(emp.id) === String(salaryCalcForm.employeeUserId));
    if (!selected) return;
    setSalaryCalcForm((prev) => ({
      ...prev,
      month: prev.month || currentMonthValue,
      totalSalary: selected.monthlySalary ? String(selected.monthlySalary) : prev.totalSalary,
    }));
  }, [salaryCalcForm.employeeUserId, employees, currentMonthValue]);

  useEffect(() => {
    if (!canManagePayroll) return;
    if (!salaryCalcForm.month) {
      setSalaryCalcForm((prev) => ({ ...prev, month: currentMonthValue }));
    }
  }, [canManagePayroll, salaryCalcForm.month, currentMonthValue]);

  useEffect(() => {
    if (!canManagePayroll) return;
    setMonthlyReport(null);
    setPayrollPreview(null);
  }, [canManagePayroll, salaryCalcForm.month, salaryCalcForm.employeeUserId]);

  useEffect(() => {
    if (!canManagePayroll || !salaryCalcForm.employeeUserId || !salaryCalcForm.month) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/payroll/extras", {
          headers: authHeaders,
          params: { employeeUserId: salaryCalcForm.employeeUserId, month: salaryCalcForm.month },
        });
        if (cancelled) return;
        applyExtrasToForm(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManagePayroll, salaryCalcForm.employeeUserId, salaryCalcForm.month, authHeaders]);

  const [navOpen, setNavOpen] = useState({
    employees: true,
    leaves: true,
    salary: true,
    letters: true,
    expenses: true,
  });

  useEffect(() => {
    const p = location.pathname;
    setNavOpen((prev) => ({
      ...prev,
      ...(p.startsWith("/employees") ? { employees: true } : {}),
      ...(p.startsWith("/leaves") ? { leaves: true } : {}),
      ...(p.startsWith("/salary-slips") ? { salary: true } : {}),
      ...(p.startsWith("/reference-letters") ? { letters: true } : {}),
      ...(p.startsWith("/expenses") ? { expenses: true } : {}),
    }));
  }, [location.pathname]);

  function toggleNavGroup(key) {
    setNavOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function deleteSlip(id) {
    await api.delete(`/salary-slips/${id}`, { headers: authHeaders });
    setMessage("Slip removed");
    fetchAll();
  }

  const pendingLeavesCount = leaves.filter((item) => item.status === "Pending").length;
  const approvedLeavesCount = leaves.filter((item) => item.status === "Approved").length;
  const pendingExpensesCount = expenses.filter((item) => item.status === "Pending").length;

  return {
    navigate,
    location,
    api,
    authHeaders,
    token,
    user,
    employees,
    leaves,
    slips,
    mySalaryRevisions,
    salaryRevisionNotice,
    dismissSalaryRevisionNotice,
    referenceLetters,
    expenses,
    message,
    messageVariant,
    setMessage,
    showMessage,
    savingEmployee,
    employeeFormErrors,
    setEmployeeFormErrors,
    editingEmployeeId,
    setEditingEmployeeId,
    loginForm,
    setLoginForm,
    loginFormErrors,
    setLoginFormErrors,
    accountForm,
    setAccountForm,
    accountFormErrors,
    setAccountFormErrors,
    savingAccount,
    leaveFormErrors,
    setLeaveFormErrors,
    referenceFormErrors,
    setReferenceFormErrors,
    expenseFormErrors,
    setExpenseFormErrors,
    payrollFormErrors,
    setPayrollFormErrors,
    employeeForm,
    setEmployeeForm,
    leaveForm,
    setLeaveForm,
    leaveNotes,
    setLeaveNotes,
    leaveDocFiles,
    setLeaveDocFiles,
    leaveDecisionModal,
    setLeaveDecisionModal,
    filePreview,
    setFilePreview,
    referenceForm,
    setReferenceForm,
    expenseForm,
    setExpenseForm,
    expenseNotes,
    setExpenseNotes,
    referenceNotes,
    setReferenceNotes,
    salaryCalcForm,
    setSalaryCalcForm,
    payrollPreview,
    setPayrollPreview,
    monthlyReport,
    setMonthlyReport,
    payrollLoading,
    payrollExtrasSaving,
    currentMonthValue,
    navOpen,
    setNavOpen,
    isManagement,
    isEmployee,
    canManageEmployees,
    canManageLeaves,
    canApproveLeaves,
    canManagePayroll,
    canManageLetters,
    canApplyReferenceLetter,
    canViewSalarySection,
    canViewLettersSection,
    canApplyLeave,
    canSubmitExpenses,
    canViewAllExpenses,
    canApproveExpenses,
    canViewExpensesSection,
    canManageBranding,
    branding,
    brandingForm,
    setBrandingForm,
    brandingFormErrors,
    setBrandingFormErrors,
    savingBranding,
    testEmailTo,
    setTestEmailTo,
    testEmailError,
    setTestEmailError,
    sendingTestEmail,
    mailStatus,
    hrEmail,
    setHrEmail,
    hrEmailError,
    setHrEmailError,
    adminNotificationEmail,
    setAdminNotificationEmail,
    adminNotificationEmailError,
    setAdminNotificationEmailError,
    savingNotificationEmails,
    updateNotificationEmails,
    brandLogoUrl,
    brandFaviconUrl,
    pendingLeavesCount,
    pendingExpensesCount,
    approvedLeavesCount,
    login,
    logout,
    updateAccountEmail,
    updateAccountPassword,
    updateBranding,
    refreshBranding,
    sendTestEmail,
    refreshMailStatus,
    fetchAll,
    saveEmployee,
    startEditEmployee,
    openDeleteEmployeeModal,
    closeDeleteEmployeeModal,
    confirmDeleteEmployee,
    deleteEmployeeModal,
    deletingEmployee,
    applyLeave,
    uploadLeaveSupportingDoc,
    updateLeaveStatus,
    openLeaveDecisionModal,
    closeLeaveDecisionModal,
    submitLeaveDecisionFromModal,
    openFilePreview,
    closeFilePreview,
    submitExpense,
    updateExpenseStatus,
    applyReferenceLetter,
    updateReferenceStatus,
    generateReferenceLetter,
    deleteReferenceLetter,
    createAdminReferenceLetter,
    loadSalaryReport,
    generateSalarySlip,
    generatePayrollReport,
    savePayrollExtras,
    sendPayrollSummaryEmail,
    toggleNavGroup,
    deleteSlip,
  };
}
