declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        metadata?: Record<string, unknown>;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "";
export const SERVICE_FEE = 500; // ₦500 flat fee
export const SERVICE_FEE_KOBO = 50000;

export function totalNaira(baseNaira: number) {
  return baseNaira + SERVICE_FEE;
}

export function kobiToNaira(kobo: number) {
  return kobo / 100;
}

export function nairaToKobo(naira: number) {
  return naira * 100;
}

export function formatNaira(naira: number) {
  return `₦${naira.toLocaleString("en-NG")}`;
}

export function generateReference(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

let scriptLoaded = false;

export function loadPaystackScript(): Promise<void> {
  if (scriptLoaded || window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function openPaystackCheckout(opts: {
  email: string;
  amountNaira: number;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}) {
  await loadPaystackScript();
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY || "pk_test_placeholder",
    email: opts.email,
    amount: opts.amountNaira * 100,
    ref: opts.reference,
    metadata: opts.metadata ?? {},
    callback: (response) => opts.onSuccess(response.reference),
    onClose: opts.onClose,
  });
  handler.openIframe();
}
