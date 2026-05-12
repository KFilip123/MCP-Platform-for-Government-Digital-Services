import client from "./client";

export const register = (data) => client.post("/api/auth/register", data).then((r) => r.data);
export const login = (data) => client.post("/api/auth/login", data).then((r) => r.data);
export const getMe = () => client.get("/api/auth/me").then((r) => r.data);
