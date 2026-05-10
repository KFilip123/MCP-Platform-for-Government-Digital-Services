import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { changeEmail, changePassword, deleteAccount } from "../../api/settings";

const inputCls =
  "w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-colors placeholder-gray-500";

function Section({ title, children }) {
  return (
    <div className="border-t border-gray-800 pt-4 mt-4 space-y-3">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function StatusMsg({ status }) {
  if (!status) return null;
  const isError = status.type === "error";
  return (
    <p className={`text-xs ${isError ? "text-red-400" : "text-green-400"}`}>{status.msg}</p>
  );
}

export default function ProfileModal({ onClose }) {
  const { user, logout } = useAuth();
  const ref = useRef(null);

  // email form
  const [emailForm, setEmailForm] = useState({ current_password: "", new_email: "" });
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // password form
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  // delete
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      await changeEmail(emailForm.current_password, emailForm.new_email);
      setEmailStatus({ type: "ok", msg: "Email updated. Please log in again." });
      setEmailForm({ current_password: "", new_email: "" });
      setTimeout(() => { logout(); }, 1500);
    } catch (err) {
      setEmailStatus({ type: "error", msg: err?.response?.data?.detail || "Failed to update email." });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setPwStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }
    setPwLoading(true);
    setPwStatus(null);
    try {
      await changePassword(pwForm.current_password, pwForm.new_password);
      setPwStatus({ type: "ok", msg: "Password updated successfully." });
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwStatus({ type: "error", msg: err?.response?.data?.detail || "Failed to update password." });
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteStatus(null);
    try {
      await deleteAccount(deletePassword);
      logout();
    } catch (err) {
      setDeleteStatus({ type: "error", msg: err?.response?.data?.detail || "Failed to delete account." });
      setDeleteLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h3 className="text-white font-semibold">Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-1">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{user?.full_name || "—"}</p>
              <p className="text-gray-400 text-sm truncate">{user?.email}</p>
            </div>
          </div>

          {/* Change email */}
          <Section title="Change Email">
            <form onSubmit={handleEmailSubmit} className="space-y-2">
              <input
                required
                type="password"
                placeholder="Current password"
                value={emailForm.current_password}
                onChange={(e) => setEmailForm((f) => ({ ...f, current_password: e.target.value }))}
                className={inputCls}
              />
              <input
                required
                type="email"
                placeholder="New email address"
                value={emailForm.new_email}
                onChange={(e) => setEmailForm((f) => ({ ...f, new_email: e.target.value }))}
                className={inputCls}
              />
              <StatusMsg status={emailStatus} />
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {emailLoading ? "Updating..." : "Update Email"}
              </button>
            </form>
          </Section>

          {/* Change password */}
          <Section title="Change Password">
            <form onSubmit={handlePasswordSubmit} className="space-y-2">
              <input
                required
                type="password"
                placeholder="Current password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                className={inputCls}
              />
              <input
                required
                type="password"
                placeholder="New password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                className={inputCls}
              />
              <input
                required
                type="password"
                placeholder="Confirm new password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                className={inputCls}
              />
              <StatusMsg status={pwStatus} />
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </Section>

          {/* Delete account */}
          <Section title="Delete Account">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full border border-red-800 text-red-400 hover:bg-red-900/20 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Delete my account
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 text-xs">
                  This will permanently delete your account and all data. Enter your password to confirm.
                </p>
                <input
                  type="password"
                  placeholder="Your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className={inputCls}
                />
                <StatusMsg status={deleteStatus} />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirmDelete(false); setDeletePassword(""); setDeleteStatus(null); }}
                    className="flex-1 border border-gray-700 text-gray-400 hover:text-white text-sm py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword}
                    className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
