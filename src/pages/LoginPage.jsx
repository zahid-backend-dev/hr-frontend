import { FieldError } from "../components/FieldError";
export function LoginPage({ app }) {
  const { loginForm, setLoginForm, login, message, loginFormErrors, setLoginFormErrors } = app;

  function updateLogin(patch) {
    setLoginForm({ ...loginForm, ...patch });
    const keys = Object.keys(patch);
    if (keys.length && Object.keys(loginFormErrors).length) {
      setLoginFormErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  return (
    <div className="login-screen">
      <div className="card glass">
        <img src={app.brandLogoUrl || "/logo.png"} alt="Basirah Logo" className="brand-logo login-logo" />
        <h1>Basirah HR Portal</h1>
        <p>Modern user management with leave and salary workflows.</p>
        <form onSubmit={login} className="grid" noValidate>
          <div className={`field ${loginFormErrors.email ? "field--invalid" : ""}`}>
            <input
              placeholder="Email"
              type="email"
              value={loginForm.email}
              onChange={(e) => updateLogin({ email: e.target.value.trim() })}
            />
            <FieldError message={loginFormErrors.email} />
          </div>
          <div className={`field ${loginFormErrors.password ? "field--invalid" : ""}`}>
            <input
              placeholder="Password"
              type="password"
              value={loginForm.password}
              onChange={(e) => updateLogin({ password: e.target.value })}
            />
            <FieldError message={loginFormErrors.password} />
          </div>
          <button type="submit">Login</button>
        </form>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}
