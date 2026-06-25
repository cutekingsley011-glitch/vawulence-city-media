const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const PAYSTACK_SUBACCOUNT = process.env.PAYSTACK_SUBACCOUNT_CODE ?? "";
const SERVICE_FEE_KOBO = 50000; // ₦500

const BASE = "https://api.paystack.co";

async function paystackFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  return res.json() as Promise<{ status: boolean; data: unknown; message: string }>;
}

export interface InitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/** Initialize a Paystack transaction with subaccount split */
export async function initializeTransaction(opts: {
  email: string;
  amountKobo: number; // total amount including service fee
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}): Promise<InitResult> {
  const body: Record<string, unknown> = {
    email: opts.email,
    amount: opts.amountKobo,
    reference: opts.reference,
    metadata: opts.metadata ?? {},
  };

  if (PAYSTACK_SUBACCOUNT && PAYSTACK_SUBACCOUNT !== "ACCT_placeholder") {
    // Split: ₦500 service fee goes to platform subaccount, rest to main account
    body.split = {
      type: "flat",
      bearer_type: "subaccount",
      bearer_subaccount: PAYSTACK_SUBACCOUNT,
      subaccounts: [
        { subaccount: PAYSTACK_SUBACCOUNT, share: SERVICE_FEE_KOBO },
      ],
    };
  }

  if (opts.callbackUrl) body.callback_url = opts.callbackUrl;

  const data = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const d = data.data as { authorization_url: string; access_code: string; reference: string };
  return {
    authorizationUrl: d.authorization_url,
    accessCode: d.access_code,
    reference: d.reference,
  };
}

/** Verify a transaction by reference */
export async function verifyTransaction(reference: string): Promise<{
  success: boolean;
  amount: number;
  email: string;
  metadata: Record<string, unknown>;
  paidAt: string;
}> {
  const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  const d = data.data as {
    status: string;
    amount: number;
    customer: { email: string };
    metadata: Record<string, unknown>;
    paid_at: string;
  };
  return {
    success: data.status && d.status === "success",
    amount: d.amount,
    email: d.customer?.email ?? "",
    metadata: d.metadata ?? {},
    paidAt: d.paid_at ?? "",
  };
}

/** Refund a transaction (partial or full) */
export async function refundTransaction(reference: string, amountKobo?: number): Promise<boolean> {
  const body: Record<string, unknown> = { transaction: reference };
  if (amountKobo) body.amount = amountKobo;
  const data = await paystackFetch("/refund", { method: "POST", body: JSON.stringify(body) });
  return data.status === true;
}

export const SERVICE_FEE = SERVICE_FEE_KOBO;
export function totalWithFee(baseKobo: number) {
  return baseKobo + SERVICE_FEE_KOBO;
}
export function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}
