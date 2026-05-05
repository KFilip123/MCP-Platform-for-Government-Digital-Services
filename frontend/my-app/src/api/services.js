import client from "./client";

export const getServices = () => client.get("/api/services").then((r) => r.data);
