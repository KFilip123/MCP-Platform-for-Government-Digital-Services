import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { getSessions, renameSession, deleteSession } from "../../api/chat";

const SIDEBAR_STYLE = {
  background: "#ffffff",
  borderRight: "1px solid rgba(99,102,241,0.12)",
  boxShadow: "2px 0 12px rgba(99,102,241,0.06)",
};

function DashboardIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function AssistantIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
}
function ServicesIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
}
function ActivityIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function ChatsIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>;
}
function SettingsIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export default function Sidebar({ onClose }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [search] = useState("");

  const links = [
    { to: "/dashboard",  label: t("nav.dashboard"),  Icon: DashboardIcon },
    { to: "/assistant",  label: t("nav.assistant"),   Icon: AssistantIcon },
    { to: "/chats",      label: t("nav.chats"),       Icon: ChatsIcon },
    { to: "/services",   label: t("nav.services"),    Icon: ServicesIcon },
    { to: "/activity",   label: t("nav.activity"),    Icon: ActivityIcon },
    { to: "/settings",   label: t("nav.settings"),    Icon: SettingsIcon },
  ];

  const fetchSessions = () => getSessions().then(setSessions).catch(() => {});

  useEffect(() => {
    fetchSessions();
    window.addEventListener("chat:session-created", fetchSessions);
    return () => window.removeEventListener("chat:session-created", fetchSessions);
  }, []);

  const handleRename = (id, newTitle) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title: newTitle } : s));
  };

  const handleDelete = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const filtered = search.trim()
    ? sessions.filter((s) =>
        (s.title || "Untitled").toLowerCase().includes(search.trim().toLowerCase())
      )
    : sessions;

  return (
    <aside className="w-80 h-full flex flex-col" style={SIDEBAR_STYLE}>

      {/* Header */}
      <div className="px-5 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 2px 10px rgba(99,102,241,0.4)" }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight leading-none" style={{ color: "#1e293b" }}>
              Gov<span style={{ color: "#6366f1" }}>MCP</span>
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Digital Services</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: "#94a3b8" }}
          aria-label="Close menu"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 space-y-1">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={({ isActive }) => isActive ? {
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            } : {
              color: "#64748b",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains("active"))
                e.currentTarget.style.background = "rgba(99,102,241,0.07)";
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.classList.contains("active"))
                e.currentTarget.style.background = "transparent";
            }}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? "#fff" : "#6366f1" }}>
                  <Icon />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Recent chats */}
      {sessions.length > 0 && (
        <div className="px-3 py-2 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6366f1" }}>
              {t("sidebar.recentChats")}
            </p>
            <div style={{ height: "1px", flex: 1, margin: "0 8px", background: "rgba(99,102,241,0.2)" }} />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filtered.slice(0, 20).map((s) => (
              <ChatItem key={s.id} session={s} onRename={handleRename} onDelete={handleDelete} t={t} />
            ))}
            {filtered.length === 0 && (
              <p className="text-xs px-2 py-1" style={{ color: "#94a3b8" }}>{t("sidebar.noMatches")}</p>
            )}
          </div>
        </div>
      )}

      {/* User + sign out */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(99,102,241,0.1)" }}>
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2 mb-1 rounded-xl transition-all text-left"
          onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.07)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#1e293b" }}>{user?.full_name || "User"}</p>
            <p className="text-xs truncate" style={{ color: "#94a3b8" }}>{user?.email}</p>
          </div>
        </button>
        <button
          onClick={logout}
          className="w-full text-center px-3 py-2 text-sm rounded-xl font-medium transition-all"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#ffffff", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(99,102,241,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,0.3)"; }}
        >
          {t("sidebar.signOut")}
        </button>
      </div>
    </aside>
  );
}

function ChatItem({ session, onRename, onDelete, t }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.title || "Untitled");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const commit = async () => {
    setEditing(false);
    if (value.trim() && value.trim() !== session.title) {
      await renameSession(session.id, value.trim());
      onRename(session.id, value.trim());
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    await deleteSession(session.id);
    onDelete(session.id);
  };

  return (
    <div className="group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
      onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 text-xs px-1.5 py-0.5 rounded outline-none min-w-0"
          style={{ background: "#f5f7ff", border: "1px solid rgba(99,102,241,0.3)", color: "#1e293b" }}
        />
      ) : (
        <span
          onClick={() => navigate(`/assistant?session=${session.id}`)}
          className="flex-1 text-xs truncate"
          style={{ color: "#64748b" }}
        >
          {value}
        </span>
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          className="opacity-0 group-hover:opacity-100 text-xs px-1 transition-opacity leading-none"
          style={{ color: "#94a3b8" }}
        >
          ···
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-5 z-50 rounded-xl shadow-lg py-1 min-w-[110px]"
            style={{ background: "#ffffff", border: "1px solid rgba(99,102,241,0.15)", boxShadow: "0 8px 24px rgba(99,102,241,0.15)" }}>
            <button
              onClick={() => { setMenuOpen(false); setEditing(true); }}
              className="w-full text-left px-3 py-1.5 text-xs transition-colors"
              style={{ color: "#475569" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {t("sidebar.rename")}
            </button>
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-1.5 text-xs transition-colors"
              style={{ color: "#ef4444" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {t("sidebar.delete")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
