import client from "./client";

export const getInstitutions = () =>
  client.get("/api/services/institutions").then((r) => r.data);

export const connectInstitution = (slug) =>
  client.post(`/api/services/institutions/${slug}/connect`).then((r) => r.data);

export const disconnectInstitution = (slug) =>
  client.post(`/api/services/institutions/${slug}/disconnect`).then((r) => r.data);

export const sendMojterminContact = (name, email, message) =>
  client.post("/api/services/mojtermin/contact", { name, email, message }).then((r) => r.data);

export const sendCrmContact = (name, email, topic, subject, message) =>
  client.post("/api/services/crm/contact", { name, email, topic, subject, message }).then((r) => r.data);

export const fetchUslugiCaptcha = () =>
  client.get("/api/services/uslugi/captcha", { responseType: "blob" }).then((r) => ({
    blob: r.data,
    token: r.headers["x-captcha-token"],
  }));

export const sendUslugiContact = (payload) =>
  client.post("/api/services/uslugi/contact", payload).then((r) => r.data);
