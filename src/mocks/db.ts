import type { User, Webhook } from "../api/types";

export const TEST_CREDENTIALS = {
  email: "demo@example.com",
  password: "demo-webhooks-2026",
};

export const USER: User = {
  id: 1,
  email: TEST_CREDENTIALS.email,
  first_name: "Demo",
  last_name: "User",
  name: "Demo User",
};

export const CSRF_TOKEN = "mock-csrf-token";
export const SESSION_TTL_MS = 30_000;

const WEBHOOK_NAMES = [
  "Order created",
  "Order paid",
  "Order shipped",
  "Order refunded",
  "Subscriber added",
  "Subscriber unsubscribed",
  "Campaign sent",
  "Campaign opened",
  "Link clicked",
  "Message delivered",
  "Message failed",
  "Chatbot started",
  "Chatbot completed",
  "Payment succeeded",
  "Payment failed",
  "Invoice issued",
  "Lead captured",
  "Tag assigned",
  "Tag removed",
  "Form submitted",
  "CRM sync",
  "Telegram inbound",
  "Viber inbound",
  "WhatsApp inbound",
  "Instagram direct",
  "Abandoned cart",
  "Daily report",
  "Contact updated",
];

function seedWebhooks(): Webhook[] {
  const base = Date.UTC(2026, 8, 1);
  return WEBHOOK_NAMES.map((name, index) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    return {
      id: index + 1,
      name,
      url:
        index % 3 === 0
          ? `https://api.acme-shop.io/webhooks/${slug}`
          : `https://hooks.example.com/${slug}`,
      active: index % 4 !== 3,
      created_at: new Date(base + index * 86_400_000).toISOString(),
    };
  });
}

interface Session {
  fingerprint: string;
  expiresAt: number;
}

interface Db {
  webhooks: Webhook[];
  /** One-time device tokens from /auth/login → fingerprint they were issued for. */
  deviceTokens: Map<string, string>;
  /** Stands in for the HttpOnly session cookie: the client never sees it. */
  session: Session | null;
}

export const db: Db = {
  webhooks: seedWebhooks(),
  deviceTokens: new Map(),
  session: null,
};

export function resetDb() {
  db.webhooks = seedWebhooks();
  db.deviceTokens.clear();
  db.session = null;
}

/** Test helper: makes the current session expire without waiting 30 seconds. */
export function expireSession() {
  if (db.session) db.session.expiresAt = Date.now() - 1;
}
