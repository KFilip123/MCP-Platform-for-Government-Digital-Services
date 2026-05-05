import { useState, useCallback } from "react";
import { sendMessage } from "../api/chat";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(
    async (text) => {
      setLoading(true);
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      try {
        const { reply, session_id } = await sendMessage(text, sessionId);
        setSessionId(session_id);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch {
        setError("Failed to get a response. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  return { messages, loading, error, send, reset };
}
