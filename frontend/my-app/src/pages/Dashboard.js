import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getActivity } from "../api/activity";

const QUICK_ACTIONS = [
  { label: "Book Appointment", desc: "Schedule a medical appointment", icon: "📅", path: "/assistant", q: "I want to book a medical appointment" },
  { label: "Check Documents", desc: "Passport, ID, driving license", icon: "📄", path: "/services", q: null },
  { label: "Submit Request", desc: "Start a government procedure", icon: "📨", path: "/assistant", q: "What services can I apply for?" },
  { label: "Check Tax Status", desc: "View your tax obligations", icon: "💰", path: "/assistant", q: "Tell me about tax-related services" },
];

function Badge({ status }) {
  const colors = {
    completed: "text-green-400 bg-green-950 border-green-900",
    pending: "text-yellow-400 bg-yellow-950 border-yellow-900",
    failed: "text-red-400 bg-red-950 border-red-900",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    getActivity({ limit: 5 }).then((d) => setActivity(d.items)).catch(() => {});
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">{greeting()}, {user?.full_name || user?.email?.split("@")[0]} 👋</h2>
        <p className="text-gray-400 mt-1">Here's what you can do today.</p>
      </div>

      {/* Quick Actions */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(({ label, desc, icon, path, q }) => (
            <button
              key={label}
              onClick={() => navigate(path, q ? { state: { initialMessage: q } } : {})}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left hover:border-indigo-500 hover:bg-gray-800 transition-all group"
            >
              <div className="text-2xl mb-3">{icon}</div>
              <p className="text-white font-medium text-sm group-hover:text-indigo-400 transition-colors">{label}</p>
              <p className="text-gray-500 text-xs mt-1">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Activity</h3>
          <button onClick={() => navigate("/activity")} className="text-indigo-400 text-sm hover:text-indigo-300">View all</button>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {activity.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500 text-sm">
              No activity yet. Start by asking the AI Assistant!
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Service</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Action</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Status</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="px-6 py-3 text-sm text-gray-300 font-medium capitalize">{a.service}</td>
                    <td className="px-6 py-3 text-sm text-gray-400">{a.action.replace(/__/g, " › ").replace(/_/g, " ")}</td>
                    <td className="px-6 py-3"><Badge status={a.status} /></td>
                    <td className="px-6 py-3 text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
