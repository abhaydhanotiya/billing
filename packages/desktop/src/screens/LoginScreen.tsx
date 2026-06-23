import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.js";
import { api, getServerUrl, setServerUrl } from "../lib/api.js";
import { ApiError } from "../lib/api.js";

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState(getServerUrl());
  const [showServer, setShowServer] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Probe server reachability so staff know if the server PC is down.
  useEffect(() => {
    let alive = true;
    setOnline(null);
    api.health().then((ok) => alive && setOnline(ok));
    return () => {
      alive = false;
    };
  }, [server]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setServerUrl(server);
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-mark">SP</div>
          <h1 className="login-title">Sanskar Palace</h1>
          <p className="login-tagline">Billing &amp; Front Desk Management</p>
          <div className="login-ornament" aria-hidden="true" />
          <p className="login-note">
            GST-ready invoicing, room &amp; restaurant billing, and reports — all on your
            local network.
          </p>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-form rise" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted" style={{ marginTop: 4, marginBottom: 22 }}>
            Enter your staff credentials to continue.
          </p>

          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="u">Username</label>
            <input
              id="u"
              className="input"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="field" style={{ marginBottom: 18 }}>
            <label htmlFor="p">Password / PIN</label>
            <input
              id="p"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <button className="btn btn-primary btn-lg" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="login-server">
            <button type="button" className="link-btn" onClick={() => setShowServer((s) => !s)}>
              <span
                className={`dot ${online === null ? "dot-idle" : online ? "dot-ok" : "dot-bad"}`}
              />
              {online === null ? "Checking server…" : online ? "Server connected" : "Server unreachable"}
              <span className="muted"> · {server}</span>
            </button>
            {showServer && (
              <div className="field" style={{ marginTop: 10 }}>
                <label>Server address</label>
                <input
                  className="input"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="http://192.168.1.10:4000"
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
