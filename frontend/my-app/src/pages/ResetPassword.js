import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [form, setForm] = useState({ new_password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword(token, form.new_password);
      setDone(true);
      setTimeout(() => navigate("/signin"), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Gov<span className="text-indigo-400">MCP</span></h1>
          <p className="text-gray-400 mt-2 text-sm">Macedonian Digital Government Services</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h2 className="text-white font-semibold text-lg mb-1">Set a new password</h2>
          <p className="text-gray-400 text-sm mb-6">
            Choose a strong password for your account.
          </p>

          {!token && (
            <div className="bg-red-950 border border-red-900 rounded-lg px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">Invalid reset link. Please request a new one.</p>
            </div>
          )}

          {done ? (
            <div className="space-y-4">
              <div className="bg-green-950 border border-green-800 rounded-lg px-4 py-3">
                <p className="text-green-400 text-sm">
                  Password updated! Redirecting to Sign In…
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">New password</label>
                <input
                  type="password"
                  required
                  disabled={!token}
                  value={form.new_password}
                  onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm new password</label>
                <input
                  type="password"
                  required
                  disabled={!token}
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-950 border border-red-900 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>

              <Link
                to="/signin"
                className="block text-center text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                ← Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
