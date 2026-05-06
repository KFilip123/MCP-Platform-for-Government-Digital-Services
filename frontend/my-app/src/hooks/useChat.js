import { useState, useCallback } from "react";
import { sendMessage, getSession } from "../api/chat";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessionTitle, setSessionTitle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(
    async (text) => {
      setLoading(true);
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      try {
        const { reply, session_id } = await sendMessage(text, sessionId);
        if (!sessionId) window.dispatchEvent(new Event("chat:session-created"));
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

  const loadSession = useCallback(async (id) => {
    try {
      const session = await getSession(id);
      setSessionId(session.id);
      setSessionTitle(session.title);
      setMessages(session.messages.map((m) => ({ role: m.role, content: m.content })));
      setError(null);
    } catch {
      setError("Failed to load session.");
    }
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setSessionTitle(null);
    setError(null);
  }, []);

  return { messages, loading, error, send, reset, loadSession, sessionId, sessionTitle, setSessionTitle };
}
