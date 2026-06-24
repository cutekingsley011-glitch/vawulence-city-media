export interface StoredUser {
  id: string;
  name: string;
  email: string;
}

const KEY = "vcm_user";

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(KEY);
}
