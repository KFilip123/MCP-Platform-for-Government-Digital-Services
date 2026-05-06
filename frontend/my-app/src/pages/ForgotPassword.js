import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      setSent(true);
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
          <h2 className="text-white font-semibold text-lg mb-1">Forgot your password?</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div className="space-y-4">
              <div className="bg-green-950 border border-green-800 rounded-lg px-4 py-3">
                <p className="text-green-400 text-sm">
                  If that email is registered, a reset link has been sent. Check your inbox.
                </p>
              </div>
              <Link
                to="/signin"
                className="block text-center text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-950 border border-red-900 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? "Sending…" : "Send Reset Link"}
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
