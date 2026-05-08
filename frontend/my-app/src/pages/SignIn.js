import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login, register } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

const PAGE_BG = {
  background: "linear-gradient(180deg, #e8eeff 0%, #f0f4ff 40%, #ffffff 100%)",
  minHeight: "100vh",
};

const CARD_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(99,102,241,0.15)",
  boxShadow: "0 0 0 1px rgba(99,102,241,0.06), 0 24px 48px rgba(99,102,241,0.12)",
};

const INPUT_STYLE = {
  background: "#f5f7ff",
  border: "1px solid rgba(99,102,241,0.2)",
  width: "100%",
  borderRadius: "0.5rem",
  padding: "0.75rem 1rem",
  color: "#1e293b",
  fontSize: "0.875rem",
  outline: "none",
  transition: "box-shadow 0.15s",
};

const BTN_STYLE = {
  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  color: "white",
  fontWeight: "500",
  fontSize: "0.9rem",
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.15s, box-shadow 0.15s",
};

const BTN_DISABLED_STYLE = {
  ...BTN_STYLE,
  opacity: 0.5,
  cursor: "not-allowed",
  boxShadow: "none",
};

function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export default function SignIn() {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? login : register;
      const { access_token } = await fn(form);
      await authLogin(access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const focusInput = (e) => {
    e.target.style.boxShadow = "0 0 0 2px rgba(99,102,241,0.45)";
    e.target.style.borderColor = "rgba(99,102,241,0.6)";
  };
  const blurInput = (e) => {
    e.target.style.boxShadow = "none";
    e.target.style.borderColor = "rgba(255,255,255,0.08)";
  };

  return (
    <div style={PAGE_BG} className="flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <ShieldIcon />
            </div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: "#1e293b" }}>
              Gov<span style={{ color: "#6366f1" }}>MCP</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm">{t("auth.subtitle")}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={CARD_STYLE}>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "#eef0ff" }}>
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={mode === m ? {
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
                } : {
                  color: "#94a3b8",
                }}
              >
                {m === "login" ? t("auth.signIn") : t("auth.register")}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">{t("auth.fullName")}</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Doe"
                  style={INPUT_STYLE}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-600 mb-1.5">{t("auth.email")}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                style={INPUT_STYLE}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1.5">{t("auth.password")}</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={INPUT_STYLE}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={loading ? BTN_DISABLED_STYLE : BTN_STYLE}
              onMouseEnter={e => { if (!loading) e.target.style.boxShadow = "0 6px 20px rgba(99,102,241,0.55)"; }}
              onMouseLeave={e => { if (!loading) e.target.style.boxShadow = "0 4px 16px rgba(99,102,241,0.4)"; }}
            >
              {loading
                ? t("auth.pleaseWait")
                : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
            </button>

            {mode === "login" && (
              <Link
                to="/forgot-password"
                className="block text-center text-sm transition-colors"
                style={{ color: "#94a3b8" }}
                onMouseEnter={e => e.target.style.color = "#6366f1"}
                onMouseLeave={e => e.target.style.color = "#94a3b8"}
              >
                {t("auth.forgotPassword")}
              </Link>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
