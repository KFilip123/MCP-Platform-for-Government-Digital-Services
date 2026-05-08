import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessions, deleteSession, renameSession } from "../api/chat";

const CARD_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(99,102,241,0.12)",
  boxShadow: "0 2px 12px rgba(99,102,241,0.07)",
};

function ChatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

export default function Chats() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? sessions.filter((s) =>
        (s.title || "Без наслов").toLowerCase().includes(search.trim().toLowerCase())
      )
    : sessions;

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const startEdit = (e, s) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditValue(s.title || "Без наслов");
  };

  const commitEdit = async (id) => {
    if (editValue.trim()) {
      await renameSession(id, editValue.trim());
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: editValue.trim() } : s))
      );
    }
    setEditingId(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: "#1e293b" }}>Разговори</h2>
        <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>Сите ваши разговори со AI Асистентот</p>
      </div>

      {/* Search + New chat */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пребарај разговори..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "#1e293b",
              boxShadow: "0 2px 8px rgba(99,102,241,0.06)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(99,102,241,0.5)";
              e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(99,102,241,0.2)";
              e.target.style.boxShadow = "0 2px 8px rgba(99,102,241,0.06)";
            }}
          />
        </div>
        <button
          onClick={() => navigate("/assistant")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 2px 10px rgba(99,102,241,0.35)" }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Нов разговор
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl h-36 animate-pulse" style={{ background: "rgba(99,102,241,0.06)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={CARD_STYLE}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>
            <ChatIcon />
          </div>
          <p className="font-medium text-sm" style={{ color: "#1e293b" }}>
            {search ? "Нема резултати" : "Нема разговори"}
          </p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            {search ? "Обидете се со друг термин за пребарување" : "Започнете нов разговор со AI Асистентот"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/assistant?session=${s.id}`)}
              className="rounded-2xl p-5 cursor-pointer transition-all duration-200 group"
              style={CARD_STYLE}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.18)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(99,102,241,0.07)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.12)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Icon + actions */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>
                  <ChatIcon />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => startEdit(e, s)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "#94a3b8" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.08)"; e.currentTarget.style.color = "#6366f1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "#94a3b8" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              {/* Title */}
              {editingId === s.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => commitEdit(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(s.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full text-sm font-semibold px-2 py-1 rounded-lg outline-none"
                  style={{ background: "#f5f7ff", border: "1px solid rgba(99,102,241,0.3)", color: "#1e293b" }}
                />
              ) : (
                <p className="font-semibold text-sm truncate" style={{ color: "#1e293b" }}>
                  {s.title || "Без наслов"}
                </p>
              )}

              {/* Date */}
              <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>
                {new Date(s.created_at).toLocaleDateString("mk-MK", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
