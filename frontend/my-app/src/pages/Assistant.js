import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "../hooks/useChat";
import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";
import SuggestedQuestions from "../components/chat/SuggestedQuestions";

export default function Assistant() {
  const { messages, loading, error, send, reset } = useChat();
  const bottomRef = useRef(null);
  const location = useLocation();

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Support pre-filled message from Dashboard quick actions
  useEffect(() => {
    const initial = location.state?.initialMessage;
    if (initial) {
      send(initial);
      window.history.replaceState({}, "");
    }
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
        <div>
          <h2 className="text-white font-semibold">AI Assistant</h2>
          <p className="text-gray-500 text-xs">Powered by Gemini 2.0 Flash · Macedonian Government Services</p>
        </div>
        {!isEmpty && (
          <button
            onClick={reset}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6">
            <div>
              <div className="text-4xl mb-3">🏛️</div>
              <h3 className="text-white text-lg font-semibold mb-2">How can I help you today?</h3>
              <p className="text-gray-400 text-sm max-w-md">
                Ask me anything about Macedonian government services — passport renewal, medical appointments, vehicle registration, and more.
              </p>
            </div>
            <SuggestedQuestions onSelect={send} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5">AI</div>
                <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            {error && <p className="text-red-400 text-sm text-center my-2">{error}</p>}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="max-w-3xl w-full mx-auto">
        <ChatInput onSend={send} disabled={loading} />
      </div>
    </div>
  );
}
