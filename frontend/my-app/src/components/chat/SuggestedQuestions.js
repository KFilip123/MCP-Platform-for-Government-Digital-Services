const SUGGESTIONS = [
  "What documents do I need to renew my passport?",
  "How do I get a first-time ID card?",
  "Find available doctors in Skopje",
  "What are the requirements for a driver's license?",
  "How do I register a new vehicle?",
  "What is needed for citizenship naturalization?",
];

export default function SuggestedQuestions({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {SUGGESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs rounded-lg transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
