import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../api/settings";

export default function Settings() {
  const [form, setForm] = useState({ full_name: "", language: "en", notifications: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    getSettings().then((d) => {
      setForm({ full_name: d.full_name || "", language: d.language, notifications: d.notifications });
      setEmail(d.email);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateSettings(form).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-400 mt-1">Manage your profile and preferences.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Language</label>
              <div className="flex gap-3">
                {[{ value: "en", label: "English" }, { value: "mk", label: "Македонски" }].map(({ value, label }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setForm((f) => ({ ...f, language: value }))}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.language === value
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-white">Notifications</p>
                <p className="text-xs text-gray-500">Receive updates about your requests</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, notifications: !f.notifications }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  form.notifications ? "bg-indigo-600" : "bg-gray-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    form.notifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
