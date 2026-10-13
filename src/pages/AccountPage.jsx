import { FieldError } from "../components/FieldError";
import { UploadCard } from "../components/UploadCard";
import { API_BASE } from "../api/client";

export function AccountPage({ app }) {
  const {
    user,
    accountForm,
    setAccountForm,
    accountFormErrors,
    setAccountFormErrors,
    updateAccountEmail,
    updateAccountPassword,
    savingAccount,
    canManageBranding,
    branding,
    brandingForm,
    setBrandingForm,
    brandingFormErrors,
    setBrandingFormErrors,
    updateBranding,
    savingBranding,
    testEmailTo,
    setTestEmailTo,
    testEmailError,
    setTestEmailError,
    sendTestEmail,
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
  } = app;

  function updateForm(patch) {
    setAccountForm({ ...accountForm, ...patch });
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(accountFormErrors).length) {
      setAccountFormErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  function updateBrandingForm(patch) {
    setBrandingForm({ ...brandingForm, ...patch });
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(brandingFormErrors).length) {
      setBrandingFormErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  const currentLogoPreview = branding.logoPath
    ? `${API_BASE}${branding.logoPath}${branding.updatedAt ? `?v=${encodeURIComponent(branding.updatedAt)}` : ""}`
    : "/logo.png";
  const currentFaviconPreview = branding.faviconPath
    ? `${API_BASE}${branding.faviconPath}${branding.updatedAt ? `?v=${encodeURIComponent(branding.updatedAt)}` : ""}`
    : "/favicon.svg";

  return (
    <section className="panel glass account-page">
      <div className="page-head">
        <h3>Account settings</h3>
        <p>Update your email or password separately. Admins can also update logo and favicon.</p>
      </div>

      <div className="account-stack">
        <div className="form-section account-card">
          <h4>Profile</h4>
          <div className="two account-fields">
            <div className="field">
              <label>Name</label>
              <input value={user.fullName || ""} disabled readOnly />
            </div>
            <div className="field">
              <label>Role</label>
              <input value={(user.designation || user.role || "").toUpperCase()} disabled readOnly />
            </div>
          </div>
        </div>

        {canManageBranding && (
          <form className="form-section account-card" onSubmit={updateBranding} noValidate>
            <h4>Branding</h4>
            <p className="account-card-hint">
              Upload a new logo and/or favicon (PNG/JPG/WEBP, max 10 MB). You can update either one without
              changing the other.
            </p>
            <div className="two account-fields branding-previews">
              <div className="branding-current">
                <span>Current logo</span>
                <img src={currentLogoPreview} alt="Current logo" />
              </div>
              <div className="branding-current">
                <span>Current favicon</span>
                <img src={currentFaviconPreview} alt="Current favicon" />
              </div>
            </div>
            <div className="two account-fields">
              <UploadCard
                label="Logo"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                fileValue={brandingForm.logo}
                onFileChange={(file) => updateBrandingForm({ logo: file })}
                isImage
                error={brandingFormErrors.logo || ""}
              />
              <UploadCard
                label="Favicon"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.png,.jpg,.jpeg,.webp,.svg,.ico"
                fileValue={brandingForm.favicon}
                onFileChange={(file) => updateBrandingForm({ favicon: file })}
                isImage
                error={brandingFormErrors.favicon || ""}
              />
            </div>
            <button type="submit" className="account-submit" disabled={savingBranding}>
              {savingBranding ? "Saving..." : "Save branding"}
            </button>
          </form>
        )}

        {canManageBranding && (
          <form className="form-section account-card" onSubmit={updateNotificationEmails} noValidate>
            <h4>Notification emails</h4>
            <p className="account-card-hint">
              Leave, expense, reference-letter, and payroll alerts are sent to both addresses (duplicates
              skipped). Clear admin to fall back to ADMIN_NOTIFICATION_EMAIL in server env.
            </p>
            <div className="two account-fields">
              <div className={`field ${adminNotificationEmailError ? "field--invalid" : ""}`}>
                <label>Admin notification email</label>
                <input
                  type="email"
                  value={adminNotificationEmail}
                  onChange={(e) => {
                    setAdminNotificationEmail(e.target.value.trim());
                    if (adminNotificationEmailError) setAdminNotificationEmailError("");
                  }}
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
                <FieldError message={adminNotificationEmailError} />
              </div>
              <div className={`field ${hrEmailError ? "field--invalid" : ""}`}>
                <label>HR notification email</label>
                <input
                  type="email"
                  value={hrEmail}
                  onChange={(e) => {
                    setHrEmail(e.target.value.trim());
                    if (hrEmailError) setHrEmailError("");
                  }}
                  placeholder="hr@example.com"
                  autoComplete="email"
                />
                <FieldError message={hrEmailError} />
              </div>
            </div>
            <button type="submit" className="account-submit" disabled={savingNotificationEmails}>
              {savingNotificationEmails ? "Saving..." : "Save notification emails"}
            </button>
          </form>
        )}

        {canManageBranding && (
          <form className="form-section account-card" onSubmit={sendTestEmail} noValidate>
            <h4>Email (Brevo)</h4>
            <p className="account-card-hint">
              Send a test message to a real inbox (not @basirah.local). MAIL_FROM must be a verified
              Brevo sender. Alerts use the admin + HR emails above.
            </p>
            <div className="account-fields">
              <div className="field">
                <label>Mail status</label>
                <input
                  value={
                    mailStatus?.brevoConfigured
                      ? `Brevo ready · from ${mailStatus.mailFrom || "-"}`
                      : mailStatus?.smtpConfigured
                        ? `SMTP ready · from ${mailStatus.mailFrom || "-"}`
                        : "Email not configured"
                  }
                  disabled
                  readOnly
                />
              </div>
              <div className={`field ${testEmailError ? "field--invalid" : ""}`}>
                <label>Send test to</label>
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => {
                    setTestEmailTo(e.target.value.trim());
                    if (testEmailError) setTestEmailError("");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <FieldError message={testEmailError} />
              </div>
            </div>
            <button type="submit" className="account-submit" disabled={sendingTestEmail}>
              {sendingTestEmail ? "Sending..." : "Send test email"}
            </button>
          </form>
        )}

        <form className="form-section account-card" onSubmit={updateAccountEmail} noValidate>
          <h4>Update email</h4>
          <p className="account-card-hint">Change only your login email. Leave password section alone.</p>
          <div className="account-fields">
            <div className={`field ${accountFormErrors.email ? "field--invalid" : ""}`}>
              <label>Email</label>
              <input
                type="email"
                value={accountForm.email}
                onChange={(e) => updateForm({ email: e.target.value.trim() })}
                autoComplete="email"
              />
              <FieldError message={accountFormErrors.email} />
            </div>
            <div className={`field ${accountFormErrors.emailCurrentPassword ? "field--invalid" : ""}`}>
              <label>Current password *</label>
              <input
                type="password"
                value={accountForm.emailCurrentPassword}
                onChange={(e) => updateForm({ emailCurrentPassword: e.target.value })}
                autoComplete="current-password"
                placeholder="Confirm with your current password"
              />
              <FieldError message={accountFormErrors.emailCurrentPassword} />
            </div>
          </div>
          <button type="submit" className="account-submit" disabled={savingAccount}>
            {savingAccount ? "Saving..." : "Update email"}
          </button>
        </form>

        <form className="form-section account-card" onSubmit={updateAccountPassword} noValidate>
          <h4>Update password</h4>
          <p className="account-card-hint">Change only your password. Email stays the same.</p>
          <div className="account-fields">
            <div className={`field ${accountFormErrors.passwordCurrentPassword ? "field--invalid" : ""}`}>
              <label>Current password *</label>
              <input
                type="password"
                value={accountForm.passwordCurrentPassword}
                onChange={(e) => updateForm({ passwordCurrentPassword: e.target.value })}
                autoComplete="current-password"
              />
              <FieldError message={accountFormErrors.passwordCurrentPassword} />
            </div>
            <div className="two account-fields-row">
              <div className={`field ${accountFormErrors.newPassword ? "field--invalid" : ""}`}>
                <label>New password *</label>
                <input
                  type="password"
                  value={accountForm.newPassword}
                  onChange={(e) => updateForm({ newPassword: e.target.value })}
                  autoComplete="new-password"
                />
                <FieldError message={accountFormErrors.newPassword} />
              </div>
              <div className={`field ${accountFormErrors.confirmPassword ? "field--invalid" : ""}`}>
                <label>Confirm new password *</label>
                <input
                  type="password"
                  value={accountForm.confirmPassword}
                  onChange={(e) => updateForm({ confirmPassword: e.target.value })}
                  autoComplete="new-password"
                />
                <FieldError message={accountFormErrors.confirmPassword} />
              </div>
            </div>
          </div>
          <button type="submit" className="account-submit" disabled={savingAccount}>
            {savingAccount ? "Saving..." : "Update password"}
          </button>
        </form>
      </div>
    </section>
  );
}
