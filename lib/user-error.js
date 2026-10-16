export function userError(error, fallback, messages = {}) {
  const fields = error?.details?.fields;
  if (fields && typeof fields === "object") {
    const detail = Object.entries(fields)
      .map(([field, value]) => messages.fields?.[field] || value)
      .filter(Boolean)
      .join(" ");
    if (detail) return detail;
  }
  if (error?.code && messages[error.code]) return messages[error.code];
  if (error?.status && messages.status?.[error.status])
    return messages.status[error.status];
  if (error?.status >= 400 && error?.status < 500 && error?.message) {
    return error.message;
  }
  return fallback;
}
