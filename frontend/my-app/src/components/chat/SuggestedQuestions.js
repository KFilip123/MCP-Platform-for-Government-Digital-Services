import { useTranslation } from "react-i18next";

export default function SuggestedQuestions({ onSelect }) {
  const { t } = useTranslation();

  const SUGGESTIONS = [
    t("assistant.suggestions.passport"),
    t("assistant.suggestions.idCard"),
    t("assistant.suggestions.doctors"),
    t("assistant.suggestions.driverLicense"),
    t("assistant.suggestions.vehicle"),
    t("assistant.suggestions.citizenship"),
  ];

  return (
    <div className="grid grid-cols-3 gap-2" style={{ maxWidth: "720px" }}>
      {SUGGESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="px-3 text-xs rounded-xl transition-all text-center flex items-center justify-center"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#6366f1",
            boxShadow: "0 1px 4px rgba(99,102,241,0.07)",
            lineHeight: "1.5",
            minHeight: "80px",
            padding: "14px 12px",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.07)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"; }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
