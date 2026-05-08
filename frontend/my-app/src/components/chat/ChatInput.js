import { useState, useRef } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) handleSubmit(e);
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  return (
    <div style={{ background: "#f0f4ff", borderTop: "1px solid rgba(99,102,241,0.15)" }}>
    <div className="px-4 pb-5 pt-3">
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-2xl px-4 py-3"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(99,102,241,0.18)",
          boxShadow: "0 4px 20px rgba(99,102,241,0.12)",
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Прашајте за државни услуги…"
          className="flex-1 resize-none text-sm outline-none disabled:opacity-50"
          style={{
            background: "transparent",
            color: "#1e293b",
            lineHeight: "1.5",
          }}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all flex-shrink-0 disabled:cursor-not-allowed"
          style={{
            background: value.trim() && !disabled ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(99,102,241,0.15)",
            boxShadow: value.trim() && !disabled ? "0 2px 10px rgba(99,102,241,0.4)" : "none",
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.55)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = value.trim() && !disabled ? "0 2px 10px rgba(99,102,241,0.4)" : "none"; }}
        >
          {disabled ? (
            <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
              style={{ color: value.trim() ? "#ffffff" : "#6366f1" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          )}
        </button>
      </form>
    </div>
    </div>
  );
}
