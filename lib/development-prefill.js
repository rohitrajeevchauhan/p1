export function getDevelopmentPrefill({ nodeEnv, enabled, email, password }) {
  if (nodeEnv !== "development" || enabled !== "true") {
    return { identifier: "", password: "" };
  }
  return {
    identifier: email || "",
    password: password || "",
  };
}

export function readServerEnvironment(name) {
  return Reflect.get(process.env, name);
}
