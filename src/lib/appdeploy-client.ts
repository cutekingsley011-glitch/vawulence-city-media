import axios from 'axios';

// Base Axios instance matching original @appdeploy/client behavior
export const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject VCM member token if available
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('vcm_member_session');
    if (raw) {
      const member = JSON.parse(raw);
      if (member?.memberToken) {
        if (config.headers && typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('Authorization', `Bearer ${member.memberToken}`);
        } else if (config.headers) {
          (config.headers as any)['Authorization'] = `Bearer ${member.memberToken}`;
        }

        // If data is an object, also ensure memberToken is present if not already set
        if (config.data && typeof config.data === 'object' && !Array.isArray(config.data)) {
          if (!config.data.memberToken) {
            config.data.memberToken = member.memberToken;
          }
        }
      }
    }
  } catch {}
  return config;
});

export const auth = {
  getUser: async () => {
    try {
      const raw = localStorage.getItem('vcm_member_session');
      if (!raw) return null;
      const member = JSON.parse(raw);
      if (!member?.username) return null;
      return {
        userId: member.id || member.username,
        name: member.username,
        email: member.email || `${member.username}@vcm.local`,
      };
    } catch {
      return null;
    }
  },

  signIn: async () => {
    return new Promise<{ user: { userId: string; name: string; email: string } }>((resolve, reject) => {
      const handler = (event: any) => {
        const ok = event.detail;
        if (ok) {
          auth.getUser().then((u) => {
            if (u) resolve({ user: u });
            else reject(new Error('Sign in incomplete.'));
          });
        } else {
          reject({ code: 'popup_closed', message: 'Sign-in cancelled.' });
        }
      };
      window.dispatchEvent(new CustomEvent('vcm:open-join', {
        detail: {
          resolve: (ok: boolean) => handler({ detail: ok })
        }
      }));
    });
  },

  signOut: async () => {
    try {
      localStorage.removeItem('vcm_member_session');
      window.dispatchEvent(new CustomEvent('vcm:member-changed'));
    } catch {}
  },

  isSignedIn: () => {
    try {
      const raw = localStorage.getItem('vcm_member_session');
      return Boolean(raw && JSON.parse(raw)?.username);
    } catch {
      return false;
    }
  },
};

export const notifications = {
  getEnvironment: async () => {
    const hasNotification = typeof window !== 'undefined' && 'Notification' in window;
    return {
      permission: hasNotification ? window.Notification.permission : 'denied',
      isSupported: hasNotification,
      platform: 'web',
    };
  },

  subscribe: async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }
      return { ok: true, permission };
    }
    return { ok: true, simulated: true };
  },

  unsubscribe: async (_options?: { showUi?: boolean }) => {
    return { ok: true };
  },
};

export default { api, auth, notifications };
