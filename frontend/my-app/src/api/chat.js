import client from "./client";

export const sendMessage = (message, session_id = null) =>
  client.post("/api/chat", { message, session_id }).then((r) => r.data);

export const getSessions = () =>
  client.get("/api/chat/sessions").then((r) => r.data);

export const getSession = (id) =>
  client.get(`/api/chat/sessions/${id}`).then((r) => r.data);

export const deleteSession = (id) =>
  client.delete(`/api/chat/sessions/${id}`);
