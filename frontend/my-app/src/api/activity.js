import client from "./client";

export const getActivity = (params = {}) =>
  client.get("/api/activity", { params }).then((r) => r.data);
