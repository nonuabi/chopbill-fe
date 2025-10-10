const normalizeToken = (raw?: string | null) => {
  const t = (raw ?? "").trim().replace(/^"|"$/g, "");
  return t.toLowerCase().startsWith("bearer ")
    ? t.split(" ").slice(1).join(" ")
    : t;
};

export const buildAuthHeader = (token?: string | null) => {
  const b = normalizeToken(token);
  return b ? `Bearer ${b}` : "";
};
