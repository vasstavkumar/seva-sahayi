// imported by proxy.ts too - no node/db imports

// __Host- prefix in prod (https only, no Domain, path=/)
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-seva_session" : "seva_session";

export const SESSION_MAX_HOURS = 10;
export const SESSION_IDLE_MINUTES = 60;
