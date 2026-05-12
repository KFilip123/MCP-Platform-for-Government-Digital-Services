import { useEffect, useState } from "react";
import { getActivity } from "../api/activity";

const STATUSES = ["all", "completed", "pending", "failed"];

function Badge({ status }) {
  const colors = {
    completed: "text-green-400 bg-green-950 border-green-900",
    pending: "text-yellow-400 bg-yellow-950 border-yellow-900",
    failed: "text-red-400 bg-red-950 border-red-900",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

export default function Activity() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  useEffect(() => {
    const params = { page, limit };
    if (status !== "all") params.status = status;
    getActivity(params).then(setData).catch(() => {});
  }, [status, page]);

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Activity History</h2>
        <p className="text-gray-400 mt-1">All your interactions with government services.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              status === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 self-center">{data.total} total</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {data.items.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500 text-sm">
            No activity found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Service</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Action</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Description</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                  <td className="px-6 py-3 text-sm text-white font-medium capitalize">{a.service}</td>
                  <td className="px-6 py-3 text-sm text-gray-400 font-mono text-xs">{a.action}</td>
                  <td className="px-6 py-3"><Badge status={a.status} /></td>
                  <td className="px-6 py-3 text-xs text-gray-500 max-w-xs truncate">{a.description || "—"}</td>
                  <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg disabled:opacity-40 hover:text-white hover:border-gray-600 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg disabled:opacity-40 hover:text-white hover:border-gray-600 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
