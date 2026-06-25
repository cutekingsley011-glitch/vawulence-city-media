import { useState, useEffect } from "react";
import { getStoredUser } from "@/lib/user";

const PUSH_PROMPTED_KEY = "vcm_push_prompted";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const user = getStoredUser();
    if (!user) return;

    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return;

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, subscription: sub.toJSON() }),
      });
      setSubscribed(true);
    } catch {
      // Subscription failed silently
    }
  }

  async function unsubscribe() {
    const user = getStoredUser();
    if (!user) return;
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    setSubscribed(false);
  }

  return { permission, subscribed, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
