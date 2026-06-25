import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

const VISIT_KEY = "vcm_visit_count";
const DISMISSED_KEY = "vcm_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Increment visit count
    const count = Number(localStorage.getItem(VISIT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_KEY, String(count));

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    if (count < 2) return;

    // iOS detection — Safari doesn't fire beforeinstallprompt
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    if (ios && !standalone) {
      setIsIos(true);
      setShowBanner(true);
      return;
    }

    // Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowBanner(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:w-80 z-50 bg-primary text-white rounded-2xl shadow-2xl p-4 flex gap-3 items-start">
      <img src="/vcm-icon.png" alt="VCM" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">Add VCM to your Home Screen</p>
        <p className="text-xs text-blue-100 mt-1 leading-snug">
          {isIos
            ? 'Tap the Share button in Safari, then "Add to Home Screen" for quick access!'
            : "One tap for breaking gists, news & drama — any time!"}
        </p>
        {!isIos && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2 h-7 text-xs gap-1 bg-white text-primary hover:bg-blue-50"
            onClick={install}
          >
            <Download className="w-3 h-3" />
            Install App
          </Button>
        )}
      </div>
      <button onClick={dismiss} className="text-blue-200 hover:text-white shrink-0 mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
