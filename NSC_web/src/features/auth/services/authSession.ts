import type { AuthUser } from "../types/auth.types";

const AUTH_SESSION_STORAGE_KEY = "nsc-web-auth-session";

export type AuthSession = {
  user: AuthUser;
  accessCode: string;
  role: AuthUser["role"];
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function saveAuthSession(user: AuthUser) {
  if (!canUseSessionStorage()) {
    return;
  }

  const session: AuthSession = {
    user,
    accessCode: user.accessCode,
    role: user.role,
  };

  window.sessionStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

export function getAuthSession(): AuthSession | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawSession = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;

    if (!session.user?.id || !session.accessCode || !session.role) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
