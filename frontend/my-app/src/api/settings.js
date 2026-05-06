import client from "./client";

export const getSettings = () => client.get("/api/settings").then((r) => r.data);
export const updateSettings = (data) => client.patch("/api/settings", data).then((r) => r.data);

export const changeEmail = (current_password, new_email) =>
  client.patch("/api/settings/email", { current_password, new_email }).then((r) => r.data);

export const changePassword = (current_password, new_password) =>
  client.patch("/api/settings/password", { current_password, new_password }).then((r) => r.data);

export const deleteAccount = (current_password) =>
  client.delete("/api/settings/account", { data: { current_password } });
