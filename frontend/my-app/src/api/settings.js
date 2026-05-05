import client from "./client";

export const getSettings = () => client.get("/api/settings").then((r) => r.data);
export const updateSettings = (data) => client.patch("/api/settings", data).then((r) => r.data);
